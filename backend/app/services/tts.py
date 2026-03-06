"""
Edge TTS - Microsoft Neural 음성으로 나레이션 오디오 생성 (무료)
"""
import asyncio
import logging

import edge_tts

logger = logging.getLogger("tts")

# Microsoft Edge Neural 한국어 남성 목소리
VOICE = "ko-KR-InJoonNeural"


async def _synthesize(text: str) -> bytes:
    communicate = edge_tts.Communicate(text, VOICE)
    audio_data = b""
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_data += chunk["data"]
    return audio_data


def generate_tts_audio(text: str, api_key: str = "") -> bytes:
    """
    Microsoft Edge Neural TTS로 텍스트를 MP3 오디오로 변환합니다.
    Returns: MP3 bytes
    """
    try:
        loop = asyncio.new_event_loop()
        try:
            audio_bytes = loop.run_until_complete(_synthesize(text))
        finally:
            loop.close()
        logger.info("Edge TTS 생성 완료: %d bytes", len(audio_bytes))
        return audio_bytes
    except Exception as e:
        logger.exception("Edge TTS 실패: %s", e)
        raise
