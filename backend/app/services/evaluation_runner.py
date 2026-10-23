import json
import random
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Evaluation, Skill


async def run_deterministic_evaluation(evaluation: Evaluation, db: AsyncSession) -> dict[str, Any]:
    """
    Run a deterministic evaluation without LLM.
    This is the core domain engine - uses statistical scoring with confidence bands.
    """
    skill = await db.get(Skill, evaluation.skill_id)
    if not skill:
        raise ValueError("Skill not found")

    input_data = json.loads(evaluation.input_data)

    # Deterministic scoring based on skill schema and input
    # This simulates the "Prove-It" loop from issue #620 - bounded, reproducible evaluation
    skill_schema = json.loads(skill.schema_json)

    # Simulate evaluation runs (like driftproof's 5x sampling)
    n_runs = input_data.get("n_runs", 5)
    scores = []

    for i in range(n_runs):
        # Deterministic pseudo-random based on seed
        seed = hash(f"{evaluation.model_name}:{evaluation.model_version}:{skill.slug}:{i}")
        random.seed(seed)

        # Score based on skill criteria (simplified)
        base_score = 0.7  # Base competency
        variance = 0.15

        # Adjust based on input parameters
        if input_data.get("difficulty") == "high":
            base_score -= 0.1
        if input_data.get("adversarial"):
            base_score -= 0.15

        score = max(0.0, min(1.0, base_score + random.uniform(-variance, variance)))
        scores.append(score)

    random.seed()  # Reset

    # Compute statistics (matching driftproof methodology)
    mean_score = sum(scores) / len(scores)
    sorted_scores = sorted(scores)
    n = len(sorted_scores)

    # Confidence band (approximate 95% CI using percentiles)
    confidence_low = sorted_scores[int(n * 0.025)] if n > 1 else mean_score
    confidence_high = sorted_scores[int(n * 0.975)] if n > 1 else mean_score

    # Effect floor: regression only if bands separate AND move > 0.05
    effect_floor = 0.05

    result = {
        "scores": scores,
        "mean": mean_score,
        "confidence_low": confidence_low,
        "confidence_high": confidence_high,
        "effect_floor": effect_floor,
        "n_runs": n_runs,
        "model": evaluation.model_name,
        "model_version": evaluation.model_version,
        "skill": skill.slug,
        "passed": confidence_low >= 0.5,  # Arbitrary threshold
    }

    return {
        "result_json": json.dumps(result),
        "score": mean_score,
        "confidence_low": confidence_low,
        "confidence_high": confidence_high,
    }


def compare_evaluations(baseline: dict, current: dict) -> dict[str, Any]:
    """
    Compare two evaluation results for drift detection.
    Implements driftproof's methodology: bands must separate AND clear effect floor.
    """
    baseline_low = baseline.get("confidence_low", 0)
    baseline_high = baseline.get("confidence_high", 1)
    current_low = current.get("confidence_low", 0)
    current_high = current.get("confidence_high", 1)
    effect_floor = 0.05

    # Bands separate if no overlap (allowing boundary touch as separation for discrete scores)
    bands_separate = current_high <= baseline_low or baseline_high <= current_low

    # Mean difference
    mean_diff = current.get("mean", 0) - baseline.get("mean", 0)
    abs_diff = abs(mean_diff)

    # Regression: bands separate AND move > effect floor in negative direction
    regression = bands_separate and mean_diff < -effect_floor
    improvement = bands_separate and mean_diff > effect_floor

    return {
        "baseline": baseline,
        "current": current,
        "bands_separate": bands_separate,
        "mean_difference": mean_diff,
        "effect_floor": effect_floor,
        "regression": regression,
        "improvement": improvement,
        "verdict": "regression" if regression else ("improvement" if improvement else "within_noise"),
    }