from typing import List, Optional
import os
import logging

import requests

logger = logging.getLogger("llm")


def generate_post_from_context(
    *,
    llm_api_url: str,
    llm_api_key: str,
    restaurant_name: Optional[str],
    ocr_text: str,
    naver_reviews: List[str],
    user_memo: Optional[str],
    keywords: Optional[List[str]],
) -> dict:
    """
    LLM API를 호출해 네이버 블로그용 본문과 인스타그램 캡션/해시태그를 생성합니다.
    JSON 강제 대신 커스텀 마커 기반 파싱을 사용해 실패 가능성을 줄입니다.
    """
    if not llm_api_url:
        return {
            "blog_title": "임시 제목 - LLM 설정 전",
            "blog_body": "LLM_API_URL이 설정되지 않아 더미 본문을 반환합니다.",
            "instagram_caption": "LLM 설정 전 임시 인스타 캡션입니다.",
            "instagram_hashtags": ["#맛집", "#임시"],
        }

    prompt = build_prompt(
        restaurant_name=restaurant_name,
        ocr_text=ocr_text,
        naver_reviews=naver_reviews,
        user_memo=user_memo,
        keywords=keywords,
    )

    model = os.getenv("LLM_API_MODEL", "gpt-4o-mini")
    headers = {
        "Authorization": f"Bearer {llm_api_key}",
        "Content-Type": "application/json",
    }
    body = {
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": "당신은 1,000만 구독자를 가진 한국의 맛집 인플루언서입니다.",
            },
            {
                "role": "user",
                "content": prompt,
            },
        ],
        "temperature": 0.7,
    }

    try:
        resp = requests.post(llm_api_url, json=body, headers=headers, timeout=60)
        resp.raise_for_status()
        raw = resp.json()
        # 디버깅용 로그 (Render Logs에서 확인)
        logger.info("RAW LLM RESPONSE: %s", raw)
        content = raw["choices"][0]["message"]["content"]
        logger.info("LLM CONTENT: %s", content)

        blog_title = _extract_between(
            content, "[BLOG_TITLE]", "[/BLOG_TITLE]"
        ) or "임시 제목"
        blog_body = _extract_between(
            content, "[BLOG_BODY]", "[/BLOG_BODY]"
        ) or "임시 본문"
        insta_caption = _extract_between(
            content, "[INSTA_CAPTION]", "[/INSTA_CAPTION]"
        ) or "임시 인스타 캡션"
        hashtags_block = _extract_between(
            content, "[INSTA_HASHTAGS]", "[/INSTA_HASHTAGS]"
        ) or ""

        hashtags = [
            token
            for token in hashtags_block.replace("\n", " ").split(" ")
            if token.strip().startswith("#")
        ] or ["#맛집", "#임시"]

        return {
            "blog_title": blog_title.strip(),
            "blog_body": blog_body.strip(),
            "instagram_caption": insta_caption.strip(),
            "instagram_hashtags": hashtags,
        }
    except Exception:
        return {
            "blog_title": "임시 제목 - LLM 응답 파싱 실패",
            "blog_body": "LLM 응답을 파싱하는 중 문제가 발생하여 임시 본문을 반환합니다.",
            "instagram_caption": "LLM 응답 파싱 실패로 인한 임시 캡션입니다.",
            "instagram_hashtags": ["#맛집", "#임시"],
        }


def build_prompt(
    *,
    restaurant_name: Optional[str],
    ocr_text: str,
    naver_reviews: List[str],
    user_memo: Optional[str],
    keywords: Optional[List[str]],
) -> str:
    reviews_joined = "\n\n".join(naver_reviews)
    keywords_str = ", ".join(keywords or [])

    return f"""
다음 정보를 바탕으로 맛집 리뷰와 인스타그램 캡션을 작성하세요.

[식당 기본 정보]
- 식당 이름(추정): {restaurant_name or "알 수 없음"}

[영수증 OCR 텍스트]
{ocr_text}

[네이버 리뷰 텍스트들]
{reviews_joined}

[사용자 메모]
{user_memo or "메모 없음"}

[사용자 키워드]
{keywords_str or "키워드 없음"}

출력 형식은 아래 마커를 반드시 포함해서 작성하세요:

[BLOG_TITLE]
여기에 네이버 블로그 글 제목 한 줄
[/BLOG_TITLE]

[BLOG_BODY]
여기에 네이버 블로그 본문. 운영시간, 주차, 편의시설, 분위기, 인기 메뉴 등을 리뷰와 정보를 바탕으로 자연스럽게 서술하세요. 과장 광고는 피하고 솔직한 후기 스타일의 존댓말을 사용하세요.
[/BLOG_BODY]

[INSTA_CAPTION]
여기에 인스타그램 캡션 2~4문장 정도. 핵심만 담고 자연스럽게 작성하세요.
[/INSTA_CAPTION]

[INSTA_HASHTAGS]
여기에 인스타그램 해시태그 10~15개를 한 줄 또는 두 줄에 나눠서 적으세요. 예: #강남맛집 #곱창맛집 #퇴근후한잔
[/INSTA_HASHTAGS]
    """.strip()


def _extract_between(text: str, start_tag: str, end_tag: str) -> Optional[str]:
    start = text.find(start_tag)
    end = text.find(end_tag)
    if start == -1 or end == -1 or end <= start:
        return None
    start += len(start_tag)
    return text[start:end]


