from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

def create_app() -> FastAPI:
    app = FastAPI(
        title="맛집 인플루언서 자동 포스팅 API",
        version="0.1.0",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "https://auto-posting-sigma.vercel.app"
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # 라이프 체크
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