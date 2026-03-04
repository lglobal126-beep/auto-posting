"""
Supabase DB CRUD 헬퍼
"""
import logging
import os
from typing import Optional

from supabase import create_client, Client

logger = logging.getLogger("database")


def get_supabase() -> Client:
    url = os.getenv("SUPABASE_URL", "")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    return create_client(url, key)


def get_user_id(token: str) -> Optional[str]:
    """Bearer 토큰으로 Supabase user_id를 반환합니다."""
    try:
        sb = get_supabase()
        resp = sb.auth.get_user(token)
        return resp.user.id
    except Exception as e:
        logger.error("get_user_id 실패: %s", e)
        return None


# ─── Drafts ──────────────────────────────────────────────

def create_draft(user_id: str, data: dict) -> Optional[dict]:
    try:
        sb = get_supabase()
        row = {
            "user_id": user_id,
            "restaurant_name": data.get("restaurant_name"),
            "address": data.get("address"),
            "phone": data.get("phone"),
            "receipt_info": data.get("receipt_info"),
            "image_paths": data.get("image_paths", []),
            "video_paths": data.get("video_paths", []),
            "receipt_path": data.get("receipt_path"),
            "blog_title": data.get("blog_title", ""),
            "blog_body": data.get("blog_body", ""),
            "blog_hashtags": data.get("blog_hashtags", []),
            "instagram_caption": data.get("instagram_caption", ""),
            "instagram_hashtags": data.get("instagram_hashtags", []),
            "status": "draft",
        }
        result = sb.table("drafts").insert(row).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        logger.exception("create_draft 실패: %s", e)
        return None


def list_drafts(user_id: str) -> list:
    try:
        sb = get_supabase()
        result = (
            sb.table("drafts")
            .select("id, restaurant_name, blog_title, created_at, status")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
        return result.data or []
    except Exception as e:
        logger.exception("list_drafts 실패: %s", e)
        return []


def get_draft(draft_id: str, user_id: str) -> Optional[dict]:
    try:
        sb = get_supabase()
        result = (
            sb.table("drafts")
            .select("*")
            .eq("id", draft_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        return result.data
    except Exception as e:
        logger.exception("get_draft 실패: %s", e)
        return None


def update_draft(draft_id: str, user_id: str, updates: dict) -> Optional[dict]:
    try:
        sb = get_supabase()
        result = (
            sb.table("drafts")
            .update(updates)
            .eq("id", draft_id)
            .eq("user_id", user_id)
            .execute()
        )
        return result.data[0] if result.data else None
    except Exception as e:
        logger.exception("update_draft 실패: %s", e)
        return None


# ─── Posts ───────────────────────────────────────────────

def create_post(user_id: str, data: dict) -> Optional[dict]:
    try:
        sb = get_supabase()
        row = {
            "user_id": user_id,
            "draft_id": data.get("draft_id"),
            "naver_post_url": data.get("naver_post_url"),
            "instagram_post_url": data.get("instagram_post_url"),
            "publish_status": data.get("publish_status", "success"),
        }
        result = sb.table("posts").insert(row).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        logger.exception("create_post 실패: %s", e)
        return None


def list_posts(user_id: str) -> list:
    try:
        sb = get_supabase()
        result = (
            sb.table("posts")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
        return result.data or []
    except Exception as e:
        logger.exception("list_posts 실패: %s", e)
        return []


# ─── Social Accounts ────────────────────────────────────

def get_social_account(user_id: str, platform: str) -> Optional[dict]:
    try:
        sb = get_supabase()
        result = (
            sb.table("user_social_accounts")
            .select("*")
            .eq("user_id", user_id)
            .eq("platform", platform)
            .execute()
        )
        return result.data[0] if result.data else None
    except Exception as e:
        logger.exception("get_social_account 실패: %s", e)
        return None


def upsert_social_account(user_id: str, platform: str, data: dict) -> Optional[dict]:
    try:
        sb = get_supabase()
        row = {
            "user_id": user_id,
            "platform": platform,
            **data,
        }
        result = (
            sb.table("user_social_accounts")
            .upsert(row, on_conflict="user_id,platform")
            .execute()
        )
        return result.data[0] if result.data else None
    except Exception as e:
        logger.exception("upsert_social_account 실패: %s", e)
        return None


def delete_social_account(user_id: str, platform: str) -> bool:
    try:
        sb = get_supabase()
        sb.table("user_social_accounts").delete().eq("user_id", user_id).eq("platform", platform).execute()
        return True
    except Exception as e:
        logger.exception("delete_social_account 실패: %s", e)
        return False


def get_public_image_url(supabase_url: str, bucket: str, path: str) -> str:
    return f"{supabase_url}/storage/v1/object/public/{bucket}/{path}"
