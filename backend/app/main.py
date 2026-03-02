from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import drafts, posts


def create_app() -> FastAPI:
    app = FastAPI(
        title="맛집 인플루언서 자동 포스팅 API",
        version="0.1.0",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # 개발 및 소규모 개인용 → 전부 허용
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health")
    async def health_check():
        return {
            "success": True,
            "data": {"status": "ok"},
            "error": None,
        }

    app.include_router(drafts.router, prefix="/drafts", tags=["drafts"])
    app.include_router(posts.router, prefix="/posts", tags=["posts"])

    return app


app = create_app()