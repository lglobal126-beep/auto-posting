"""
네이버 블로그 OAuth 및 포스팅 API
"""
import logging
import os
import secrets
from typing import Optional

import requests

logger = logging.getLogger("naver_blog")

NAVER_AUTH_URL = "https://nid.naver.com/oauth2.0/authorize"
NAVER_TOKEN_URL = "https://nid.naver.com/oauth2.0/token"
NAVER_PROFILE_URL = "https://openapi.naver.com/v1/nid/me"
NAVER_BLOG_WRITE_URL = "https://openapi.naver.com/blog/writePost.json"


def get_auth_url(client_id: str, redirect_uri: str) -> tuple[str, str]:
    """Naver OAuth 인증 URL과 state를 반환합니다."""
    state = secrets.token_hex(16)
    params = (
        f"?response_type=code"
        f"&client_id={client_id}"
        f"&redirect_uri={redirect_uri}"
        f"&state={state}"
    )
    return NAVER_AUTH_URL + params, state


def exchange_code_for_token(
    code: str,
    state: str,
    client_id: str,
    client_secret: str,
    redirect_uri: str,
) -> Optional[dict]:
    """
    인증 코드를 access_token/refresh_token으로 교환합니다.
    """
    params = {
        "grant_type": "authorization_code",
        "client_id": client_id,
        "client_secret": client_secret,
        "code": code,
        "state": state,
    }
    try:
        resp = requests.get(NAVER_TOKEN_URL, params=params, timeout=15)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        logger.exception("네이버 토큰 교환 실패: %s", e)
        return None


def get_user_info(access_token: str) -> Optional[dict]:
    """네이버 사용자 정보를 가져옵니다."""
    try:
        resp = requests.get(
            NAVER_PROFILE_URL,
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10,
        )
        resp.raise_for_status()
        return resp.json().get("response", {})
    except Exception as e:
        logger.exception("네이버 사용자 정보 조회 실패: %s", e)
        return None


def blog_body_to_html(blog_body: str) -> str:
    """블로그 본문 텍스트를 HTML로 변환합니다."""
    paragraphs = blog_body.split("\n\n")
    html_parts = []
    for para in paragraphs:
        para = para.strip()
        if not para:
            continue
        lines = para.replace("\n", "<br>")
        html_parts.append(f"<p>{lines}</p>")
    return "\n".join(html_parts)


def write_blog_post(
    access_token: str,
    title: str,
    blog_body: str,
    hashtags: list[str],
) -> Optional[str]:
    """
    네이버 블로그에 포스팅합니다.
    Returns: 작성된 포스트 URL (성공 시), None (실패 시)
    """
    content_html = blog_body_to_html(blog_body)
    tag_str = ",".join(t.lstrip("#") for t in hashtags[:20])

    data = {
        "title": title,
        "content": content_html,
        "tag": tag_str,
    }

    try:
        resp = requests.post(
            NAVER_BLOG_WRITE_URL,
            data=data,
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            },
            timeout=30,
        )
        resp.raise_for_status()
        result = resp.json()
        logger.info("네이버 블로그 포스팅 결과: %s", result)
        # 성공 시 resultcode == "00"
        if result.get("resultcode") == "00":
            return result.get("message", "포스팅 완료")
        logger.error("네이버 블로그 포스팅 실패 응답: %s", result)
        return None
    except Exception as e:
        logger.exception("네이버 블로그 포스팅 오류: %s", e)
        return None


def refresh_access_token(
    refresh_token: str,
    client_id: str,
    client_secret: str,
) -> Optional[dict]:
    """Refresh token으로 access token을 갱신합니다."""
    params = {
        "grant_type": "refresh_token",
        "client_id": client_id,
        "client_secret": client_secret,
        "refresh_token": refresh_token,
    }
    try:
        resp = requests.get(NAVER_TOKEN_URL, params=params, timeout=15)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        logger.exception("네이버 토큰 갱신 실패: %s", e)
        return None
