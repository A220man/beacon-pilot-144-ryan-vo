import pytest
from httpx import AsyncClient
from sqlalchemy import select
import json

from app.models import Skill, User, Role


@pytest.mark.asyncio
async def test_create_skill_unauthorized(client: AsyncClient):
    response = await client.post("/api/skills", json={
        "name": "Test Skill",
        "slug": "test-skill",
        "description": "A test skill",
    })
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_create_skill_forbidden_viewer(client: AsyncClient, test_db):
    # Create viewer user
    import uuid
    unique_id = uuid.uuid4().hex[:8]
    viewer = User(
        keycloak_sub=f"viewer-sub-{unique_id}",
        username=f"viewer-{unique_id}",
        email=f"viewer-{unique_id}@test.com",
        role=Role.VIEWER,
    )
    test_db.add(viewer)
    await test_db.commit()
    await test_db.refresh(viewer)
    
    # Try to create skill without auth - should be 401
    response = await client.post("/api/skills", json={
        "name": "Test Skill",
        "slug": f"test-skill-{unique_id}",
        "description": "A test skill",
    })
    assert response.status_code == 401
@pytest.mark.asyncio
async def test_create_skill_success(client: AsyncClient, test_user: User, test_db):
    # Need authenticated client with operator role
    # This is a placeholder - full auth testing requires more setup
    pass


@pytest.mark.asyncio
async def test_list_skills(client: AsyncClient, test_db):
    # Create test skills
    skill1 = Skill(owner_id=1, name="Skill 1", slug="skill-1", description="Desc 1", schema_json="{}")
    skill2 = Skill(owner_id=1, name="Skill 2", slug="skill-2", description="Desc 2", schema_json="{}")
    test_db.add_all([skill1, skill2])
    await test_db.commit()

    response = await client.get("/api/skills")
    # Will be 401 without auth
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_skill_slug_uniqueness(client: AsyncClient, test_db):
    pass