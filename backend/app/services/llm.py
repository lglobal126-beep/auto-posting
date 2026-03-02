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
    Google Gemini API (generateContent) 형식으로 LLM을 호출해
    네이버 블로그용 본문과 인스타그램 캡션/해시태그를 생성합니다.
    """
    if not llm_api_url:
        return {
            "blog_title": "LLM 설정 오류",
            "blog_body": "LLM_API_URL이 설정되지 않았습니다.",
            "instagram_caption": "LLM 설정 오류",
            "instagram_hashtags": ["#설정오류"],
        }

    if not llm_api_key:
        return {
            "blog_title": "LLM 키 설정 오류",
            "blog_body": "LLM_API_KEY가 설정되지 않았습니다.",
            "instagram_caption": "LLM 설정 오류",
            "instagram_hashtags": ["#설정오류"],
        }

    prompt = build_prompt(
        restaurant_name=restaurant_name,
        ocr_text=ocr_text,
        naver_reviews=naver_reviews,
        user_memo=user_memo,
        keywords=keywords,
    )

    # Gemini generateContent 형식 (레퍼런스 그대로)
    # LLM_API_URL 예시:
    # https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent
    url = llm_api_url
    headers = {
        "x-goog-api-key": llm_api_key,
        "Content-Type": "application/json",
    }
    body = {
        "contents": [
            {
                "parts": [
                    {
                        "text": prompt,
                    }
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.7,
        },
    }

    try:
        resp = requests.post(url, json=body, headers=headers, timeout=60)
    except Exception as e:
        logger.exception("LLM HTTP 요청 실패: %s", e)
        return {
            "blog_title": "LLM 호출 실패",
            "blog_body": f"LLM HTTP 요청 중 오류가 발생했습니다: {e}",
            "instagram_caption": "LLM 호출 실패",
            "instagram_hashtags": ["#llm오류"],
        }

    if not resp.ok:
        text = ""
        try:
            text = resp.text
        except Exception:
            text = "<본문 없음>"
        logger.error("LLM HTTP 에러: status=%s, body=%s", resp.status_code, text)
        return {
            "blog_title": "LLM HTTP 에러",
            "blog_body": f"status={resp.status_code}, body={text}",
            "instagram_caption": "LLM HTTP 에러",
            "instagram_hashtags": ["#llm오류"],
        }

    try:
        raw = resp.json()
    except ValueError as e:
        logger.error("LLM JSON 디코딩 실패: %s, text=%s", e, resp.text)
        return {
            "blog_title": "LLM JSON 파싱 오류",
            "blog_body": f"LLM 응답이 JSON이 아닙니다: {e}\n{resp.text}",
            "instagram_caption": "LLM JSON 파싱 오류",
            "instagram_hashtags": ["#llm오류"],
        }

    logger.info("RAW LLM RESPONSE: %s", raw)

    # Gemini 형식: candidates[0].content.parts[*].text
    try:
        candidates = raw.get("candidates", [])
        first = candidates[0]
        parts = first["content"]["parts"]
        content = "".join(part.get("text", "") for part in parts)
    except Exception as e:
        logger.error("LLM candidates 파싱 실패: %s", e)
        return {
            "blog_title": "LLM 응답 구조 오류",
            "blog_body": f"candidates 구조를 파싱하지 못했습니다: {e}\n{raw}",
            "instagram_caption": "LLM 응답 구조 오류",
            "instagram_hashtags": ["#llm오류"],
        }

    logger.info("LLM CONTENT: %s", content)

    # 마커 기반 대신 단순 파싱: 전체를 블로그 본문으로, 첫 줄을 제목으로 사용
    full_text = content.strip()
    lines = [ln.strip() for ln in full_text.splitlines() if ln.strip()]
    if lines:
        blog_title = lines[0][:80]
    else:
        blog_title = "임시 제목"

    blog_body = full_text

    # 인스타 캡션은 본문의 앞부분 일부를 사용
    if len(full_text) > 200:
        instagram_caption = full_text[:200] + "..."
    else:
        instagram_caption = full_text

    # 해시태그는 LLM이 본문에 포함한 #태그를 그대로 추출
    tokens = full_text.replace("\n", " ").split(" ")
    hashtags = [
        t.strip()
        for t in tokens
        if t.strip().startswith("#") and len(t.strip()) > 1
    ]
    if not hashtags:
        hashtags = ["#맛집", "#리뷰"]

    return {
        "blog_title": blog_title,
        "blog_body": blog_body,
        "instagram_caption": instagram_caption,
        "instagram_hashtags": hashtags,
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


