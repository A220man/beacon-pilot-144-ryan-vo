import pytest
import json
from httpx import AsyncClient

from app.models import Capsule, User, Role


@pytest.mark.asyncio
async def test_create_capsule_unauthorized(client: AsyncClient):
    response = await client.post("/api/capsules", json={
        "path": "src/auth/AGENT_MEMORY.md",
        "scope": ["src/auth/**"],
        "evidence": ["src/auth/session.ts", "tests/auth/test_session.py"],
        "invalidated_by": ["src/auth/oauth-state.ts"],
        "claims": [{"statement": "OAuth callback restores destination", "verifier": "tests/auth/test_callback.py"}],
        "content": "# Test Capsule\n\nThis is a test capsule.",
    })
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_capsule_path_validation():
    from app.api.capsules import validate_capsule_paths
    from fastapi import HTTPException

    # Valid paths
    validate_capsule_paths(["src/auth/**", "src/auth/session.ts#SessionService"])
    
    # Invalid paths
    with pytest.raises(ValueError):
        validate_capsule_paths(["/absolute/path"])
    
    with pytest.raises(ValueError):
        validate_capsule_paths(["../outside"])
    
    with pytest.raises(ValueError):
        validate_capsule_paths(["http://example.com"])


@pytest.mark.asyncio
async def test_capsule_content_hash():
    from app.api.capsules import compute_content_hash
    
    content = "# Test\n\nContent"
    hash1 = compute_content_hash(content)
    hash2 = compute_content_hash(content)
    assert hash1 == hash2
    assert len(hash1) == 64  # SHA256


@pytest.mark.asyncio
async def test_capsule_freshness_checker():
    from app.services.capsule_checker import check_capsule_freshness, CapsuleFreshness
    from app.models import Capsule
    
    # Create a capsule object (won't actually run git commands in test)
    capsule = Capsule(
        id=1,
        owner_id=1,
        path="src/test/AGENT_MEMORY.md",
        scope=json.dumps(["src/test/**"]),
        evidence=json.dumps(["src/test/file.py"]),
        invalidated_by=json.dumps([]),
        claims=json.dumps([]),
        content="# Test\n\nContent",
        content_hash="abc123",
        status="proposed",
    )
    
    # This will return UNKNOWN since not in git repo
    result = await check_capsule_freshness(capsule)
    assert result["state"] in [CapsuleFreshness.UNKNOWN, CapsuleFreshness.PROPOSED]
    assert "usable" in result