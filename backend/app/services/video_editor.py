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
    audio_speed: float = 1.0,
) -> bytes:
    """
    원본 영상에 TTS 나레이션 + 자막을 합성합니다.
    - audio_speed: TTS 오디오를 이 배속으로 재생 (>1이면 빨라짐)
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

        # --- 비디오 필터 (자막) ---
        vf = ""
        if ass_content:
            ass_path = os.path.join(tmpdir, "subtitles.ass")
            with open(ass_path, "w", encoding="utf-8") as f:
                f.write(ass_content)

            fonts_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fonts")
            font_files = os.listdir(fonts_dir) if os.path.isdir(fonts_dir) else []
            logger.info("폰트 디렉토리: %s | 파일: %s", fonts_dir, font_files)

            # FFmpeg 필터에서 경로 구분자: 슬래시로 통일, 콜론 이스케이프
            ass_esc = ass_path.replace("\\", "/").replace(":", "\\:")
            fonts_esc = fonts_dir.replace("\\", "/").replace(":", "\\:")
            vf = f"ass={ass_esc}:fontsdir={fonts_esc}"

        # --- 오디오 필터 (배속 조정) ---
        af = ""
        if audio_speed != 1.0 and audio_speed > 0:
            af = _build_atempo_chain(audio_speed)
            logger.info("오디오 배속: %.2fx → atempo=%s", audio_speed, af)

        cmd = [
            "ffmpeg", "-y",
            "-i", video_path,
            "-i", audio_path,
            "-c:v", "libx264",
            "-preset", "ultrafast",
            "-crf", "28",
            "-threads", "1",
            "-c:a", "aac",
            "-b:a", "96k",
            "-map", "0:v:0",
            "-map", "1:a:0",
            "-shortest",
        ]
        if vf:
            cmd += ["-vf", vf]
        if af:
            cmd += ["-af", af]
        cmd.append(output_path)

        logger.info("FFmpeg cmd: %s", " ".join(cmd))
        result = subprocess.run(cmd, capture_output=True, timeout=120)
        stderr_text = result.stderr.decode(errors="replace")

        if result.returncode != 0:
            logger.error("FFmpeg 실패:\n%s", stderr_text[-1000:])
            raise RuntimeError(f"영상 병합 실패: {stderr_text[:300]}")

        # 자막/폰트 관련 경고 로깅
        for line in stderr_text.splitlines():
            low = line.lower()
            if any(k in low for k in ("ass", "font", "subtitle", "warn", "error")):
                logger.info("FFmpeg: %s", line.strip())

        with open(output_path, "rb") as f:
            output_bytes = f.read()

    logger.info("영상 병합 완료: %d bytes", len(output_bytes))
    return output_bytes


def _build_atempo_chain(speed: float) -> str:
    """
    FFmpeg atempo 필터는 0.5~100.0 범위만 지원.
    0.5 미만이나 100 초과는 체이닝으로 해결.
    """
    if speed <= 0:
        return "atempo=1.0"

    filters = []
    remaining = speed
    while remaining > 2.0:
        filters.append("atempo=2.0")
        remaining /= 2.0
    while remaining < 0.5:
        filters.append("atempo=0.5")
        remaining /= 0.5
    filters.append(f"atempo={remaining:.4f}")
    return ",".join(filters)
