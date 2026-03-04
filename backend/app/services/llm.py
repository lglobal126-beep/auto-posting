from typing import List, Optional
import logging

import requests

logger = logging.getLogger("llm")


def generate_post_from_context(
    *,
    llm_api_url: str,
    llm_api_key: str,
    restaurant_name: Optional[str],
    address: Optional[str],
    phone: Optional[str],
    menu_items: Optional[list],
    total_amount: Optional[str],
    user_memo: Optional[str],
    keywords: Optional[List[str]],
    food_descriptions: Optional[List[str]] = None,
) -> dict:
    """
    Gemini API로 네이버 블로그 본문 + 인스타그램 캡션/해시태그를 생성합니다.
    """
    if not llm_api_url:
        return _error("LLM_API_URL이 설정되지 않았습니다.")
    if not llm_api_key:
        return _error("LLM_API_KEY가 설정되지 않았습니다.")

    prompt = build_prompt(
        restaurant_name=restaurant_name,
        address=address,
        phone=phone,
        menu_items=menu_items,
        total_amount=total_amount,
        user_memo=user_memo,
        keywords=keywords,
        food_descriptions=food_descriptions,
    )

    url = llm_api_url
    headers = {"x-goog-api-key": llm_api_key, "Content-Type": "application/json"}
    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.75},
    }

    try:
        resp = requests.post(url, json=body, headers=headers, timeout=90)
    except Exception as e:
        logger.exception("LLM 요청 실패: %s", e)
        return _error(f"LLM 요청 오류: {e}")

    if not resp.ok:
        logger.error("LLM HTTP 에러: %s %s", resp.status_code, resp.text[:500])
        return _error(f"LLM HTTP 에러 {resp.status_code}")

    try:
        raw = resp.json()
    except ValueError as e:
        return _error(f"LLM JSON 파싱 오류: {e}")

    try:
        parts = raw["candidates"][0]["content"]["parts"]
        content = "".join(p.get("text", "") for p in parts)
    except Exception as e:
        logger.error("LLM candidates 파싱 실패: %s | raw=%s", e, raw)
        return _error("LLM 응답 구조 오류")

    logger.info("LLM 응답 길이: %d chars", len(content))

    blog_title = _extract(content, "[BLOG_TITLE]", "[/BLOG_TITLE]") or "임시 제목"
    blog_body = _extract(content, "[BLOG_BODY]", "[/BLOG_BODY]") or content.strip()
    blog_tags_block = _extract(content, "[BLOG_HASHTAGS]", "[/BLOG_HASHTAGS]") or ""
    insta_caption = _extract(content, "[INSTA_CAPTION]", "[/INSTA_CAPTION]") or "임시 캡션"
    insta_tags_block = _extract(content, "[INSTA_HASHTAGS]", "[/INSTA_HASHTAGS]") or ""

    return {
        "blog_title": blog_title.strip(),
        "blog_body": blog_body.strip(),
        "blog_hashtags": _parse_hashtags(blog_tags_block) or ["#맛집", "#블로그리뷰"],
        "instagram_caption": insta_caption.strip(),
        "instagram_hashtags": _parse_hashtags(insta_tags_block) or ["#맛집", "#먹스타그램"],
    }


def build_prompt(
    *,
    restaurant_name: Optional[str],
    address: Optional[str],
    phone: Optional[str],
    menu_items: Optional[list],
    total_amount: Optional[str],
    user_memo: Optional[str],
    keywords: Optional[List[str]],
    food_descriptions: Optional[List[str]] = None,
) -> str:
    menu_str = ""
    if menu_items:
        lines = [f"  - {m.get('name', '')} {m.get('price', '')}".strip() for m in menu_items if m.get("name")]
        menu_str = "\n".join(lines)
    keywords_str = ", ".join(keywords or [])

    food_desc_str = ""
    if food_descriptions:
        numbered = [f"  {i+1}. {d}" for i, d in enumerate(food_descriptions)]
        food_desc_str = "\n".join(numbered)

    return f"""
당신은 네이버 블로그 파워블로거이자 인스타그램 맛집 인플루언서입니다.
아래 식당 정보와 사진 분석 결과를 바탕으로 블로그 포스팅과 인스타그램 게시글을 작성해주세요.

━━━ 식당 정보 ━━━
- 상호명: {restaurant_name or "알 수 없음"}
- 주소: {address or "정보 없음"}
- 전화: {phone or "정보 없음"}
- 주문 메뉴:
{menu_str or "  (정보 없음)"}
- 합계 금액: {total_amount or "정보 없음"}
- 방문 메모: {user_memo or "메모 없음"}
- 강조 키워드: {keywords_str or "없음"}

━━━ 음식 사진 분석 결과 (사진 순서대로) ━━━
{food_desc_str or "  (사진 정보 없음)"}

━━━ 네이버 블로그 작성 기준 ━━━
• 글의 첫 문장은 반드시 "안녕하세요 여러분! 접니다." 로 시작할 것
• 파워블로거 특유의 친근하고 따뜻한 존댓말 문체 (마치 친한 언니/오빠가 알려주는 느낌)
• 이모지는 문단 또는 문장의 끝에만 배치 (절대 문단·문장 앞에 쓰지 말 것, 예: "정말 맛있었어요 😋" O / "😋 정말 맛있었어요" X)
• 제목: "[가게명] 맛집 | [메뉴 or 분위기] 솔직후기 🍴" 형식으로 검색 최적화

【가독성 규칙 — 반드시 준수 / 모바일 중앙정렬 기준】
• 한 문장은 20~25자 이내로 짧게 끊을 것 (모바일 한 줄 기준)
• 문장마다 줄바꿈, 2~3문장 후 반드시 빈 줄 삽입
• 한 단락은 절대 4줄을 넘기지 말 것
• 정보 나열은 한 항목씩 단독 한 줄로 (주소, 전화, 주차 등)
• 음식 후기 각 항목 전후에 빈 줄 삽입
• 독자가 스크롤하며 눈이 편하도록 여백을 충분히 줄 것
• 예시 형식:

안녕하세요 여러분! 접니다.

오늘은 고기 맛집 방문 후기를 가져왔어요!
기대 많이 해주세요 😊

📍 위치 정보
- 주소: OOO
- 주차: OOO
- 전화: OOO

1. 음식이름
색이 정말 먹음직스러웠어요.
두께도 두툼해서 씹는 맛이 좋았어요.
가격 대비 만족도도 높았답니다 👍

• 본문 구성 (아래 순서 엄수):
  ① 인사 + 방문 계기 + 첫인상 (짧고 가볍게, 2~3문장)
  ② 위치·주차 등 실용 정보 (한 항목씩 줄바꿈하여 한눈에 보이게)
  ③ 음식별 상세 후기 — 사진 분석 결과 적극 활용, 각 음식마다 독립 단락
     · 음식 이름은 반드시 "1. 음식이름" 형식 (이모지·별표·마크다운 기호 절대 금지)
     · 색감·식감·맛·양·가격 대비 만족도 구체 묘사 (짧은 문장 여러 개로)
     · 솔직한 감상 포함
  ④ 밑반찬/소스류 간략 언급
  ⑤ 총평 + 재방문 의사 + 추천 대상 (따뜻하게 마무리)
• 총 글자 수 800~1500자 내외
• 영수증 이미지는 글에 언급하지 말 것

━━━ 인스타그램 작성 기준 ━━━
• 첫 줄: 핵심 후크 문장 (이모지 포함, 임팩트 있게)
• 2~4줄: 가장 인상 깊었던 메뉴 1~2개 감성적으로 표현
• 모바일에서 읽기 좋게 줄바꿈 적극 활용
• 이모지 자연스럽게 사용

━━━ 출력 형식 (반드시 아래 태그를 정확하게 사용) ━━━

[BLOG_TITLE]
제목 1줄
[/BLOG_TITLE]

[BLOG_BODY]
안녕하세요 여러분! 접니다.

(이후 본문 계속)
[/BLOG_BODY]

[BLOG_HASHTAGS]
#해시태그1 #해시태그2 ... (15~25개)
[/BLOG_HASHTAGS]

[INSTA_CAPTION]
캡션 (3~5줄, 이모지 포함)
[/INSTA_CAPTION]

[INSTA_HASHTAGS]
#해시태그1 #해시태그2 ... (10~20개, 한/영 혼합)
[/INSTA_HASHTAGS]
""".strip()


def _error(msg: str) -> dict:
    return {
        "blog_title": "생성 오류",
        "blog_body": msg,
        "blog_hashtags": ["#오류"],
        "instagram_caption": "생성 오류",
        "instagram_hashtags": ["#오류"],
    }


def _extract(text: str, start: str, end: str) -> Optional[str]:
    s = text.find(start)
    e = text.find(end)
    if s == -1 or e == -1 or e <= s:
        return None
    return text[s + len(start):e]


def _parse_hashtags(block: str) -> list[str]:
    tokens = block.replace("\n", " ").split()
    return [t.strip() for t in tokens if t.strip().startswith("#") and len(t.strip()) > 1]
