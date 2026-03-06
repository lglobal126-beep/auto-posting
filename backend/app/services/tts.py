"""
ElevenLabs TTS - Adam 음성으로 나레이션 오디오 생성
"""
import logging
import requests

logger = logging.getLogger("tts")

# ElevenLabs Adam 음성 ID (공개 프리셋)
ADAM_VOICE_ID = "pNInz6obpgDQGcFmaJgB"


def generate_tts_audio(text: str, api_key: str) -> bytes:
    """
    ElevenLabs Adam 음성으로 텍스트를 MP3 오디오로 변환합니다.
    Returns: MP3 bytes
    Raises: requests.HTTPError on API failure
    """
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{ADAM_VOICE_ID}"
    headers = {
        "xi-api-key": api_key,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
    }
    body = {
        "text": text,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {
            "stability": 0.45,
            "similarity_boost": 0.80,
            "style": 0.25,
            "use_speaker_boost": True,
        },
    }

    api_key = (api_key or "").strip()
    headers["xi-api-key"] = api_key
    logger.warning("ElevenLabs 요청 시작 - key prefix: %s, key len: %d", api_key[:8] if api_key else "EMPTY", len(api_key))
    try:
        resp = requests.post(url, json=body, headers=headers, timeout=60)
        resp.raise_for_status()
        logger.info("ElevenLabs TTS 생성 완료: %d bytes", len(resp.content))
        return resp.content
    except Exception as e:
        logger.exception("ElevenLabs TTS 실패: %s", e)
        raise
