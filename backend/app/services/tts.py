"""
Edge TTS - Microsoft Neural 음성으로 나레이션 오디오 생성 (무료)
"""
import logging
from typing import List, Tuple

import edge_tts

logger = logging.getLogger("tts")

# Microsoft Edge Neural 한국어 남성 목소리
VOICE = "ko-KR-InJoonNeural"


async def generate_tts_audio(text: str, api_key: str = "") -> Tuple[bytes, List[dict]]:
    """
    Microsoft Edge Neural TTS로 텍스트를 MP3 오디오로 변환합니다.
    Returns: (MP3 bytes, word_timings)
      word_timings: [{"word": str, "start_ms": int, "end_ms": int}, ...]
    """
    try:
        communicate = edge_tts.Communicate(text, VOICE)
        audio_data = b""
        word_timings: List[dict] = []
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_data += chunk["data"]
            elif chunk["type"] == "WordBoundary":
                # offset/duration 단위: 100나노초
                start_ms = chunk["offset"] // 10_000
                end_ms = start_ms + chunk["duration"] // 10_000
                word_timings.append({
                    "word": chunk["text"],
                    "start_ms": start_ms,
                    "end_ms": end_ms,
                })
        logger.info("Edge TTS 생성 완료: %d bytes, %d 단어", len(audio_data), len(word_timings))
        return audio_data, word_timings
    except Exception as e:
        logger.exception("Edge TTS 실패: %s", e)
        raise
