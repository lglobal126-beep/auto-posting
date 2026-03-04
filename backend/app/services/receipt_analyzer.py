"""
Gemini Vision API를 사용한 영수증 OCR 및 정보 추출
"""
import base64
import json
import logging
import os
from typing import Optional

import requests

logger = logging.getLogger("receipt_analyzer")


def analyze_receipt_from_bytes(
    image_bytes: bytes,
    mime_type: str,
    api_key: str,
    api_url: str,
) -> dict:
    """
    영수증 이미지 바이트를 받아 Gemini Vision으로 정보를 추출합니다.
    Returns: {restaurant_name, address, phone, menu_items, total_amount, visit_date}
    """
    image_b64 = base64.b64encode(image_bytes).decode("utf-8")

    prompt = (
        "이 이미지는 한국 식당의 영수증입니다. "
        "아래 정보를 추출해서 반드시 JSON만 출력하세요. 없는 값은 null로 표시하세요.\n"
        '{"restaurant_name":"가게상호명","address":"주소","phone":"전화번호",'
        '"menu_items":[{"name":"메뉴명","price":"가격"}],'
        '"total_amount":"합계금액","visit_date":"날짜(YYYY-MM-DD)"}'
    )

    body = {
        "contents": [
            {
                "parts": [
                    {"text": prompt},
                    {"inline_data": {"mime_type": mime_type, "data": image_b64}},
                ]
            }
        ],
        "generationConfig": {"temperature": 0.1},
    }

    headers = {"x-goog-api-key": api_key, "Content-Type": "application/json"}

    try:
        resp = requests.post(api_url, json=body, headers=headers, timeout=60)
        resp.raise_for_status()
        raw = resp.json()
        text = raw["candidates"][0]["content"]["parts"][0]["text"]

        # JSON 블록 추출
        text = text.strip()
        if "```" in text:
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        result = json.loads(text.strip())
        return result
    except Exception as e:
        logger.exception("영수증 분석 실패: %s", e)
        return {}


def download_from_supabase_and_analyze(
    supabase_client,
    bucket: str,
    path: str,
    api_key: str,
    api_url: str,
) -> dict:
    """
    Supabase Storage에서 파일을 다운로드하여 영수증 분석을 수행합니다.
    """
    try:
        image_bytes = supabase_client.storage.from_(bucket).download(path)
        ext = path.rsplit(".", 1)[-1].lower()
        mime_map = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png"}
        mime_type = mime_map.get(ext, "image/jpeg")
        return analyze_receipt_from_bytes(image_bytes, mime_type, api_key, api_url)
    except Exception as e:
        logger.exception("Supabase 다운로드 또는 영수증 분석 실패: %s", e)
        return {}


def analyze_food_photo_from_bytes(
    image_bytes: bytes,
    mime_type: str,
    api_key: str,
    api_url: str,
) -> str:
    """
    음식 사진을 Gemini Vision으로 분석하여 상세 설명 문자열을 반환합니다.
    """
    image_b64 = base64.b64encode(image_bytes).decode("utf-8")

    prompt = (
        "이 사진에 나온 음식을 한국어로 상세하게 묘사해주세요. "
        "음식 이름, 색감, 식감, 양, 비주얼 특징, 맛 추정, 특이사항을 2~3문장으로 작성하세요. "
        "음식이 아닌 경우(예: 영수증, 인테리어 등)에는 '해당없음'만 출력하세요."
    )

    body = {
        "contents": [
            {
                "parts": [
                    {"text": prompt},
                    {"inline_data": {"mime_type": mime_type, "data": image_b64}},
                ]
            }
        ],
        "generationConfig": {"temperature": 0.4},
    }

    headers = {"x-goog-api-key": api_key, "Content-Type": "application/json"}

    try:
        resp = requests.post(api_url, json=body, headers=headers, timeout=60)
        resp.raise_for_status()
        raw = resp.json()
        text = raw["candidates"][0]["content"]["parts"][0]["text"].strip()
        return text if text != "해당없음" else ""
    except Exception as e:
        logger.exception("음식 사진 분석 실패: %s", e)
        return ""


def analyze_food_photos_from_supabase(
    supabase_client,
    bucket: str,
    paths: list,
    api_key: str,
    api_url: str,
) -> list:
    """
    여러 음식 사진을 순서대로 분석하여 설명 리스트를 반환합니다.
    영수증 등 음식이 아닌 사진은 빈 문자열로 필터링됩니다.
    Returns: [{"path": "...", "description": "..."}, ...]
    """
    results = []
    mime_map = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "webp": "image/webp"}
    for path in paths:
        try:
            image_bytes = supabase_client.storage.from_(bucket).download(path)
            ext = path.rsplit(".", 1)[-1].lower()
            mime_type = mime_map.get(ext, "image/jpeg")
            desc = analyze_food_photo_from_bytes(image_bytes, mime_type, api_key, api_url)
            if desc:
                results.append({"path": path, "description": desc})
        except Exception as e:
            logger.exception("사진 분석 실패 (%s): %s", path, e)
    return results
