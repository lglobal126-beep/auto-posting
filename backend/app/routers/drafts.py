import os
import time
from typing import Optional

from fastapi import APIRouter, Header, HTTPException

from app.schemas import (
    ApiResponse,
    DraftCreateData,
    DraftCreateRequest,
    DraftDetail,
    DraftSummary,
    DraftUpdateRequest,
    ReceiptInfo,
)
from app.services import database as db
from app.services.receipt_analyzer import (
    download_from_supabase_and_analyze,
    analyze_food_photos_from_supabase,
)
from app.services.llm import generate_post_from_context

router = APIRouter()


def _require_user(authorization: Optional[str]) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="인증 토큰이 필요합니다.")
    token = authorization.split(" ", 1)[1]
    user_id = db.get_user_id(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다.")
    return user_id


@router.post("", response_model=ApiResponse)
async def create_draft(
    payload: DraftCreateRequest,
    authorization: Optional[str] = Header(None),
) -> ApiResponse:
    user_id = _require_user(authorization)

    llm_api_url = os.getenv("LLM_API_URL", "")
    llm_api_key = os.getenv("LLM_API_KEY", "")
    supabase_url = os.getenv("SUPABASE_URL", "")

    supabase_client = db.get_supabase()

    # 1) 영수증 Gemini Vision OCR
    receipt_data: dict = {}
    if payload.receipt_path:
        receipt_data = download_from_supabase_and_analyze(
            supabase_client=supabase_client,
            bucket="media",
            path=payload.receipt_path,
            api_key=llm_api_key,
            api_url=llm_api_url,
        )

    # 2) 음식 사진별 상세 설명 (영수증 제외한 image_paths만)
    # 영수증 OCR 이후 RPM 제한 대응 딜레이
    if payload.receipt_path and payload.image_paths:
        interval = float(os.getenv("GEMINI_CALL_INTERVAL", "13"))
        time.sleep(interval)

    food_photo_results = []
    if payload.image_paths:
        food_photo_results = analyze_food_photos_from_supabase(
            supabase_client=supabase_client,
            bucket="media",
            paths=payload.image_paths,
            api_key=llm_api_key,
            api_url=llm_api_url,
        )
    food_descriptions = [r["description"] for r in food_photo_results]

    restaurant_name = receipt_data.get("restaurant_name") or None
    address = receipt_data.get("address") or None
    phone = receipt_data.get("phone") or None
    menu_items = receipt_data.get("menu_items") or []
    total_amount = receipt_data.get("total_amount") or None
    receipt_info = ReceiptInfo(
        restaurant_name=restaurant_name,
        address=address,
        phone=phone,
        menu_items=menu_items,
        total_amount=total_amount,
        visit_date=receipt_data.get("visit_date"),
    ) if receipt_data else None

    # 3) LLM 호출 전 딜레이 (마지막 사진 분석 후 RPM 대응)
    if payload.image_paths or payload.receipt_path:
        interval = float(os.getenv("GEMINI_CALL_INTERVAL", "13"))
        time.sleep(interval)

    # 4) LLM 호출 (음식 사진 설명 포함)
    llm_result = generate_post_from_context(
        llm_api_url=llm_api_url,
        llm_api_key=llm_api_key,
        restaurant_name=restaurant_name,
        address=address,
        phone=phone,
        menu_items=menu_items,
        total_amount=total_amount,
        user_memo=payload.memo,
        keywords=payload.keywords,
        food_descriptions=food_descriptions,
    )

    # 5) DB 저장
    row = db.create_draft(user_id, {
        "restaurant_name": restaurant_name,
        "address": address,
        "phone": phone,
        "receipt_info": receipt_data or None,
        "image_paths": payload.image_paths,
        "video_paths": payload.video_paths,
        "receipt_path": payload.receipt_path,
        "blog_title": llm_result["blog_title"],
        "blog_body": llm_result["blog_body"],
        "blog_hashtags": llm_result["blog_hashtags"],
        "instagram_caption": llm_result["instagram_caption"],
        "instagram_hashtags": llm_result["instagram_hashtags"],
    })

    draft_id = str(row["id"]) if row else "temp"

    data = DraftCreateData(
        draft_id=draft_id,
        restaurant_name=restaurant_name,
        address=address,
        receipt_info=receipt_info,
        blog_title=llm_result["blog_title"],
        blog_body=llm_result["blog_body"],
        blog_hashtags=llm_result.get("blog_hashtags", []),
        instagram_caption=llm_result["instagram_caption"],
        instagram_hashtags=llm_result["instagram_hashtags"],
    )
    return ApiResponse(success=True, data=data.model_dump())


@router.get("", response_model=ApiResponse)
async def list_drafts(authorization: Optional[str] = Header(None)) -> ApiResponse:
    user_id = _require_user(authorization)
    rows = db.list_drafts(user_id)
    summaries = [
        DraftSummary(
            id=str(r["id"]),
            restaurant_name=r.get("restaurant_name"),
            blog_title=r.get("blog_title"),
            created_at=r.get("created_at", ""),
            status=r.get("status", "draft"),
        ).model_dump()
        for r in rows
    ]
    return ApiResponse(success=True, data=summaries)


@router.get("/{draft_id}", response_model=ApiResponse)
async def get_draft(
    draft_id: str,
    authorization: Optional[str] = Header(None),
) -> ApiResponse:
    user_id = _require_user(authorization)
    row = db.get_draft(draft_id, user_id)
    if not row:
        raise HTTPException(status_code=404, detail="초안을 찾을 수 없습니다.")

    receipt_info = None
    if row.get("receipt_info"):
        ri = row["receipt_info"]
        receipt_info = ReceiptInfo(
            restaurant_name=ri.get("restaurant_name"),
            address=ri.get("address"),
            phone=ri.get("phone"),
            menu_items=ri.get("menu_items"),
            total_amount=ri.get("total_amount"),
            visit_date=ri.get("visit_date"),
        )

    detail = DraftDetail(
        id=str(row["id"]),
        restaurant_name=row.get("restaurant_name"),
        address=row.get("address"),
        receipt_info=receipt_info,
        visit_datetime=row.get("created_at"),
        blog_title=row.get("blog_title", ""),
        blog_body=row.get("blog_body", ""),
        blog_hashtags=row.get("blog_hashtags") or [],
        instagram_caption=row.get("instagram_caption", ""),
        instagram_hashtags=row.get("instagram_hashtags") or [],
        image_paths=row.get("image_paths") or [],
        video_paths=row.get("video_paths") or [],
    )
    return ApiResponse(success=True, data=detail.model_dump())


@router.patch("/{draft_id}", response_model=ApiResponse)
async def update_draft(
    draft_id: str,
    payload: DraftUpdateRequest,
    authorization: Optional[str] = Header(None),
) -> ApiResponse:
    user_id = _require_user(authorization)
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="수정할 내용이 없습니다.")
    updated = db.update_draft(draft_id, user_id, updates)
    if not updated:
        raise HTTPException(status_code=404, detail="초안을 찾을 수 없습니다.")
    return ApiResponse(success=True, data={"id": draft_id})
