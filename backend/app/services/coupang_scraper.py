"""
쿠팡 상품 페이지 크롤링
상품명, 설명, 스펙, 기존 리뷰 등을 추출합니다.
"""
import logging
import re
from typing import Optional

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger("coupang_scraper")

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "ko-KR,ko;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Referer": "https://www.coupang.com/",
}


def fetch_product_info(url: str) -> dict:
    """
    쿠팡 상품 URL에서 상품 정보를 추출합니다.
    Returns: {product_name, description, features, specs, existing_reviews}
    """
    try:
        resp = requests.get(url, headers=HEADERS, timeout=15)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "lxml")

        product_name = _extract_product_name(soup)
        description = _extract_description(soup)
        features = _extract_features(soup)
        specs = _extract_specs(soup)
        existing_reviews = _extract_reviews(soup)

        logger.info("쿠팡 상품 크롤링 성공: %s", product_name)
        return {
            "product_name": product_name,
            "description": description,
            "features": features,
            "specs": specs,
            "existing_reviews": existing_reviews,
        }
    except Exception as e:
        logger.exception("쿠팡 크롤링 실패: %s", e)
        return {}


def _extract_product_name(soup: BeautifulSoup) -> str:
    # og:title 또는 h1 태그에서 상품명 추출
    og_title = soup.find("meta", property="og:title")
    if og_title and og_title.get("content"):
        return og_title["content"].strip()
    h1 = soup.find("h1", class_=re.compile(r"prod-buy-header__title|title"))
    if h1:
        return h1.get_text(strip=True)
    title = soup.find("title")
    if title:
        text = title.get_text(strip=True)
        # "상품명 : 쿠팡" 형식에서 상품명만 추출
        return text.split(":")[0].strip()
    return ""


def _extract_description(soup: BeautifulSoup) -> str:
    og_desc = soup.find("meta", property="og:description")
    if og_desc and og_desc.get("content"):
        return og_desc["content"].strip()
    return ""


def _extract_features(soup: BeautifulSoup) -> list:
    features = []
    # 상품 특징 항목 추출 시도
    for selector in [
        "ul.prod-attr-list li",
        "div.prod-description-content li",
        "div.prod-attr li",
    ]:
        items = soup.select(selector)
        if items:
            features = [li.get_text(strip=True) for li in items[:10] if li.get_text(strip=True)]
            break
    return features


def _extract_specs(soup: BeautifulSoup) -> list:
    specs = []
    for selector in [
        "table.prod-spec-table tr",
        "div.spec-list tr",
    ]:
        rows = soup.select(selector)
        if rows:
            for row in rows[:8]:
                cells = row.find_all(["td", "th"])
                if len(cells) >= 2:
                    key = cells[0].get_text(strip=True)
                    val = cells[1].get_text(strip=True)
                    if key and val:
                        specs.append(f"{key}: {val}")
            break
    return specs


def _extract_reviews(soup: BeautifulSoup) -> list:
    reviews = []
    # 리뷰 텍스트 추출 시도
    for selector in [
        "div.sdp-review__article__list__review__content",
        "div.review-content",
        "p.review-text",
        "div.prod-review-list__content",
    ]:
        items = soup.select(selector)
        if items:
            for item in items[:5]:
                text = item.get_text(strip=True)
                if text and len(text) > 10:
                    reviews.append(text[:200])
            break
    return reviews


def build_product_summary(info: dict) -> str:
    """크롤링 결과를 LLM 프롬프트용 텍스트로 변환"""
    if not info:
        return "(상품 정보 없음)"

    lines = []
    if info.get("product_name"):
        lines.append(f"상품명: {info['product_name']}")
    if info.get("description"):
        lines.append(f"상품 설명: {info['description']}")
    if info.get("features"):
        lines.append("주요 특징:")
        for f in info["features"]:
            lines.append(f"  - {f}")
    if info.get("specs"):
        lines.append("스펙:")
        for s in info["specs"]:
            lines.append(f"  - {s}")
    if info.get("existing_reviews"):
        lines.append("기존 구매자 리뷰 (참고용):")
        for i, r in enumerate(info["existing_reviews"], 1):
            lines.append(f"  {i}. {r}")

    return "\n".join(lines)
