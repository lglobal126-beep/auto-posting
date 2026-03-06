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
    ass_content: str = "",
) -> bytes:
    """
    원본 영상을 루프하며 TTS 나레이션 + 자막을 합성합니다.
    - 영상을 오디오 길이만큼 무한 루프 후 오디오 끝에서 자동 컷
    - ASS 자막이 있으면 burn-in
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

        vf = ""
        if ass_content:
            ass_path = os.path.join(tmpdir, "subtitles.ass")
            with open(ass_path, "w", encoding="utf-8") as f:
                f.write(ass_content)
            # Linux 경로이므로 콜론 이스케이프 불필요
            vf = f"ass={ass_path}"

        cmd = [
            "ffmpeg", "-y",
            "-stream_loop", "-1",  # 영상 무한 루프
            "-i", video_path,
            "-i", audio_path,
            "-c:v", "libx264",    # 루프 + 자막 burn-in 시 재인코딩 필요
            "-preset", "fast",
            "-c:a", "aac",
            "-b:a", "128k",
            "-map", "0:v:0",      # 루프된 영상 트랙
            "-map", "1:a:0",      # TTS 오디오 트랙
            "-shortest",          # 오디오 끝나면 자동 종료
        ]
        if vf:
            cmd += ["-vf", vf]
        cmd.append(output_path)

        result = subprocess.run(cmd, capture_output=True, timeout=120)
        if result.returncode != 0:
            err = result.stderr.decode(errors="replace")
            logger.error("FFmpeg 실패: %s", err)
            raise RuntimeError(f"영상 병합 실패: {err[:300]}")

        with open(output_path, "rb") as f:
            output_bytes = f.read()

    logger.info("영상 병합 완료: %d bytes", len(output_bytes))
    return output_bytes
