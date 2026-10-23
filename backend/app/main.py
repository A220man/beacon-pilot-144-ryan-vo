from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.core.config import settings
from app.core.database import db
from app.api import health, auth, skills, evaluations, capsules

def create_app() -> FastAPI:
    app = FastAPI(
        title="Beacon Pilot",
        description="Production-grade skill evaluation and drift detection for AI coding agents",
        version="1.0.0",
        docs_url="/docs" if settings.app_env == "development" else None,
        redoc_url="/redoc" if settings.app_env == "development" else None,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.frontend_url],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Session middleware
    app.add_middleware(
        SessionMiddleware,
        secret_key=settings.session_secret,
        max_age=86400,
        same_site="lax",
        https_only=settings.session_cookie_secure,
    )

    @app.on_event("startup")
    async def startup():
        await db.create_tables()

    @app.on_event("shutdown")
    async def shutdown():
        await db.close()

    # Routers
    app.include_router(health.router, tags=["health"])
    app.include_router(auth.router, prefix="/auth", tags=["auth"])
    app.include_router(skills.router, prefix="/api/skills", tags=["skills"])
    app.include_router(evaluations.router, prefix="/api/evaluations", tags=["evaluations"])
    app.include_router(capsules.router, prefix="/api/capsules", tags=["capsules"])

    return app


app = create_app()