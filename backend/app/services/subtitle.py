"""
edge-tts 단어 타이밍으로 ASS 자막 파일 생성 (여단오 스타일)
"""
from typing import List


def _ms_to_ass(ms: int) -> str:
    h = ms // 3_600_000
    m = (ms % 3_600_000) // 60_000
    s = (ms % 60_000) // 1_000
    cs = (ms % 1_000) // 10
    return f"{h}:{m:02d}:{s:02d}.{cs:02d}"


def generate_ass(word_timings: List[dict]) -> str:
    """
    단어별 타이밍을 받아 ASS 자막 문자열을 반환합니다.
    word_timings: [{"word": str, "start_ms": int, "end_ms": int}, ...]

    스타일: 굵은 흰색 텍스트 + 두꺼운 검은 아웃라인 (여단오 스타일)
    """
    if not word_timings:
        return ""

    # ASS 컬러 형식: &HAABBGGRR (알파, 파랑, 초록, 빨강)
    # 흰색: &H00FFFFFF
    # 핫핑크 아웃라인 (R=255, G=20, B=147 → BGR): &H009314FF
    # 검정 섀도: &H00000000
    header = (
        "[Script Info]\n"
        "ScriptType: v4.00+\n"
        "PlayResX: 1080\n"
        "PlayResY: 1920\n"
        "WrapStyle: 0\n"
        "\n"
        "[V4+ Styles]\n"
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, "
        "OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, "
        "ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, "
        "Alignment, MarginL, MarginR, MarginV, Encoding\n"
        # 흰색 텍스트, 핫핑크 아웃라인(두께 8), 검정 섀도(3), 왼쪽 하단 정렬
        "Style: Default,Noto Sans KR,85,&H00FFFFFF,&H000000FF,"
        "&H009314FF,&H00000000,1,0,0,0,100,100,3,0,1,8,3,1,60,60,400,1\n"
        "\n"
        "[Events]\n"
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n"
    )

    # 단어 그룹핑: 3단어 또는 누적 12자 초과 시 새 라인
    groups = []
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

    events = ""
    for group in groups:
        start = _ms_to_ass(group[0]["start_ms"])
        end = _ms_to_ass(group[-1]["end_ms"])
        text = " ".join(w["word"] for w in group)
        events += f"Dialogue: 0,{start},{end},Default,,0,0,0,,{text}\n"

    return header + events
