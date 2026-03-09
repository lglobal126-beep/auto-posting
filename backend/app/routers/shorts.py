import os
import time
import logging
from typing import Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from app.services import database as db
from app.services.llm import generate_shorts_script
from app.services.tts import generate_tts_audio
from app.services.subtitle import generate_ass
from app.services.video_editor import merge_video_with_narration

router = APIRouter()
logger = logging.getLogger("shorts")


class ShortsCreateRequest(BaseModel):
    video_path: str            # Supabase storage path
    restaurant_name: str
    area: str                  # 예: "경기 화성시"
    memo: Optional[str] = None
    video_duration: Optional[int] = None  # 영상 길이 (초)


def _require_user(authorization: Optional[str]) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="인증 토큰이 필요합니다.")
    token = authorization.split(" ", 1)[1]
    user_id = db.get_user_id(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다.")
    return user_id


@router.post("")
async def create_shorts(
    payload: ShortsCreateRequest,
    authorization: Optional[str] = Header(None),
):
    _require_user(authorization)

    llm_api_url = os.getenv("LLM_API_URL", "")
    llm_api_key = os.getenv("LLM_API_KEY", "")
    supabase_client = db.get_supabase()

    target_dur = payload.video_duration or 20

    # 1) 나레이션 스크립트 생성
    script_result = generate_shorts_script(
        llm_api_url=llm_api_url,
        llm_api_key=llm_api_key,
        restaurant_name=payload.restaurant_name,
        area=payload.area,
        user_memo=payload.memo,
        video_duration=payload.video_duration,
    )
    if script_result.get("error"):
        raise HTTPException(status_code=500, detail=f"스크립트 생성 실패: {script_result['error']}")

    script = script_result["script"]
    logger.info("스크립트: %d자 | 내용: %s", len(script), script[:100])

    # 2) Edge TTS 생성 (오디오 + 단어 타이밍)
    try:
        audio_bytes, word_timings = await generate_tts_audio(script)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS 생성 실패: {e}")

    # 3) 오디오 길이 측정 → 배속 계산 + 타이밍 스케일링
    audio_speed = 1.0
    if word_timings:
        audio_dur_ms = word_timings[-1]["end_ms"]
        audio_dur_s = audio_dur_ms / 1000.0
        logger.info("TTS 원본: %.1f초 | 목표: %d초", audio_dur_s, target_dur)

        if audio_dur_s > 0 and abs(audio_dur_s - target_dur) > 0.5:
            # 오디오를 영상 길이에 정확히 맞추기 위한 배속
            audio_speed = audio_dur_s / target_dur
            # 자막 타이밍을 배속에 맞게 스케일링
            scale = target_dur / audio_dur_s
            for w in word_timings:
                w["start_ms"] = int(w["start_ms"] * scale)
                w["end_ms"] = int(w["end_ms"] * scale)
            logger.info("배속 조정: %.2fx | 자막 타이밍 %.2f배 스케일링", audio_speed, scale)
    else:
        logger.warning("단어 타이밍 없음 — 자막 생성 불가")

    # 자막 ASS 생성
    ass_content = generate_ass(word_timings)

    # TTS 오디오를 Supabase에 업로드
    audio_path = f"shorts/{int(time.time())}_narration.mp3"
    try:
        supabase_client.storage.from_("media").upload(
            audio_path,
            audio_bytes,
            file_options={"content-type": "audio/mpeg"},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"오디오 업로드 실패: {e}")

    audio_public_url = supabase_client.storage.from_("media").get_public_url(audio_path)

    # 4) 원본 영상 다운로드
    try:
        video_bytes = supabase_client.storage.from_("media").download(payload.video_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"영상 다운로드 실패: {e}")

    ext = payload.video_path.rsplit(".", 1)[-1].lower() or "mp4"

    # 5) FFmpeg로 영상 + 나레이션 + 자막 병합
    try:
        merged_bytes = merge_video_with_narration(
            video_bytes,
            audio_bytes,
            video_ext=ext,
            ass_content=ass_content,
            audio_speed=audio_speed,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    # 6) 결과 영상 Supabase 업로드
    result_path = f"shorts/{int(time.time())}_result.mp4"
    try:
        supabase_client.storage.from_("media").upload(
            result_path,
            merged_bytes,
            file_options={"content-type": "video/mp4"},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"결과 영상 업로드 실패: {e}")

    result_public_url = supabase_client.storage.from_("media").get_public_url(result_path)

    return {
        "success": True,
        "data": {
            "script": script,
            "audio_url": audio_public_url,
            "result_video_url": result_public_url,
        },
    }
