"""
소셜 계정 연동 (네이버 OAuth, 인스타그램 토큰) 라우터
"""
import os
from typing import Optional

from fastapi import APIRouter, Header, HTTPException
from fastapi.responses import RedirectResponse

from app.schemas import ApiResponse, InstagramConnectRequest, NaverAuthUrlResponse, SocialAccountInfo
from app.services import database as db
from app.services import naver_blog, instagram as ig

router = APIRouter()


def _require_user(authorization: Optional[str]) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="인증 토큰이 필요합니다.")
    token = authorization.split(" ", 1)[1]
    user_id = db.get_user_id(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다.")
    return user_id


# ─── 연동 상태 조회 ──────────────────────────────────────

@router.get("/status", response_model=ApiResponse)
async def get_connect_status(authorization: Optional[str] = Header(None)):
    user_id = _require_user(authorization)

    accounts = []
    for platform in ("naver", "instagram"):
        row = db.get_social_account(user_id, platform)
        if row:
            info = row.get("account_info") or {}
            accounts.append(SocialAccountInfo(
                platform=platform,
                connected=True,
                account_name=info.get("nickname") or info.get("username"),
                expires_at=row.get("expires_at"),
            ).model_dump())
        else:
            accounts.append(SocialAccountInfo(platform=platform, connected=False).model_dump())

    return ApiResponse(success=True, data=accounts)


# ─── 네이버 OAuth ────────────────────────────────────────

@router.get("/naver/url", response_model=ApiResponse)
async def get_naver_auth_url(authorization: Optional[str] = Header(None)):
    _require_user(authorization)

    client_id = os.getenv("NAVER_CLIENT_ID", "")
    redirect_uri = os.getenv("NAVER_REDIRECT_URI", "")
    if not client_id or not redirect_uri:
        raise HTTPException(status_code=500, detail="NAVER_CLIENT_ID / NAVER_REDIRECT_URI 환경변수를 설정해주세요.")

    auth_url, state = naver_blog.get_auth_url(client_id, redirect_uri)
    return ApiResponse(
        success=True,
        data=NaverAuthUrlResponse(auth_url=auth_url, state=state).model_dump(),
    )


@router.get("/naver/callback")
async def naver_callback(code: str, state: str):
    """
    네이버가 리다이렉트하는 콜백 엔드포인트.
    토큰 교환 후 프론트엔드 /connect 페이지로 리다이렉트합니다.
    이 엔드포인트는 사용자 인증 없이 동작하지 않으므로,
    실제로는 state에 user_id를 포함시켜야 합니다.
    (간단 구현: state="{user_id}:{random}")
    """
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    client_id = os.getenv("NAVER_CLIENT_ID", "")
    client_secret = os.getenv("NAVER_CLIENT_SECRET", "")
    redirect_uri = os.getenv("NAVER_REDIRECT_URI", "")

    # state에서 user_id 추출 (형식: "userid_hex:randomhex")
    parts = state.split(":", 1)
    user_id = parts[0] if len(parts) == 2 else None

    token_data = naver_blog.exchange_code_for_token(code, state, client_id, client_secret, redirect_uri)
    if not token_data or not token_data.get("access_token"):
        return RedirectResponse(f"{frontend_url}/connect?error=naver_token_failed")

    access_token = token_data["access_token"]
    user_info = naver_blog.get_user_info(access_token)

    if user_id:
        db.upsert_social_account(user_id, "naver", {
            "access_token": access_token,
            "refresh_token": token_data.get("refresh_token"),
            "account_info": user_info or {},
        })

    return RedirectResponse(f"{frontend_url}/connect?success=naver")


@router.post("/naver/callback-token", response_model=ApiResponse)
async def naver_callback_with_token(
    payload: dict,
    authorization: Optional[str] = Header(None),
):
    """
    프론트엔드에서 code를 받아 백엔드로 보내는 방식 (SPA 친화적)
    """
    user_id = _require_user(authorization)
    code = payload.get("code", "")
    state = payload.get("state", "")

    client_id = os.getenv("NAVER_CLIENT_ID", "")
    client_secret = os.getenv("NAVER_CLIENT_SECRET", "")
    redirect_uri = os.getenv("NAVER_REDIRECT_URI", "")

    token_data = naver_blog.exchange_code_for_token(code, state, client_id, client_secret, redirect_uri)
    if not token_data or not token_data.get("access_token"):
        raise HTTPException(status_code=400, detail="네이버 토큰 교환에 실패했습니다.")

    access_token = token_data["access_token"]
    user_info = naver_blog.get_user_info(access_token)

    db.upsert_social_account(user_id, "naver", {
        "access_token": access_token,
        "refresh_token": token_data.get("refresh_token"),
        "account_info": user_info or {},
    })

    return ApiResponse(success=True, data={"account_name": (user_info or {}).get("nickname")})


@router.delete("/naver", response_model=ApiResponse)
async def disconnect_naver(authorization: Optional[str] = Header(None)):
    user_id = _require_user(authorization)
    db.delete_social_account(user_id, "naver")
    return ApiResponse(success=True, data={"message": "네이버 연결이 해제되었습니다."})


# ─── 인스타그램 ──────────────────────────────────────────

@router.post("/instagram", response_model=ApiResponse)
async def connect_instagram(
    payload: InstagramConnectRequest,
    authorization: Optional[str] = Header(None),
):
    """사용자가 직접 입력한 Instagram 액세스 토큰을 저장합니다."""
    user_id = _require_user(authorization)

    user_info = ig.verify_token(payload.access_token, payload.ig_user_id)
    if not user_info:
        raise HTTPException(status_code=400, detail="Instagram 토큰 검증에 실패했습니다. 토큰과 사용자 ID를 확인해주세요.")

    db.upsert_social_account(user_id, "instagram", {
        "access_token": payload.access_token,
        "account_info": {
            "ig_user_id": payload.ig_user_id,
            "username": user_info.get("username"),
            "account_type": user_info.get("account_type"),
        },
    })

    return ApiResponse(success=True, data={"username": user_info.get("username")})


@router.delete("/instagram", response_model=ApiResponse)
async def disconnect_instagram(authorization: Optional[str] = Header(None)):
    user_id = _require_user(authorization)
    db.delete_social_account(user_id, "instagram")
    return ApiResponse(success=True, data={"message": "인스타그램 연결이 해제되었습니다."})
