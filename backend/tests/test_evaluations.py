import pytest
import json
from httpx import AsyncClient

from app.models import Skill, Evaluation, User, Role


@pytest.mark.asyncio
async def test_create_evaluation_unauthorized(client: AsyncClient):
    response = await client.post("/api/evaluations", json={
        "skill_id": 1,
        "model_name": "test-model",
        "model_version": "1.0",
        "input_data": '{"n_runs": 3}',
    })
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_run_evaluation_deterministic(client: AsyncClient, test_db):
    # Create skill and evaluation
    skill = Skill(owner_id=1, name="Test Skill", slug="test-skill", description="Test", schema_json='{"criteria": ["accuracy"]}')
    test_db.add(skill)
    await test_db.commit()
    await test_db.refresh(skill)

    evaluation = Evaluation(
        owner_id=1,
        skill_id=skill.id,
        model_name="test-model",
        model_version="1.0",
        status="pending",
        input_data='{"n_runs": 3}',
    )
    test_db.add(evaluation)
    await test_db.commit()
    await test_db.refresh(evaluation)

    # Run evaluation (would need auth)
    response = await client.post(f"/api/evaluations/{evaluation.id}/run")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_evaluation_runner_deterministic(test_db):
    from app.services.evaluation_runner import run_deterministic_evaluation
    from app.models import Skill, Evaluation
    from datetime import datetime, timezone

    skill = Skill(owner_id=1, name="Test", slug="test", description="Test", schema_json="{}")
    test_db.add(skill)
    await test_db.commit()
    await test_db.refresh(skill)

    evaluation = Evaluation(
        owner_id=1,
        skill_id=skill.id,
        model_name="test-model",
        model_version="1.0",
        status="pending",
        input_data='{"n_runs": 5}',
    )

    result = await run_deterministic_evaluation(evaluation, test_db)
    
    assert "result_json" in result
    assert "score" in result
    assert "confidence_low" in result
    assert "confidence_high" in result
    assert 0 <= result["score"] <= 1
    assert result["confidence_low"] <= result["score"] <= result["confidence_high"]
    
    result_data = json.loads(result["result_json"])
    assert "scores" in result_data
    assert len(result_data["scores"]) == 5
    assert result_data["n_runs"] == 5


@pytest.mark.asyncio
async def test_drift_comparison():
    from app.services.evaluation_runner import compare_evaluations

    baseline = {"mean": 0.80, "confidence_low": 0.75, "confidence_high": 0.85}
    current = {"mean": 0.70, "confidence_low": 0.65, "confidence_high": 0.75}

    result = compare_evaluations(baseline, current)
    
    assert result["bands_separate"] == True
    assert abs(result["mean_difference"] - (-0.10)) < 1e-10
    assert result["regression"] == True
    assert result["verdict"] == "regression"


@pytest.mark.asyncio
async def test_drift_within_noise():
    from app.services.evaluation_runner import compare_evaluations

    baseline = {"mean": 0.80, "confidence_low": 0.75, "confidence_high": 0.85}
    current = {"mean": 0.78, "confidence_low": 0.73, "confidence_high": 0.83}

    result = compare_evaluations(baseline, current)
    
    assert result["bands_separate"] == False
    assert result["regression"] == False
    assert result["verdict"] == "within_noise"