import secrets
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import (
    build_auth_url,
    clear_session_cookie,
    create_session_cookie,
    exchange_code_for_tokens,
    generate_pkce_pair,
    get_current_user,
    require_role,
    validate_token,
)
from app.core.auth import OIDCConfig as AuthOIDCConfig
from app.core.auth import get_oidc_config
from app.core.config import settings
from app.core.database import get_db
from app.models import Role, User


router = APIRouter()


class AuthUrlResponse(BaseModel):
    auth_url: str
    state: str
    nonce: str


class CallbackRequest(BaseModel):
    code: str
    state: str


class UserResponse(BaseModel):
    id: int
    keycloak_sub: str
    username: str
    email: str
    first_name: str | None
    last_name: str | None
    role: str
    created_at: datetime


@router.get("/login", response_model=AuthUrlResponse)
async def login(request: Request):
    """Initiate OIDC login with PKCE."""
    code_verifier, code_challenge = generate_pkce_pair()
    state = secrets.token_urlsafe(16)
    nonce = secrets.token_urlsafe(16)

    # Store PKCE verifier and state in request.state
    if not hasattr(request.state, "session_data"):
        request.state.session_data = {}
    request.state.session_data["pkce_verifier"] = code_verifier
    request.state.session_data["oauth_state"] = state
    request.state.session_data["oauth_nonce"] = nonce

    auth_url = build_auth_url(code_challenge, state, nonce)
    return AuthUrlResponse(auth_url=auth_url, state=state, nonce=nonce)


@router.get("/callback")
async def callback(
    request: Request,
    response: Response,
    code: str,
    state: str,
    db: AsyncSession = Depends(get_db),
):
    """Handle OIDC callback and create session."""
    # Verify state
    stored_state = getattr(request.state, "session_data", {}).get("oauth_state")
    if not stored_state or stored_state != state:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid state")

    code_verifier = getattr(request.state, "session_data", {}).get("pkce_verifier")
    if not code_verifier:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing PKCE verifier")

    # Exchange code for tokens
    tokens = await exchange_code_for_tokens(code, code_verifier)

    # Validate ID token
    id_token = tokens.get("id_token")
    if not id_token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No ID token")

    token_data = await validate_token(id_token)

    # Get or create user
    result = await db.execute(select(User).where(User.keycloak_sub == token_data.sub))
    user = result.scalar_one_or_none()

    if not user:
        # Determine role from token claims
        role_map = {"admin": Role.ADMIN, "operator": Role.OPERATOR}
        role = Role.VIEWER
        for r in token_data.roles:
            if r in role_map:
                role = role_map[r]
                break

        user = User(
            keycloak_sub=token_data.sub,
            username=token_data.preferred_username,
            email=token_data.email,
            role=role,
        )
        db.add(user)
        await db.flush()
    else:
        # Update user info
        user.username = token_data.preferred_username
        user.email = token_data.email
        user.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(user)

    # Create session cookie
    create_session_cookie(user, response)

    # Redirect to frontend
    return RedirectResponse(url=f"{settings.frontend_url}/dashboard", status_code=status.HTTP_302_FOUND)


@router.post("/logout")
async def logout(response: Response):
    clear_session_cookie(response)
    return {"message": "Logged out"}


@router.get("/me", response_model=UserResponse)
async def me(user: User = Depends(get_current_user)):
    return UserResponse(
        id=user.id,
        keycloak_sub=user.keycloak_sub,
        username=user.username,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        role=user.role.value,
        created_at=user.created_at,
    )


@router.get("/oidc-config", response_model=AuthOIDCConfig)
async def oidc_config():
    config = await get_oidc_config()
    return config