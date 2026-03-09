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
    subtitle_vf: str = "",
    audio_speed: float = 1.0,
    target_duration: int = 0,
) -> bytes:
    """
    원본 영상에 TTS 나레이션 + 자막을 합성합니다.

    - target_duration: 출력 영상의 정확한 길이(초). 0이면 -shortest 사용.
    - audio_speed: TTS 오디오 배속 (>1 빨라짐, <1 느려짐)
    - subtitle_vf: FFmpeg drawtext 필터 체인 (빈 문자열이면 자막 없음)
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

        # --- 실제 오디오 길이 측정 (ffprobe) ---
        actual_audio_dur = _probe_duration(audio_path)
        if actual_audio_dur and target_duration > 0:
            audio_speed = actual_audio_dur / target_duration
            logger.info(
                "ffprobe 오디오: %.2f초 | 목표: %d초 | atempo: %.3f",
                actual_audio_dur, target_duration, audio_speed,
            )

        # --- FFmpeg 명령어 구성 ---
        cmd = ["ffmpeg", "-y"]

        # 영상 루프 (오디오가 영상보다 길 경우 대비)
        cmd += ["-stream_loop", "-1", "-i", video_path]
        cmd += ["-i", audio_path]

        # 정확한 출력 길이 지정
        if target_duration > 0:
            cmd += ["-t", str(target_duration)]

        # 코덱 설정 (메모리 절약)
        cmd += [
            "-c:v", "libx264",
            "-preset", "ultrafast",
            "-crf", "28",
            "-threads", "1",
            "-c:a", "aac",
            "-b:a", "96k",
            "-map", "0:v:0",
            "-map", "1:a:0",
        ]

        # -shortest는 target_duration 없을 때만
        if target_duration <= 0:
            cmd.append("-shortest")

        # 비디오 필터 (자막)
        if subtitle_vf:
            cmd += ["-vf", subtitle_vf]

        # 오디오 필터 (배속 조정)
        if audio_speed != 1.0 and audio_speed > 0:
            af = _build_atempo_chain(audio_speed)
            cmd += ["-af", af]
            logger.info("atempo 필터: %s", af)

        cmd.append(output_path)
        logger.info("FFmpeg cmd: %s", " ".join(cmd))

        result = subprocess.run(cmd, capture_output=True, timeout=180)
        stderr_text = result.stderr.decode(errors="replace")

        if result.returncode != 0:
            logger.error("FFmpeg 실패:\n%s", stderr_text[-1500:])
            raise RuntimeError(f"영상 병합 실패: {stderr_text[:300]}")

        # 주요 로그 출력
        for line in stderr_text.splitlines():
            low = line.lower()
            if any(k in low for k in ("error", "warn", "font", "drawtext")):
                logger.info("FFmpeg: %s", line.strip())

        with open(output_path, "rb") as f:
            output_bytes = f.read()

    logger.info("영상 병합 완료: %d bytes", len(output_bytes))
    return output_bytes


def _probe_duration(file_path: str) -> float:
    """ffprobe로 파일 길이(초) 측정. 실패 시 0 반환."""
    try:
        cmd = [
            "ffprobe", "-v", "quiet",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            file_path,
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        return float(result.stdout.strip())
    except Exception:
        return 0.0


def _build_atempo_chain(speed: float) -> str:
    """
    FFmpeg atempo 필터 (0.5~2.0 범위). 범위 밖은 체이닝.
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
