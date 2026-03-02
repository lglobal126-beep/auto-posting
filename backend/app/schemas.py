from typing import List, Optional

from pydantic import BaseModel


class DraftCreateRequest(BaseModel):
    image_paths: List[str]
    video_paths: List[str] = []
    receipt_path: Optional[str] = None
    memo: Optional[str] = None
    keywords: Optional[List[str]] = None


class DraftCreateData(BaseModel):
    draft_id: int
    restaurant_name: Optional[str] = None
    blog_title: str
    blog_body: str
    instagram_caption: str
    instagram_hashtags: List[str]


class ApiResponse(BaseModel):
    success: bool
    data: Optional[object]
    error: Optional[dict]


class DraftSummary(BaseModel):
    id: int
    restaurant_name: Optional[str] = None
    created_at: str
    status: str


class MediaItem(BaseModel):
    type: str
    path: str


class DraftDetail(BaseModel):
    id: int
    restaurant_name: Optional[str] = None
    visit_datetime: Optional[str] = None
    blog_title: str
    blog_body: str
    instagram_caption: str
    instagram_hashtags: List[str]
    media: List[MediaItem]


class DraftUpdateRequest(BaseModel):
    blog_title: Optional[str] = None
    blog_body: Optional[str] = None
    instagram_caption: Optional[str] = None
    instagram_hashtags: Optional[List[str]] = None


class PublishRequest(BaseModel):
    draft_id: int
    publish_to_naver: bool = True
    publish_to_instagram: bool = True
    scheduled_at: Optional[str] = None


class PostItem(BaseModel):
    id: int
    draft_id: int
    naver_post_url: Optional[str] = None
    instagram_post_url: Optional[str] = None
    publish_status: str
    published_at: Optional[str] = None

