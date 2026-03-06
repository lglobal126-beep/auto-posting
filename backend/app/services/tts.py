"""
ElevenLabs TTS - Adam 음성으로 나레이션 오디오 생성
"""
import logging
from elevenlabs import ElevenLabs

logger = logging.getLogger("tts")

# ElevenLabs Adam 음성 ID (공개 프리셋)
ADAM_VOICE_ID = "pNInz6obpgDQGcFmaJgB"


def generate_tts_audio(text: str, api_key: str) -> bytes:
    """
    ElevenLabs Adam 음성으로 텍스트를 MP3 오디오로 변환합니다.
    Returns: MP3 bytes
    """
    client = ElevenLabs(api_key=api_key.strip())
    try:
        audio = client.text_to_speech.convert(
            text=text,
            voice_id=ADAM_VOICE_ID,
            model_id="eleven_multilingual_v2",
            voice_settings={
                "stability": 0.45,
                "similarity_boost": 0.80,
                "style": 0.25,
                "use_speaker_boost": True,
            },
        )
        audio_bytes = b"".join(audio)
        logger.info("ElevenLabs TTS 생성 완료: %d bytes", len(audio_bytes))
        return audio_bytes
    except Exception as e:
        logger.exception("ElevenLabs TTS 실패: %s", e)
        raise
