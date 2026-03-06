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
당신은 맛집을 즐겨 다니는 평범한 30대로, 네이버 블로그에 방문 후기를 직접 작성하는 사람입니다.
아래 식당 정보와 사진 분석 결과를 바탕으로 블로그 포스팅을 작성해주세요.

━━━ 식당 정보 ━━━
- 상호명: {restaurant_name or "알 수 없음"}
- 주소: {address or "정보 없음"}
- 전화: {phone or "정보 없음"}
- 주문 메뉴:
{menu_str or "  (정보 없음)"}
- 합계 금액: {total_amount or "정보 없음"}
- 방문 메모: {user_memo or "메모 없음"}
- 강조 키워드: {keywords_str or "없음"}

━━━ 사진 분석 결과 (사진 순서대로) ━━━
{food_desc_str or "  (사진 정보 없음)"}
※ [메뉴판], [외관], [인테리어] 태그가 붙은 항목은 해당 유형의 사진입니다.

━━━ 네이버 블로그 작성 기준 ━━━

【절대 금지 — AI 티가 나는 패턴】
• "~할 수 있어요", "~해볼게요", "함께 알아볼까요?" 같은 AI 정형 문구 금지
• "맛있는 음식", "친절한 직원", "깔끔한 인테리어" 같은 뻔한 표현 금지
• 모든 문장이 동일한 길이로 정렬된 느낌 금지
• 문단 구성이 너무 깔끔하고 교과서적인 느낌 금지
• 아쉬운 점, 단점, 불편한 점은 절대 언급하지 말 것 — 이 글은 긍정적인 방문 경험을 어필하는 글

【핵심 원칙 — 사람이 직접 쓴 느낌】
• 평범한 30대가 퇴근 후 스마트폰으로 타이핑하는 느낌
• 문장 길이를 일부러 들쭉날쭉하게 (짧은 감탄 + 긴 설명 섞기)
• 말하는 것처럼 쓰기: "근데", "솔직히", "어쩐지", "진짜로", "그냥" 같은 구어 표현 자연스럽게 사용
• "~했어요", "~이었어요", "~거든요", "~더라고요", "~잖아요" 선호
• 방문 당시의 감정이나 상황을 구체적으로 언급 (날씨, 함께 간 사람, 기다린 시간 등)
• 음식 사진 분석 결과를 그대로 나열하지 말고, 자신의 말로 재해석해서 표현
• 글의 첫 문장은 반드시 "안녕하세요 여러분! 접니다." 로 시작
• 이모지는 문단 또는 문장의 끝에만 배치 (앞에 쓰지 말 것)
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

오늘은 오랜만에 회 먹으러 갔다 왔는데
생각보다 너무 좋아서 바로 후기 남겨요 😊

📍 위치 정보
- 주소: OOO
- 전화: OOO

1. 모둠회
진짜 신선하더라고요.
광어랑 연어가 두툼하게 썰려 있어서
한 점 먹었는데 입에서 녹는 느낌이었어요.

2. 붕장어회
이게 생각보다 쫄깃해서 놀랐어요.
특유의 향도 별로 안 나고 깔끔했거든요.
고추냉이랑 같이 먹으니까 더 맛있었답니다 👍

• 본문 구성 (아래 순서 엄수):
  ① 인사 + 방문 계기 + 첫인상 (짧고 가볍게, 2~3문장)
  ② 위치·주차 등 실용 정보 (한 항목씩 줄바꿈하여 한눈에 보이게)
  ③ 가게 외관·인테리어 소개 (사진 분석에 [외관], [인테리어] 항목이 있으면 자연스럽게 녹여서 표현)
     · 예: 간판 디자인, 들어서는 느낌, 좌석 분위기, 조명 등을 편하게 묘사
  ④ 메뉴판 소개 (사진 분석에 [메뉴판] 항목이 있으면 주요 메뉴와 가격대를 간략히 언급)
  ⑤ 음식별 상세 후기 — 사진 분석 결과 적극 활용, 각 음식마다 독립 단락
     · 음식 이름 앞에 반드시 순서 번호를 붙일 것: 첫 번째 음식은 "1. 음식이름", 두 번째는 "2. 음식이름", 세 번째는 "3. 음식이름" (이모지·별표·마크다운 기호 절대 금지)
     · 색감·식감·맛·양 구체 묘사 (짧은 문장 여러 개로), 맛있었던 점을 생생하게 표현
     · 전체적으로 좋았다는 인상을 자연스럽게 전달 (단점 언급 금지)
  ⑥ 밑반찬/소스류 간략 언급
  ⑦ 총평 + 재방문 의사 + 추천 대상 (따뜻하고 긍정적으로 마무리)
• 총 글자 수 800~1500자 내외
• 영수증 이미지는 글에 언급하지 말 것

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
""".strip()


def generate_coupang_review(
    *,
    llm_api_url: str,
    llm_api_key: str,
    product_summary: str,
    user_memo: Optional[str],
    photo_descriptions: Optional[List[str]] = None,
) -> dict:
    """
    Gemini API로 쿠팡 리뷰를 생성합니다.
    Returns: {review_title, review_body}
    """
    if not llm_api_url:
        return _coupang_error("LLM_API_URL이 설정되지 않았습니다.")
    if not llm_api_key:
        return _coupang_error("LLM_API_KEY가 설정되지 않았습니다.")

    prompt = build_coupang_prompt(
        product_summary=product_summary,
        user_memo=user_memo,
        photo_descriptions=photo_descriptions,
    )

    headers = {"x-goog-api-key": llm_api_key, "Content-Type": "application/json"}
    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.85},
    }

    try:
        resp = requests.post(llm_api_url, json=body, headers=headers, timeout=90)
    except Exception as e:
        logger.exception("LLM 요청 실패: %s", e)
        return _coupang_error(f"LLM 요청 오류: {e}")

    if not resp.ok:
        return _coupang_error(f"LLM HTTP 에러 {resp.status_code}")

    try:
        raw = resp.json()
        parts = raw["candidates"][0]["content"]["parts"]
        content = "".join(p.get("text", "") for p in parts)
    except Exception as e:
        return _coupang_error("LLM 응답 구조 오류")

    review_title = _extract(content, "[REVIEW_TITLE]", "[/REVIEW_TITLE]") or "상품 후기"
    review_body = _extract(content, "[REVIEW_BODY]", "[/REVIEW_BODY]") or content.strip()

    return {
        "review_title": review_title.strip(),
        "review_body": review_body.strip(),
    }


def build_coupang_prompt(
    *,
    product_summary: str,
    user_memo: Optional[str],
    photo_descriptions: Optional[List[str]] = None,
) -> str:
    photo_str = ""
    if photo_descriptions:
        photo_str = "\n".join(f"  {i+1}. {d}" for i, d in enumerate(photo_descriptions))

    return f"""
당신은 쿠팡에서 물건을 자주 구매하는 평범한 30대 소비자입니다.
아래 상품 정보와 사용 메모를 바탕으로 쿠팡 리뷰를 작성해주세요.

━━━ 상품 정보 ━━━
{product_summary or "(상품 정보 없음)"}

━━━ 사용 메모 (구매자 직접 작성) ━━━
{user_memo or "(없음)"}

━━━ 실제 사진 분석 결과 ━━━
{photo_str or "(없음)"}

━━━ 리뷰 작성 기준 ━━━

【핵심 원칙 — 반드시 준수】
• 절대로 AI가 쓴 것처럼 느껴지면 안 됨
• 평범한 한국인이 스마트폰으로 직접 타이핑한 느낌
• 문장이 완벽하지 않아도 됨, 구어체 자연스럽게
• "~습니다" 보다 "~해요", "~이에요", "~거든요" 선호
• 과장 없이 솔직하게, 단점도 한두 개는 언급
• "내돈내산"임을 자연스럽게 표현
• 글자 수: 400~700자 내외

【구성 순서】
① 한줄평 (구매 이유 + 첫인상, 1~2문장)
② 구매 계기 (왜 이 제품을 골랐는지 짧게)
③ ✅ 좋은 점 (2~4가지, 각 항목 번호 매기기)
   형식: "1. 항목명\n설명 1~2문장"
④ ❌ 아쉬운 점 (1~2가지, 솔직하게)
⑤ 총평 (추천 대상 포함, 2~3문장)
⑥ 마무리: 내돈내산 후기였어요. 도움이 됐다면 도움이 됐어요 버튼 눌러주세요!

【절대 금지】
• "완벽합니다", "최고의 선택입니다" 같은 과도한 찬사
• "~드립니다", "~바랍니다" 같은 격식체
• 영수증이나 상품 링크 언급
• 마크다운 기호 (**, ## 등)

━━━ 출력 형식 ━━━

[REVIEW_TITLE]
한줄평 1문장 (예: 디자인에 반하고 성능에 두 번 반하는 직장인 필수템)
[/REVIEW_TITLE]

[REVIEW_BODY]
(구매 계기 ~ 마무리까지 전체 본문)
[/REVIEW_BODY]
""".strip()


def _coupang_error(msg: str) -> dict:
    return {"review_title": "생성 오류", "review_body": msg}


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
