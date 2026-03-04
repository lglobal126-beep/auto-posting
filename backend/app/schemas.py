from typing import List, Optional, Any
from pydantic import BaseModel


class ReceiptInfo(BaseModel):
    restaurant_name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    menu_items: Optional[List[dict]] = None  # [{"name": "...", "price": "..."}]
    total_amount: Optional[str] = None
    visit_date: Optional[str] = None


class DraftCreateRequest(BaseModel):
    image_paths: List[str]
    video_paths: List[str] = []
    receipt_path: Optional[str] = None
    memo: Optional[str] = None
    keywords: Optional[List[str]] = None


class DraftCreateData(BaseModel):
    draft_id: str
    restaurant_name: Optional[str] = None
    address: Optional[str] = None
    receipt_info: Optional[ReceiptInfo] = None
    blog_title: str
    blog_body: str
    blog_hashtags: List[str]
    instagram_caption: str
    instagram_hashtags: List[str]


class ApiResponse(BaseModel):
    success: bool
    data: Optional[Any] = None
    error: Optional[dict] = None


class DraftSummary(BaseModel):
    id: str
    restaurant_name: Optional[str] = None
    blog_title: Optional[str] = None
    created_at: str
    status: str


class MediaItem(BaseModel):
    type: str
    path: str


class DraftDetail(BaseModel):
    id: str
    restaurant_name: Optional[str] = None
    address: Optional[str] = None
    receipt_info: Optional[ReceiptInfo] = None
    visit_datetime: Optional[str] = None
    blog_title: str
    blog_body: str
    blog_hashtags: List[str]
    instagram_caption: str
    instagram_hashtags: List[str]
    image_paths: Optional[List[str]] = []
    video_paths: Optional[List[str]] = []


class DraftUpdateRequest(BaseModel):
    blog_title: Optional[str] = None
    blog_body: Optional[str] = None
    blog_hashtags: Optional[List[str]] = None
    instagram_caption: Optional[str] = None
    instagram_hashtags: Optional[List[str]] = None


class PublishRequest(BaseModel):
    draft_id: str
    publish_to_naver: bool = True
    publish_to_instagram: bool = True
    scheduled_at: Optional[str] = None


class PostItem(BaseModel):
    id: str
    draft_id: str
    naver_post_url: Optional[str] = None
    instagram_post_url: Optional[str] = None
    publish_status: str
    published_at: Optional[str] = None


class SocialAccountInfo(BaseModel):
    platform: str
    connected: bool
    account_name: Optional[str] = None
    expires_at: Optional[str] = None


class InstagramConnectRequest(BaseModel):
    access_token: str
    ig_user_id: str


class NaverAuthUrlResponse(BaseModel):
    auth_url: str
    state: str
