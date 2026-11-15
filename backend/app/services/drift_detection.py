import json
from typing import Any
from sqlalchemy import select
from fastapi import HTTPException

from app.models import Evaluation
from app.services.evaluation_runner import compare_evaluations


async def detect_drift(evaluation_id: int, db: Any) -> dict[str, Any]:
    """
    Detect drift between a new evaluation and the most recent baseline for the same skill and model.
    Returns the drift detection result dict from compare_evaluations.
    """
    # Fetch current evaluation
    result = await db.execute(select(Evaluation).where(Evaluation.id == evaluation_id))
    current = result.scalar_one_or_none()
    if not current:
        raise HTTPException(status_code=404, detail="Evaluation not found")
    if not current.result_data:
        raise HTTPException(status_code=400, detail="Evaluation result not available")
    if current.status != "completed":
        raise HTTPException(status_code=409, detail="Evaluation not completed")

    # Parse current result_data JSON into dict for compare_evaluations
    try:
        current_result = json.loads(current.result_data)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse current result data: {e}")

    # Ensure required fields exist (mean, confidence_low, confidence_high, effect_floor)
    if not all(k in current_result for k in ("mean", "confidence_low", "confidence_high")):
        raise HTTPException(status_code=400, detail="Current result missing required fields for drift detection")

    current_dict = {
        "mean": current_result["mean"],
        "confidence_low": current_result["confidence_low"],
        "confidence_high": current_result["confidence_high"],
        "effect_floor": current_result.get("effect_floor", 0.05),
    }

    # Find baseline: most recent evaluation with same skill_id and model_name, excluding current
    baseline_result = await db.execute(
        select(Evaluation)
        .where(
            Evaluation.skill_id == current.skill_id,
            Evaluation.model_name == current.model_name,
            Evaluation.id != current.id,
        )
        .order_by(Evaluation.created_at.desc())
        .limit(1)
    )
    baseline = baseline_result.scalar_one_or_none()
    if not baseline or not baseline.result_data:
        raise HTTPException(status_code=404, detail="No baseline evaluation found for drift detection")

    # Parse baseline result_data
    try:
        baseline_result_data = json.loads(baseline.result_data)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse baseline result data: {e}")

    if not all(k in baseline_result_data for k in ("mean", "confidence_low", "confidence_high")):
        raise HTTPException(status_code=400, detail="Baseline result missing required fields for drift detection")

    baseline_dict = {
        "mean": baseline_result_data["mean"],
        "confidence_low": baseline_result_data["confidence_low"],
        "confidence_high": baseline_result_data["confidence_high"],
        "effect_floor": baseline_result_data.get("effect_floor", 0.05),
    }

    # Perform drift comparison
    drift_result = compare_evaluations(baseline_dict, current_dict)
    return drift_result
