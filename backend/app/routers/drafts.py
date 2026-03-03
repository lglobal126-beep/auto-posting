from datetime import datetime
from typing import List
import os

from fastapi import APIRouter

from app.schemas import (
    ApiResponse,
    DraftCreateData,
    DraftCreateRequest,
    DraftDetail,
    DraftSummary,
    DraftUpdateRequest,
    MediaItem,
)
from app.services.ocr import extract_restaurant_name, extract_text_from_receipt
from app.services.naver_search import fetch_naver_reviews
from app.services.llm import generate_post_from_context

router = APIRouter()


@router.post("", response_model=ApiResponse)
async def create_draft(payload: DraftCreateRequest) -> ApiResponse:
    # 1) 영수증 OCR로 상호명 추출 (receipt_path가 있는 경우)
    ocr_text = ""
    restaurant_name = None
    if payload.receipt_path:
        # 실제 서비스에서는 Supabase Storage에서 파일을 다운로드한 후
        # 로컬 임시 경로를 넘겨야 합니다. 현재는 예시로만 남깁니다.
        try:
            ocr_text = extract_text_from_receipt(payload.receipt_path)
            restaurant_name = extract_restaurant_name(ocr_text)
        except Exception:
            ocr_text = ""

    # 2) 네이버 리뷰 텍스트 수집 (상호명이 있는 경우)
    naver_reviews: List[str] = []
    if restaurant_name:
        naver_reviews = fetch_naver_reviews(restaurant_name)

    # 3) LLM 호출로 블로그/인스타 텍스트 생성
    llm_api_url = os.getenv("LLM_API_URL", "")
    llm_api_key = os.getenv("LLM_API_KEY", "")
    llm_result = generate_post_from_context(
        llm_api_url=llm_api_url,
        llm_api_key=llm_api_key,
        restaurant_name=restaurant_name,
        ocr_text=ocr_text,
        naver_reviews=naver_reviews,
        user_memo=payload.memo,
        keywords=payload.keywords,
    )

    data = DraftCreateData(
        draft_id=1,  # TODO: Supabase에 저장 후 실제 ID 사용
        restaurant_name=restaurant_name,
        blog_title=llm_result["blog_title"],
        blog_body=llm_result["blog_body"],
        blog_hashtags=llm_result.get("blog_hashtags", []),
        instagram_caption=llm_result["instagram_caption"],
        instagram_hashtags=llm_result["instagram_hashtags"],
    )
    return ApiResponse(success=True, data=data, error=None)


@router.get("", response_model=ApiResponse)
async def list_drafts() -> ApiResponse:
    # TODO: Supabase에서 실제 목록 조회
    summaries: List[DraftSummary] = [
        DraftSummary(
            id=1,
            restaurant_name="예시식당",
            created_at=datetime.utcnow().isoformat() + "Z",
            status="draft",
        )
    ]
    return ApiResponse(success=True, data=summaries, error=None)


@router.get("/{draft_id}", response_model=ApiResponse)
async def get_draft(draft_id: int) -> ApiResponse:
    # TODO: Supabase에서 실제 상세 조회
    detail = DraftDetail(
        id=draft_id,
        restaurant_name="예시식당",
        visit_datetime=datetime.utcnow().isoformat() + "Z",
        blog_title="예시 제목",
        blog_body="예시 본문입니다.",
        blog_hashtags=["#예시", "#해시태그"],
        instagram_caption="예시 인스타 캡션입니다.",
        instagram_hashtags=["#예시", "#해시태그"],
        media=[
            MediaItem(type="image", path="public/user1/img1.jpg"),
            MediaItem(type="receipt", path="public/user1/receipt1.jpg"),
        ],
    )
    return ApiResponse(success=True, data=detail, error=None)


@router.patch("/{draft_id}", response_model=ApiResponse)
async def update_draft(draft_id: int, payload: DraftUpdateRequest) -> ApiResponse:
    # TODO: Supabase에서 실제 업데이트
    updated = {"id": draft_id, "updated_at": datetime.utcnow().isoformat() + "Z"}
    return ApiResponse(success=True, data=updated, error=None)

