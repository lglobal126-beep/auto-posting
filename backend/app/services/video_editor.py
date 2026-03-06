"""
FFmpeg를 이용한 영상 + TTS 오디오 병합
"""
import logging
import os
import subprocess
import tempfile

logger = logging.getLogger("video_editor")


def merge_video_with_narration(
    video_bytes: bytes,
    audio_bytes: bytes,
    video_ext: str = "mp4",
) -> bytes:
    """
    원본 영상의 기존 오디오를 TTS 나레이션으로 교체합니다.
    - 영상/오디오 중 짧은 쪽에 맞춰 자동 트리밍 (-shortest)
    - 원본 영상 오디오는 제거됨
    Returns: MP4 bytes
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        video_path = os.path.join(tmpdir, f"input.{video_ext}")
        audio_path = os.path.join(tmpdir, "narration.mp3")
        output_path = os.path.join(tmpdir, "output.mp4")

        with open(video_path, "wb") as f:
            f.write(video_bytes)
        with open(audio_path, "wb") as f:
            f.write(audio_bytes)

        cmd = [
            "ffmpeg", "-y",
            "-i", video_path,
            "-i", audio_path,
            "-c:v", "copy",       # 영상 재인코딩 없음 (빠름)
            "-c:a", "aac",        # 오디오 AAC 인코딩
            "-b:a", "128k",
            "-map", "0:v:0",      # 원본 영상 트랙
            "-map", "1:a:0",      # TTS 오디오 트랙
            "-shortest",          # 짧은 쪽에 맞춰 트리밍
            output_path,
        ]

        result = subprocess.run(cmd, capture_output=True, timeout=120)
        if result.returncode != 0:
            err = result.stderr.decode(errors="replace")
            logger.error("FFmpeg 실패: %s", err)
            raise RuntimeError(f"영상 병합 실패: {err[:300]}")

        with open(output_path, "rb") as f:
            output_bytes = f.read()

    logger.info("영상 병합 완료: %d bytes", len(output_bytes))
    return output_bytes
