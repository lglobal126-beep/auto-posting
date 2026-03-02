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

    # 마커 기반 파싱
    blog_title = _extract_between(content, "[BLOG_TITLE]", "[/BLOG_TITLE]") or "임시 제목"
    blog_body = _extract_between(content, "[BLOG_BODY]", "[/BLOG_BODY]") or content.strip()
    blog_hashtags_block = _extract_between(
        content, "[BLOG_HASHTAGS]", "[/BLOG_HASHTAGS]"
    ) or ""
    insta_caption = (
        _extract_between(content, "[INSTA_CAPTION]", "[/INSTA_CAPTION]") or "임시 인스타 캡션"
    )
    insta_hashtags_block = (
        _extract_between(content, "[INSTA_HASHTAGS]", "[/INSTA_HASHTAGS]") or ""
    )

    def _extract_hashtags(block: str) -> list[str]:
        tokens = block.replace("\n", " ").split(" ")
        tags = [
            t.strip()
            for t in tokens
            if t.strip().startswith("#") and len(t.strip()) > 1
        ]
        return tags

    blog_hashtags = _extract_hashtags(blog_hashtags_block) or ["#맛집", "#블로그"]
    insta_hashtags = _extract_hashtags(insta_hashtags_block) or ["#맛집", "#리뷰"]

    return {
        "blog_title": blog_title.strip(),
        "blog_body": blog_body.strip(),
        "blog_hashtags": blog_hashtags,
        "instagram_caption": insta_caption.strip(),
        "instagram_hashtags": insta_hashtags,
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
역할: 당신은 네이버 블로그 파워블로거이자 인스타그램 맛집 인플루언서입니다.
톤: 네이버는 정보성 + 친근한 존댓말, 인스타는 짧고 임팩트 있게.

[입력 정보]
- 식당 이름(추정): {restaurant_name or "알 수 없음"}
- 영수증 OCR 텍스트:
{ocr_text}

- 네이버 리뷰 텍스트들:
{reviews_joined}

- 사용자 메모:
{user_memo or "메모 없음"}

- 사용자 키워드:
{keywords_str or "키워드 없음"}

아래 형식을 반드시 지켜서 출력하세요.

[BLOG_TITLE]
네이버 블로그에 바로 쓸 수 있는 제목 1줄
[/BLOG_TITLE]

[BLOG_BODY]
네이버 블로그에 바로 올릴 수 있는 완성된 본문을 작성하세요.
- 1단락: 방문 계기, 누구와 갔는지, 전체적인 첫인상
- 2단락: 위치, 접근성, 영업시간, 주차, 예약/대기 정보 (알 수 없는 정보는 리뷰에서 느껴지는 분위기 위주로 부드럽게 언급)
- 3~4단락: 주문한 메뉴 각각에 대한 맛, 양, 가격 대비 만족도, 추천/비추천 포인트
- 마지막 단락: 이런 사람에게 추천, 재방문 의사, 과하지 않은 자연스러운 마무리 멘트
네이버 블로그 문단 형식으로 줄바꿈과 말투를 잘 맞춰주세요.
[/BLOG_BODY]

[BLOG_HASHTAGS]
네이버 블로그용 해시태그를 공백으로 구분하여 15~25개 정도 작성하세요.
예: #지역명맛집 #메뉴명맛집 #가게이름 #데이트코스 #회식장소 #먹스타그램
[/BLOG_HASHTAGS]

[INSTA_CAPTION]
인스타그램용 캡션을 2~4문장으로 작성하세요.
- 첫 문장은 가게의 핵심 포인트를 한 줄로 요약
- 나머지 문장은 분위기/메뉴/상황을 짧게 언급
모바일에서 바로 읽기 좋게 너무 길지 않게 작성하세요.
[/INSTA_CAPTION]

[INSTA_HASHTAGS]
인스타그램용 해시태그를 공백으로 구분하여 10~20개 작성하세요.
예: #지역명맛집 #메뉴명 #가게이름 #오늘뭐먹지 #instafood #먹스타그램
[/INSTA_HASHTAGS]
    """.strip()


def _extract_between(text: str, start_tag: str, end_tag: str) -> Optional[str]:
    start = text.find(start_tag)
    end = text.find(end_tag)
    if start == -1 or end == -1 or end <= start:
        return None
    start += len(start_tag)
    return text[start:end]


