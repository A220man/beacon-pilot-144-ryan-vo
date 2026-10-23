import os
from pathlib import Path
from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    app_env: str = Field(default="development", alias="APP_ENV")
    app_host: str = Field(default="127.0.0.1", alias="APP_HOST")
    app_port: int = Field(default=8000, alias="APP_PORT")
    frontend_url: str = Field(default="http://127.0.0.1:5173", alias="FRONTEND_URL")

    # Database
    database_url: str = Field(default="sqlite+aiosqlite:///./data/beacon.db", alias="DATABASE_URL")

    # Keycloak / OIDC
    keycloak_url: Optional[str] = Field(default=None, alias="KEYCLOAK_URL")
    keycloak_realm: str = Field(default="beacon", alias="KEYCLOAK_REALM")
    keycloak_client_id: str = Field(default="beacon-pilot", alias="KEYCLOAK_CLIENT_ID")
    keycloak_client_secret: Optional[str] = Field(default=None, alias="KEYCLOAK_CLIENT_SECRET")
    keycloak_admin_user: str = Field(default="admin", alias="KEYCLOAK_ADMIN_USER")
    keycloak_admin_password: str = Field(default="admin", alias="KEYCLOAK_ADMIN_PASSWORD")

    # OIDC settings (frontend PKCE)
    oidc_issuer: str = Field(default="http://127.0.0.1:8080/realms/beacon", alias="OIDC_ISSUER")
    oidc_client_id: str = Field(default="beacon-pilot", alias="OIDC_CLIENT_ID")
    oidc_redirect_uri: str = Field(default="http://127.0.0.1:5173/callback", alias="OIDC_REDIRECT_URI")
    oidc_scopes: str = Field(default="openid profile email roles", alias="OIDC_SCOPES")

    # Session (backend-managed cookies)
    session_secret: str = Field(default="dev-secret-change-in-production", alias="SESSION_SECRET")
    session_cookie_name: str = Field(default="beacon_session", alias="SESSION_COOKIE_NAME")
    session_cookie_secure: bool = Field(default=False, alias="SESSION_COOKIE_SECURE")
    session_cookie_samesite: str = Field(default="lax", alias="SESSION_COOKIE_SAMESITE")

    # LLM (optional, server-side only)
    llm_api_key: Optional[str] = Field(default=None, alias="LLM_API_KEY")
    llm_provider: str = Field(default="openai-compatible", alias="LLM_PROVIDER")
    llm_model: str = Field(default="gpt-4o-mini", alias="LLM_MODEL")
    llm_base_url: str = Field(default="https://api.openai.com/v1", alias="LLM_BASE_URL")
    llm_timeout: int = Field(default=30, alias="LLM_TIMEOUT")

    # Repository memory
    trusted_base_ref: str = Field(default="origin/main", alias="TRUSTED_BASE_REF")

    @property
    def is_demo_mode(self) -> bool:
        """Demo mode binds to localhost and refuses to run in production."""
        return self.app_env == "development" and self.keycloak_url is None

    @property
    def oidc_discovery_url(self) -> str:
        return f"{self.oidc_issuer}/.well-known/openid-configuration"


settings = Settings()