from datetime import datetime
from typing import List

from fastapi import APIRouter

from app.schemas import ApiResponse, PostItem, PublishRequest

router = APIRouter()


@router.post("/publish", response_model=ApiResponse)
async def publish_draft(payload: PublishRequest) -> ApiResponse:
    # TODO: 네이버/인스타 API 호출 및 상태 저장
    dummy_post = PostItem(
        id=10,
        draft_id=payload.draft_id,
        naver_post_url="https://blog.naver.com/.../12345",
        instagram_post_url="https://www.instagram.com/p/XXXX/",
        publish_status="success",
        published_at=datetime.utcnow().isoformat() + "Z",
    )
    return ApiResponse(success=True, data=dummy_post, error=None)


@router.get("", response_model=ApiResponse)
async def list_posts() -> ApiResponse:
    # TODO: Supabase에서 실제 발행 포스트 목록 조회
    posts: List[PostItem] = [
        PostItem(
            id=10,
            draft_id=1,
            naver_post_url="https://blog.naver.com/.../12345",
            instagram_post_url="https://www.instagram.com/p/XXXX/",
            publish_status="success",
            published_at=datetime.utcnow().isoformat() + "Z",
        )
    ]
    return ApiResponse(success=True, data=posts, error=None)

