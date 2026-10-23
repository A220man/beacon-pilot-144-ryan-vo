from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user, require_role
from app.core.database import get_db
from app.models import Evaluation, Role, Skill, User


router = APIRouter()


class EvaluationCreate(BaseModel):
    skill_id: int
    model_name: str = Field(..., min_length=1, max_length=255)
    model_version: str = Field(..., min_length=1, max_length=100)
    input_data: str = Field(..., min_length=1)  # JSON string


class EvaluationResponse(BaseModel):
    id: int
    owner_id: int
    skill_id: int
    model_name: str
    model_version: str
    status: str
    input_data: str
    result_data: Optional[str]
    score: Optional[float]
    confidence_low: Optional[float]
    confidence_high: Optional[float]
    error_message: Optional[str]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    created_at: datetime


class EvaluationListResponse(BaseModel):
    items: list[EvaluationResponse]
    total: int
    page: int
    page_size: int


def evaluation_to_response(eval: Evaluation) -> EvaluationResponse:
    return EvaluationResponse(
        id=eval.id,
        owner_id=eval.owner_id,
        skill_id=eval.skill_id,
        model_name=eval.model_name,
        model_version=eval.model_version,
        status=eval.status,
        input_data=eval.input_data,
        result_data=eval.result_data,
        score=eval.score,
        confidence_low=eval.confidence_low,
        confidence_high=eval.confidence_high,
        error_message=eval.error_message,
        started_at=eval.started_at,
        completed_at=eval.completed_at,
        created_at=eval.created_at,
    )


@router.post("", response_model=EvaluationResponse, status_code=status.HTTP_201_CREATED)
async def create_evaluation(
    eval_data: EvaluationCreate,
    user: User = Depends(require_role(Role.OPERATOR, Role.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    # Verify skill exists
    skill_result = await db.execute(select(Skill).where(Skill.id == eval_data.skill_id))
    skill = skill_result.scalar_one_or_none()
    if not skill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found")

    evaluation = Evaluation(
        owner_id=user.id,
        skill_id=eval_data.skill_id,
        model_name=eval_data.model_name,
        model_version=eval_data.model_version,
        status="pending",
        input_data=eval_data.input_data,
    )
    db.add(evaluation)
    await db.commit()
    await db.refresh(evaluation)
    return evaluation_to_response(evaluation)


@router.get("", response_model=EvaluationListResponse)
async def list_evaluations(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    skill_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Evaluation)
    count_query = select(func.count(Evaluation.id))

    if skill_id:
        query = query.where(Evaluation.skill_id == skill_id)
        count_query = count_query.where(Evaluation.skill_id == skill_id)

    if status_filter:
        query = query.where(Evaluation.status == status_filter)
        count_query = count_query.where(Evaluation.status == status_filter)

    query = query.offset((page - 1) * page_size).limit(page_size).order_by(Evaluation.created_at.desc())

    result = await db.execute(query)
    evaluations = result.scalars().all()

    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    return EvaluationListResponse(
        items=[evaluation_to_response(e) for e in evaluations],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{evaluation_id}", response_model=EvaluationResponse)
async def get_evaluation(
    evaluation_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Evaluation).where(Evaluation.id == evaluation_id))
    evaluation = result.scalar_one_or_none()
    if not evaluation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evaluation not found")
    return evaluation_to_response(evaluation)


@router.post("/{evaluation_id}/run", response_model=EvaluationResponse)
async def run_evaluation(
    evaluation_id: int,
    user: User = Depends(require_role(Role.OPERATOR, Role.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    """Run a deterministic evaluation (no LLM required)."""
    result = await db.execute(select(Evaluation).where(Evaluation.id == evaluation_id))
    evaluation = result.scalar_one_or_none()
    if not evaluation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evaluation not found")

    if evaluation.status == "running":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Evaluation already running")

    # Import evaluation runner
    from app.services.evaluation_runner import run_deterministic_evaluation

    evaluation.status = "running"
    evaluation.started_at = datetime.now(timezone.utc)
    await db.commit()

    try:
        result_data = await run_deterministic_evaluation(evaluation)
        evaluation.status = "completed"
        evaluation.result_data = result_data["result_json"]
        evaluation.score = result_data["score"]
        evaluation.confidence_low = result_data["confidence_low"]
        evaluation.confidence_high = result_data["confidence_high"]
        evaluation.completed_at = datetime.now(timezone.utc)
    except Exception as e:
        evaluation.status = "failed"
        evaluation.error_message = str(e)
        evaluation.completed_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(evaluation)
    return evaluation_to_response(evaluation)