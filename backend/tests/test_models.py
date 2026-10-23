import pytest
from sqlalchemy import select
from datetime import datetime, timezone

from app.models import User, Skill, Evaluation, Capsule, Role, Base


@pytest.mark.asyncio
async def test_user_model(test_db):
    import uuid
    unique_id = uuid.uuid4().hex[:8]
    user = User(
        keycloak_sub=f"test-sub-{unique_id}",
        username=f"testuser-{unique_id}",
        email=f"test-{unique_id}@example.com",
        role=Role.OPERATOR,
    )
    test_db.add(user)
    await test_db.commit()
    await test_db.refresh(user)

    assert user.id is not None
    assert user.keycloak_sub == f"test-sub-{unique_id}"
    assert user.role == Role.OPERATOR
    assert isinstance(user.created_at, datetime)
    # SQLite DateTime(timezone=True) stores UTC but returns naive datetime
    assert user.created_at is not None


@pytest.mark.asyncio
async def test_skill_model(test_db):
    import uuid
    unique_id = uuid.uuid4().hex[:8]
    user = User(
        keycloak_sub=f"sub-{unique_id}",
        username=f"user-{unique_id}",
        email=f"user-{unique_id}@test.com",
        role=Role.ADMIN,
    )
    test_db.add(user)
    await test_db.commit()
    await test_db.refresh(user)

    skill = Skill(
        owner_id=user.id,
        name="Test Skill",
        slug=f"test-skill-{unique_id}",
        description="A test skill",
        schema_json='{"criteria": ["accuracy", "completeness"]}',
        version="1.0.0",
    )
    test_db.add(skill)
    await test_db.commit()
    await test_db.refresh(skill)

    assert skill.id is not None
    assert skill.owner_id == user.id
    assert skill.slug == f"test-skill-{unique_id}"


@pytest.mark.asyncio
async def test_evaluation_model(test_db):
    import uuid
    unique_id = uuid.uuid4().hex[:8]
    user = User(
        keycloak_sub=f"sub-{unique_id}",
        username=f"user-{unique_id}",
        email=f"user-{unique_id}@test.com",
        role=Role.OPERATOR,
    )
    test_db.add(user)
    await test_db.commit()
    await test_db.refresh(user)

    skill = Skill(
        owner_id=user.id,
        name="Skill",
        slug=f"skill-{unique_id}",
        description="Desc",
        schema_json="{}",
    )
    test_db.add(skill)
    await test_db.commit()
    await test_db.refresh(skill)

    evaluation = Evaluation(
        owner_id=user.id,
        skill_id=skill.id,
        model_name="gpt-4",
        model_version="2024-01-01",
        status="completed",
        input_data='{"n_runs": 5}',
        result_data='{"scores": [0.8, 0.82, 0.79, 0.81, 0.83], "mean": 0.81}',
        score=0.81,
        confidence_low=0.79,
        confidence_high=0.83,
    )
    test_db.add(evaluation)
    await test_db.commit()
    await test_db.refresh(evaluation)

    assert evaluation.id is not None
    assert evaluation.score == 0.81


@pytest.mark.asyncio
async def test_capsule_model(test_db):
    import uuid
    unique_id = uuid.uuid4().hex[:8]
    user = User(
        keycloak_sub=f"sub-{unique_id}",
        username=f"user-{unique_id}",
        email=f"user-{unique_id}@test.com",
        role=Role.OPERATOR,
    )
    test_db.add(user)
    await test_db.commit()
    await test_db.refresh(user)

    import json
    capsule = Capsule(
        owner_id=user.id,
        path=f"src/auth/AGENT_MEMORY-{unique_id}.md",
        scope=json.dumps(["src/auth/**"]),
        evidence=json.dumps(["src/auth/session.ts"]),
        invalidated_by=json.dumps(["src/auth/oauth-state.ts"]),
        claims=json.dumps([{"statement": "Test", "verifier": "tests/test.py"}]),
        content="# Capsule\n\nContent",
        content_hash="abc123",
        status="verified",
    )
    test_db.add(capsule)
    await test_db.commit()
    await test_db.refresh(capsule)

    assert capsule.id is not None
    assert capsule.status == "verified"
    assert json.loads(capsule.scope) == ["src/auth/**"]