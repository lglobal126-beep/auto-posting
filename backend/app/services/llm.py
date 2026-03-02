from typing import List, Optional

import requests


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
    실제 LLM 제공자에 맞게 payload/헤더는 조정해야 합니다.
    """
    prompt = build_prompt(
        restaurant_name=restaurant_name,
        ocr_text=ocr_text,
        naver_reviews=naver_reviews,
        user_memo=user_memo,
        keywords=keywords,
    )

    # 예시용 JSON API 호출 (실제 서비스에 맞게 변경 필요)
    headers = {"Authorization": f"Bearer {llm_api_key}"} if llm_api_key else {}
    resp = requests.post(
        llm_api_url,
        json={"prompt": prompt},
        headers=headers,
        timeout=60,
    )
    resp.raise_for_status()
    data = resp.json()

    # 응답 포맷에 맞춰 아래 키를 수정해야 합니다.
    return {
        "blog_title": data.get("blog_title", "임시 제목"),
        "blog_body": data.get("blog_body", "임시 본문"),
        "instagram_caption": data.get("instagram_caption", "임시 인스타 캡션"),
        "instagram_hashtags": data.get("instagram_hashtags", ["#맛집", "#임시"]),
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
역할: 당신은 1,000만 구독자를 가진 한국의 맛집 인플루언서입니다.
톤: 진솔하지만 세련된 말투, 정보성 + 공감 섞인 존댓말.

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

요구사항:
1. 네이버 블로그용 제목과 본문을 생성하세요.
2. 본문에는 운영시간, 주차, 편의시설, 분위기, 인기 메뉴 등에 대해 네이버 리뷰와 텍스트들을 바탕으로 정리해서 포함해주세요. 확실하지 않은 정보는 추측으로 단정하지 말고, 리뷰에서 느껴지는 분위기 위주로 서술하세요.
3. 인스타그램용 짧은 캡션과 해시태그 10~15개를 같이 생성하세요.
4. 결과는 JSON 형식으로 반환하세요. 필드는 blog_title, blog_body, instagram_caption, instagram_hashtags(문자열 리스트) 입니다.
    """.strip()

