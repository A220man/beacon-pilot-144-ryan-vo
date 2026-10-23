import hashlib
import json
import secrets
from datetime import datetime, timezone
from typing import Optional
from urllib.parse import urlencode

import httpx
from fastapi import Depends, HTTPException, Request, Response, status
from fastapi.security import HTTPBearer
from jose import jwt
from jose.exceptions import JWTError
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.models import Role, User


security = HTTPBearer(auto_error=False)


class TokenData(BaseModel):
    sub: str
    preferred_username: str
    email: str
    roles: list[str]
    exp: int


class OIDCConfig(BaseModel):
    issuer: str
    authorization_endpoint: str
    token_endpoint: str
    jwks_uri: str
    userinfo_endpoint: str
    end_session_endpoint: str


_oidc_config_cache: Optional[OIDCConfig] = None


async def get_oidc_config() -> OIDCConfig:
    global _oidc_config_cache
    if _oidc_config_cache is not None:
        return _oidc_config_cache

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(settings.oidc_discovery_url)
        resp.raise_for_status()
        data = resp.json()
        _oidc_config_cache = OIDCConfig(**data)
        return _oidc_config_cache


def generate_pkce_pair() -> tuple[str, str]:
    """Generate PKCE code_verifier and code_challenge (S256)."""
    code_verifier = secrets.token_urlsafe(32)
    code_challenge = hashlib.sha256(code_verifier.encode()).digest()
    code_challenge = (
        hashlib.sha256(code_verifier.encode()).digest()
    )
    import base64
    code_challenge_b64 = base64.urlsafe_b64encode(code_challenge).decode().rstrip("=")
    return code_verifier, code_challenge_b64


def build_auth_url(code_challenge: str, state: str, nonce: str) -> str:
    oidc_config = OIDCConfig(
        issuer=settings.oidc_issuer,
        authorization_endpoint=f"{settings.oidc_issuer}/protocol/openid-connect/auth",
        token_endpoint=f"{settings.oidc_issuer}/protocol/openid-connect/token",
        jwks_uri=f"{settings.oidc_issuer}/protocol/openid-connect/certs",
        userinfo_endpoint=f"{settings.oidc_issuer}/protocol/openid-connect/userinfo",
        end_session_endpoint=f"{settings.oidc_issuer}/protocol/openid-connect/logout",
    )
    params = {
        "client_id": settings.oidc_client_id,
        "redirect_uri": settings.oidc_redirect_uri,
        "response_type": "code",
        "scope": settings.oidc_scopes,
        "code_challenge": code_challenge,
        "code_challenge_method": "S256",
        "state": state,
        "nonce": nonce,
    }
    return f"{oidc_config.authorization_endpoint}?{urlencode(params)}"


async def exchange_code_for_tokens(code: str, code_verifier: str) -> dict:
    async with httpx.AsyncClient(timeout=10.0) as client:
        data = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": settings.oidc_redirect_uri,
            "client_id": settings.oidc_client_id,
            "code_verifier": code_verifier,
        }
        if settings.keycloak_client_secret:
            data["client_secret"] = settings.keycloak_client_secret

        resp = await client.post(
            f"{settings.oidc_issuer}/protocol/openid-connect/token",
            data=data,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        resp.raise_for_status()
        return resp.json()


async def validate_token(token: str) -> TokenData:
    """Validate JWT token using JWKS from Keycloak."""
    oidc_config = await get_oidc_config()

    async with httpx.AsyncClient(timeout=10.0) as client:
        jwks_resp = await client.get(oidc_config.jwks_uri)
        jwks_resp.raise_for_status()
        jwks = jwks_resp.json()

    # Get key ID from token header
    unverified_header = jwt.get_unverified_header(token)
    kid = unverified_header.get("kid")
    if not kid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token missing kid")

    # Find matching key
    key = None
    for k in jwks.get("keys", []):
        if k.get("kid") == kid:
            key = k
            break

    if not key:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unable to find matching key")

    # Verify token
    try:
        payload = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            audience=settings.oidc_client_id,
            issuer=settings.oidc_issuer,
            options={"verify_at_hash": False},
        )
    except JWTError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Token validation failed: {e}")

    return TokenData(**payload)


async def get_current_user(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
    token: Optional[str] = Depends(security),
) -> User:
    """Get current user from session cookie or bearer token."""
    session_token = request.cookies.get(settings.session_cookie_name)

    if session_token:
        # Validate session token (simplified: decode as JWT)
        try:
            payload = jwt.decode(
                session_token,
                settings.session_secret,
                algorithms=["HS256"],
            )
            user_id = payload.get("sub")
            if user_id:
                result = await db.execute(select(User).where(User.id == int(user_id)))
                user = result.scalar_one_or_none()
                if user:
                    return user
        except JWTError:
            pass

    # Fallback: bearer token (for API clients)
    if token and token.credentials:
        token_data = await validate_token(token.credentials)
        result = await db.execute(select(User).where(User.keycloak_sub == token_data.sub))
        user = result.scalar_one_or_none()
        if user:
            return user

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")


def require_role(*allowed_roles: Role):
    async def role_checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role {user.role} not authorized. Required: {[r.value for r in allowed_roles]}",
            )
        return user
    return role_checker


def create_session_cookie(user: User, response: Response) -> None:
    """Create HttpOnly session cookie for user."""
    import time
    payload = {
        "sub": str(user.id),
        "username": user.username,
        "role": user.role.value,
        "exp": int(time.time()) + 86400,  # 24 hours
        "iat": int(time.time()),
    }
    token = jwt.encode(payload, settings.session_secret, algorithm="HS256")
    response.set_cookie(
        key=settings.session_cookie_name,
        value=token,
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite=settings.session_cookie_samesite,
        max_age=86400,
        path="/",
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(
        key=settings.session_cookie_name,
        path="/",
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite=settings.session_cookie_samesite,
    )