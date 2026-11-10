import hashlib
import json
import random
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Evaluation, Skill


def _stable_hash(s: str) -> int:
    """Generate a stable hash for deterministic seeding across Python processes."""
    return int(hashlib.md5(s.encode()).hexdigest(), 16)


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
        seed = _stable_hash(f"{evaluation.model_name}:{evaluation.model_version}:{skill.slug}:{i}")
        random.seed(seed)

        # Score based on skill schema criteria
        base_score = 0.7
        variance = 0.15
        criteria_weights = {}
        min_passing_score = 0.5

        # Parse skill schema for criteria
        if skill_schema and isinstance(skill_schema, dict):
            criteria = skill_schema.get("criteria", [])
            if criteria and isinstance(criteria, list):
                # Each criterion can have weight and min_score
                total_weight = 0
                for criterion in criteria:
                    if isinstance(criterion, dict):
                        weight = criterion.get("weight", 1.0)
                        criterion_min = criterion.get("min_score", 0.5)
                        criterion_name = criterion.get("name", "unnamed")
                        criteria_weights[criterion_name] = {"weight": weight, "min_score": criterion_min}
                        total_weight += weight
                    elif isinstance(criterion, str):
                        # Simple string criterion, equal weight
                        criteria_weights[criterion] = {"weight": 1.0, "min_score": 0.5}
                        total_weight += 1.0

                # Normalize weights
                if total_weight > 0:
                    for c in criteria_weights:
                        criteria_weights[c]["weight"] /= total_weight

                # Base score influenced by number and strictness of criteria
                if criteria_weights:
                    avg_min_score = sum(c["min_score"] for c in criteria_weights.values()) / len(criteria_weights)
                    base_score = 0.5 + (0.3 * (1.0 - avg_min_score))  # Higher min_score -> lower base
                    variance = max(0.05, 0.2 * (1.0 - avg_min_score))  # Stricter criteria -> less variance

            # Global settings from schema
            if "min_passing_score" in skill_schema:
                min_passing_score = skill_schema["min_passing_score"]

        # Adjust based on input parameters
        if input_data.get("difficulty") == "high":
            base_score -= 0.1
        if input_data.get("adversarial"):
            base_score -= 0.15

        # Per-criterion scoring with deterministic variation
        criterion_scores = {}
        for criterion_name, config in criteria_weights.items():
            # Deterministic per-criterion variation
            crit_seed = _stable_hash(f"{seed}:{criterion_name}")
            random.seed(crit_seed)
            crit_variance = variance * 0.5
            crit_score = max(0.0, min(1.0, base_score + random.uniform(-crit_variance, crit_variance)))
            criterion_scores[criterion_name] = crit_score

        # Overall score is weighted average of criterion scores
        if criteria_weights:
            score = sum(criterion_scores[name] * config["weight"] for name, config in criteria_weights.items())
        else:
            score = max(0.0, min(1.0, base_score + random.uniform(-variance, variance)))

        scores.append(score)
        random.seed(seed)  # Restore main seed for next run

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
        "passed": confidence_low >= min_passing_score,
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
    Returns verdict: 'regression' | 'improvement' | 'within_noise'
    """
    baseline_low = baseline.get("confidence_low", 0)
    baseline_high = baseline.get("confidence_high", 1)
    current_low = current.get("confidence_low", 0)
    current_high = current.get("confidence_high", 1)

    baseline_mean = baseline.get("mean", 0)
    current_mean = current.get("mean", 0)

    effect_floor = baseline.get("effect_floor", current.get("effect_floor", 0.05))

    # Check if confidence bands separate (or touch - no meaningful overlap)
    bands_separate = current_low >= baseline_high or baseline_low >= current_high

    # Check if difference exceeds effect floor
    difference = current_mean - baseline_mean
    exceeds_floor = abs(difference) > effect_floor

    if bands_separate and exceeds_floor:
        if difference > 0:
            verdict = "improvement"
        else:
            verdict = "regression"
    else:
        verdict = "within_noise"

    return {
        "verdict": verdict,
        "baseline_score": baseline_mean,
        "current_score": current_mean,
        "difference": difference,
        "significant": bands_separate and exceeds_floor,
        "baseline_band": [baseline_low, baseline_high],
        "current_band": [current_low, current_high],
        "effect_floor": effect_floor,
    }

