"""
Instagram Graph API를 통한 사진 게시
"""
import logging
import time
from typing import Optional

import requests

logger = logging.getLogger("instagram")

GRAPH_BASE = "https://graph.instagram.com/v18.0"


def verify_token(access_token: str, ig_user_id: str) -> Optional[dict]:
    """
    액세스 토큰 유효성 검증 및 계정 정보 반환
    """
    try:
        resp = requests.get(
            f"{GRAPH_BASE}/{ig_user_id}",
            params={
                "fields": "id,username,account_type",
                "access_token": access_token,
            },
            timeout=10,
        )
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        logger.exception("Instagram 토큰 검증 실패: %s", e)
        return None


def _create_media_container(
    access_token: str,
    ig_user_id: str,
    image_url: str,
    caption: str = "",
    is_carousel_item: bool = False,
) -> Optional[str]:
    """단일 이미지 미디어 컨테이너 생성. Returns container ID."""
    params = {
        "image_url": image_url,
        "access_token": access_token,
    }
    if is_carousel_item:
        params["is_carousel_item"] = "true"
    else:
        params["caption"] = caption

    try:
        resp = requests.post(
            f"{GRAPH_BASE}/{ig_user_id}/media",
            params=params,
            timeout=30,
        )
        resp.raise_for_status()
        return resp.json().get("id")
    except Exception as e:
        logger.exception("Instagram 미디어 컨테이너 생성 실패: %s", e)
        return None


def _publish_container(
    access_token: str,
    ig_user_id: str,
    creation_id: str,
) -> Optional[str]:
    """미디어 컨테이너를 게시. Returns post ID."""
    try:
        resp = requests.post(
            f"{GRAPH_BASE}/{ig_user_id}/media_publish",
            params={"creation_id": creation_id, "access_token": access_token},
            timeout=30,
        )
        resp.raise_for_status()
        post_id = resp.json().get("id")
        return post_id
    except Exception as e:
        logger.exception("Instagram 게시 실패: %s", e)
        return None


def post_single_photo(
    access_token: str,
    ig_user_id: str,
    image_url: str,
    caption: str,
) -> Optional[str]:
    """
    인스타그램에 단일 사진을 게시합니다.
    Returns: 게시된 포스트 URL (성공 시), None (실패 시)
    """
    container_id = _create_media_container(access_token, ig_user_id, image_url, caption)
    if not container_id:
        return None

    # 컨테이너 준비 대기 (최대 30초)
    for _ in range(6):
        time.sleep(5)
        status_resp = requests.get(
            f"{GRAPH_BASE}/{container_id}",
            params={"fields": "status_code", "access_token": access_token},
            timeout=10,
        )
        status = status_resp.json().get("status_code", "")
        if status == "FINISHED":
            break
        if status == "ERROR":
            logger.error("Instagram 미디어 컨테이너 처리 오류")
            return None

    post_id = _publish_container(access_token, ig_user_id, container_id)
    if not post_id:
        return None

    return f"https://www.instagram.com/p/{post_id}/"


def post_carousel(
    access_token: str,
    ig_user_id: str,
    image_urls: list[str],
    caption: str,
) -> Optional[str]:
    """
    인스타그램에 여러 사진을 캐러셀로 게시합니다.
    Returns: 게시된 포스트 URL (성공 시), None (실패 시)
    """
    if not image_urls:
        return None

    # 이미지가 1장이면 단일 게시
    if len(image_urls) == 1:
        return post_single_photo(access_token, ig_user_id, image_urls[0], caption)

    # 각 이미지 컨테이너 생성
    child_ids = []
    for url in image_urls[:10]:  # Instagram 최대 10장
        cid = _create_media_container(
            access_token, ig_user_id, url, is_carousel_item=True
        )
        if cid:
            child_ids.append(cid)

    if not child_ids:
        return None

    # 캐러셀 컨테이너 생성
    try:
        resp = requests.post(
            f"{GRAPH_BASE}/{ig_user_id}/media",
            params={
                "media_type": "CAROUSEL",
                "children": ",".join(child_ids),
                "caption": caption,
                "access_token": access_token,
            },
            timeout=30,
        )
        resp.raise_for_status()
        carousel_id = resp.json().get("id")
    except Exception as e:
        logger.exception("Instagram 캐러셀 컨테이너 생성 실패: %s", e)
        return None

    # 준비 대기
    for _ in range(6):
        time.sleep(5)
        status_resp = requests.get(
            f"{GRAPH_BASE}/{carousel_id}",
            params={"fields": "status_code", "access_token": access_token},
            timeout=10,
        )
        status = status_resp.json().get("status_code", "")
        if status == "FINISHED":
            break

    post_id = _publish_container(access_token, ig_user_id, carousel_id)
    if not post_id:
        return None

    return f"https://www.instagram.com/p/{post_id}/"
