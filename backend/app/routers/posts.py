import os
from typing import Optional

from fastapi import APIRouter, Header, HTTPException

from app.schemas import ApiResponse, PostItem, PublishRequest
from app.services import database as db
from app.services import instagram as ig

router = APIRouter()


def _require_user(authorization: Optional[str]) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="인증 토큰이 필요합니다.")
    token = authorization.split(" ", 1)[1]
    user_id = db.get_user_id(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다.")
    return user_id


@router.post("/publish", response_model=ApiResponse)
async def publish_draft(
    payload: PublishRequest,
    authorization: Optional[str] = Header(None),
) -> ApiResponse:
    user_id = _require_user(authorization)

    draft = db.get_draft(payload.draft_id, user_id)
    if not draft:
        raise HTTPException(status_code=404, detail="초안을 찾을 수 없습니다.")

    supabase_url = os.getenv("SUPABASE_URL", "")
    naver_url: Optional[str] = None
    instagram_url: Optional[str] = None
    errors = []

    # ── 네이버 블로그: 공식 Write API 미제공 → 복사 안내 ──────
    if payload.publish_to_naver:
        errors.append(
            "네이버 블로그 자동 포스팅은 네이버 공식 API에서 지원하지 않습니다. "
            "위 '전체 복사' 버튼으로 내용을 복사한 후 네이버 블로그 에디터에 붙여넣어 주세요."
        )

    # ── 인스타그램 포스팅 ────────────────────────────────
    if payload.publish_to_instagram:
        ig_account = db.get_social_account(user_id, "instagram")
        if not ig_account:
            errors.append("인스타그램 계정이 연결되지 않았습니다. 계정 연동 후 다시 시도해주세요.")
        else:
            access_token = ig_account.get("access_token", "")
            account_info = ig_account.get("account_info") or {}
            ig_user_id = account_info.get("ig_user_id", "")

            image_paths: list = draft.get("image_paths") or []
            caption = draft.get("instagram_caption", "")
            hashtag_str = " ".join(draft.get("instagram_hashtags") or [])
            full_caption = f"{caption}\n\n{hashtag_str}".strip()

            if image_paths and supabase_url:
                image_urls = [
                    db.get_public_image_url(supabase_url, "media", p)
                    for p in image_paths
                ]
                post_url = ig.post_carousel(access_token, ig_user_id, image_urls, full_caption)
                if post_url:
                    instagram_url = post_url
                else:
                    errors.append("인스타그램 포스팅에 실패했습니다. 이미지 URL이 공개 접근 가능한지 확인해주세요.")
            else:
                errors.append("인스타그램 포스팅에 사진이 필요합니다.")

    # ── DB 저장 ─────────────────────────────────────────
    status = "success" if (naver_url or instagram_url) else "failed"
    post_row = db.create_post(user_id, {
        "draft_id": payload.draft_id,
        "naver_post_url": naver_url,
        "instagram_post_url": instagram_url,
        "publish_status": status,
    })

    post_id = str(post_row["id"]) if post_row else "temp"

    result_data = PostItem(
        id=post_id,
        draft_id=payload.draft_id,
        naver_post_url=naver_url,
        instagram_post_url=instagram_url,
        publish_status=status,
        published_at=post_row.get("created_at") if post_row else None,
    ).model_dump()

    if errors:
        result_data["warnings"] = errors

    return ApiResponse(success=True, data=result_data)


@router.get("", response_model=ApiResponse)
async def list_posts(authorization: Optional[str] = Header(None)) -> ApiResponse:
    user_id = _require_user(authorization)
    rows = db.list_posts(user_id)
    posts = [
        PostItem(
            id=str(r["id"]),
            draft_id=str(r["draft_id"]),
            naver_post_url=r.get("naver_post_url"),
            instagram_post_url=r.get("instagram_post_url"),
            publish_status=r.get("publish_status", ""),
            published_at=r.get("created_at"),
        ).model_dump()
        for r in rows
    ]
    return ApiResponse(success=True, data=posts)
