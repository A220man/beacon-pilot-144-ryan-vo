import pytest
from httpx import AsyncClient
from sqlalchemy import select
from jose import jwt

from app.models import User, Role
from app.core.auth import create_session_cookie
from app.core.config import settings


@pytest.mark.asyncio
async def test_login_returns_auth_url(client: AsyncClient):
    response = await client.get("/auth/login")
    assert response.status_code == 200
    data = response.json()
    assert "auth_url" in data
    assert "state" in data
    assert "nonce" in data
    assert data["auth_url"].startswith("http")


@pytest.mark.asyncio
async def test_me_unauthenticated(client: AsyncClient):
    response = await client.get("/auth/me")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_logout(client: AsyncClient):
    response = await client.post("/auth/logout")
    assert response.status_code == 200
    assert "message" in response.json()



def create_test_token(user: User) -> str:
    import time
    payload = {
        "sub": str(user.id),
        "username": user.username,
        "role": user.role.value,
        "exp": int(time.time()) + 86400,
        "iat": int(time.time()),
    }
    return jwt.encode(payload, settings.session_secret, algorithm="HS256")