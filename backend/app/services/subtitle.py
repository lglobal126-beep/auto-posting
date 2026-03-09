"""
TTS 단어 타이밍 → FFmpeg drawtext 자막 필터 생성
스타일: 흰색 텍스트 + 핫핑크 테두리 + 검은 그림자 (여단오 스타일)
"""
import os
from typing import List


# 번들된 한글 폰트
FONT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fonts", "NotoSansKR-Bold.ttf")


def _group_words(word_timings: List[dict]) -> List[List[dict]]:
    """3단어 또는 12자 초과 시 그룹 분리"""
    groups: List[List[dict]] = []
    current: List[dict] = []
    current_chars = 0
    for w in word_timings:
        current.append(w)
        current_chars += len(w["word"])
        if len(current) >= 3 or current_chars >= 12:
            groups.append(current)
            current = []
            current_chars = 0
    if current:
        groups.append(current)
    return groups


def build_drawtext_filter(word_timings: List[dict], font_path: str = "") -> str:
    """
    단어 타이밍 → FFmpeg drawtext 필터 체인 문자열.
    반환값을 FFmpeg -vf 인자로 그대로 사용 가능.
    """
    if not word_timings:
        return ""

    fp = font_path or FONT_PATH
    if not os.path.isfile(fp):
        return ""

    # FFmpeg 필터 내 경로 이스케이핑: \ → /, : → \:
    font_esc = fp.replace("\\", "/").replace(":", "\\:")
    groups = _group_words(word_timings)

    parts = []
    for group in groups:
        start_s = group[0]["start_ms"] / 1000.0
        end_s = group[-1]["end_ms"] / 1000.0
        text = " ".join(w["word"] for w in group)
        # drawtext 텍스트 이스케이핑
        text_esc = (text
                    .replace("\\", "\\\\")
                    .replace("'", "'\\''")
                    .replace(":", "\\:")
                    .replace("%", "%%"))

        part = (
            f"drawtext=fontfile='{font_esc}'"
            f":text='{text_esc}'"
            f":fontsize=50"
            f":fontcolor=white"
            f":borderw=4"
            f":bordercolor=0xFF1493"
            f":shadowcolor=black:shadowx=2:shadowy=2"
            f":x=(w-text_w)/2"
            f":y=h-h/6"
            f":enable='between(t,{start_s:.3f},{end_s:.3f})'"
        )
        parts.append(part)

    return ",".join(parts)
