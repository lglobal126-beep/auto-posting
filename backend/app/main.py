from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import drafts, posts, auth, shorts


def create_app() -> FastAPI:
    app = FastAPI(
        title="맛집 인플루언서 자동 포스팅 API",
        version="0.2.0",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "https://auto-posting-sigma.vercel.app",
            "http://localhost:3000",
        ],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "Accept", "Origin"],
    )

    @app.get("/health")
    async def health_check():
        return {"success": True, "data": {"status": "ok"}, "error": None}

    app.include_router(drafts.router, prefix="/drafts", tags=["drafts"])
    app.include_router(posts.router, prefix="/posts", tags=["posts"])
    app.include_router(auth.router, prefix="/auth", tags=["auth"])
    app.include_router(shorts.router, prefix="/shorts", tags=["shorts"])

    return app


app = create_app()
