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
        "input_data": '{"n_runs": 5}'
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
        input_data='{"n_runs": 5}',
        status="pending"
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
        input_data='{"n_runs": 5}',
        status="pending"
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
    
    assert result["significant"] == True
    assert abs(result["difference"] - (-0.10)) < 1e-10
    assert result["verdict"] == "regression"


@pytest.mark.asyncio
async def test_drift_within_noise():
    from app.services.evaluation_runner import compare_evaluations

    baseline = {"mean": 0.80, "confidence_low": 0.75, "confidence_high": 0.85}
    current = {"mean": 0.78, "confidence_low": 0.73, "confidence_high": 0.83}

    result = compare_evaluations(baseline, current)
    
    assert result["significant"] == False
    assert result["verdict"] == "within_noise"


@pytest.mark.asyncio
async def test_evaluation_runner_cross_process_deterministic(tmp_path):
    """Verify that evaluation results are identical across separate Python processes.
    This ensures the deterministic engine uses stable hashing (not Python's randomized hash()).
    """
    import subprocess
    import sys

    test_code = (
        "import asyncio\n"
        "import sys\n"
        "sys.path.insert(0, \".\")\n"
        "from app.services.evaluation_runner import run_deterministic_evaluation\n"
        "from app.models import Skill, Evaluation\n"
        "\n"
        "class MockDB:\n"
        "    async def get(self, model, id):\n"
        "        if model == Skill:\n"
        "            return Skill(id=1, owner_id=1, name=\"Test\", slug=\"test\", description=\"Test\", schema_json='{\"criteria\": [{\"name\": \"accuracy\", \"weight\": 1.0, \"min_score\": 0.5}]}')\n"
        "        return None\n"
        "\n"
        "async def test():\n"
        "    eval = Evaluation(owner_id=1, skill_id=1, model_name=\"test-model\", model_version=\"1.0\", input_data='{\"n_runs\": 5}', status=\"pending\")\n"
        "    db = MockDB()\n"
        "    result = await run_deterministic_evaluation(eval, db)\n"
        "    return result[\"score\"], result[\"confidence_low\"], result[\"confidence_high\"]\n"
        "\n"
        "r = asyncio.run(test())\n"
        f"print(f\"{{r[0]}}|{{r[1]}}|{{r[2]}}\")\n"
    )
    # Run in two separate processes
    proc1 = subprocess.run([sys.executable, "-c", test_code], capture_output=True, text=True, cwd="/var/lib/alan-portfolio/workspaces/ryan/beacon-pilot-144-ryan-vo/backend")
    proc2 = subprocess.run([sys.executable, "-c", test_code], capture_output=True, text=True, cwd="/var/lib/alan-portfolio/workspaces/ryan/beacon-pilot-144-ryan-vo/backend")

    assert proc1.returncode == 0, f"Process 1 failed: {proc1.stderr}"
    assert proc2.returncode == 0, f"Process 2 failed: {proc2.stderr}"

    # Results should be identical
    result1 = proc1.stdout.strip()
    result2 = proc2.stdout.strip()
    assert result1 == result2, f"Cross-process determinism failed: {result1} != {result2}"


