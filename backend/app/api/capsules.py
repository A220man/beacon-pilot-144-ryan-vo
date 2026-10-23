from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user, require_role
from app.core.database import get_db
from app.models import Capsule, Role, User


router = APIRouter()


class CapsuleCreate(BaseModel):
    path: str = Field(..., min_length=1, max_length=500)
    scope: list[str] = Field(..., min_length=1)
    evidence: list[str] = Field(..., min_length=1)
    invalidated_by: list[str] = Field(default=[])
    claims: list[dict] = Field(default=[])
    content: str = Field(..., min_length=1)


class CapsuleUpdate(BaseModel):
    scope: Optional[list[str]] = None
    evidence: Optional[list[str]] = None
    invalidated_by: Optional[list[str]] = None
    claims: Optional[list[dict]] = None
    content: Optional[str] = Field(None, min_length=1)


class CapsuleResponse(BaseModel):
    id: int
    owner_id: int
    path: str
    scope: list[str]
    evidence: list[str]
    invalidated_by: list[str]
    claims: list[dict]
    content: str
    content_hash: str
    trusted_content_hash: Optional[str]
    last_verified_commit: Optional[str]
    status: str
    created_at: datetime
    updated_at: datetime


class CapsuleListResponse(BaseModel):
    items: list[CapsuleResponse]
    total: int
    page: int
    page_size: int


import json
import hashlib


def capsule_to_response(capsule: Capsule) -> CapsuleResponse:
    return CapsuleResponse(
        id=capsule.id,
        owner_id=capsule.owner_id,
        path=capsule.path,
        scope=json.loads(capsule.scope),
        evidence=json.loads(capsule.evidence),
        invalidated_by=json.loads(capsule.invalidated_by),
        claims=json.loads(capsule.claims),
        content=capsule.content,
        content_hash=capsule.content_hash,
        trusted_content_hash=capsule.trusted_content_hash,
        last_verified_commit=capsule.last_verified_commit,
        status=capsule.status,
        created_at=capsule.created_at,
        updated_at=capsule.updated_at,
    )


def compute_content_hash(content: str) -> str:
    return hashlib.sha256(content.encode()).hexdigest()


def validate_capsule_paths(paths: list[str]) -> None:
    """Validate paths are repository-relative and safe."""
    for path in paths:
        # Strip symbol anchor
        clean_path = path.split("#")[0]
        if clean_path.startswith("/") or clean_path.startswith("..") or "://" in clean_path:
            raise ValueError(f"Invalid path: {path}. Must be repository-relative, no parent traversal, no URLs.")


@router.post("", response_model=CapsuleResponse, status_code=status.HTTP_201_CREATED)
async def create_capsule(
    capsule_data: CapsuleCreate,
    user: User = Depends(require_role(Role.OPERATOR, Role.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    # Validate paths
    try:
        validate_capsule_paths(capsule_data.scope)
        validate_capsule_paths(capsule_data.evidence)
        validate_capsule_paths(capsule_data.invalidated_by)
        for claim in capsule_data.claims:
            if "verifier" in claim:
                validate_capsule_paths([claim["verifier"]])
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # Check path uniqueness
    result = await db.execute(select(Capsule).where(Capsule.path == capsule_data.path))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Capsule path already exists")

    content_hash = compute_content_hash(capsule_data.content)

    capsule = Capsule(
        owner_id=user.id,
        path=capsule_data.path,
        scope=json.dumps(capsule_data.scope),
        evidence=json.dumps(capsule_data.evidence),
        invalidated_by=json.dumps(capsule_data.invalidated_by),
        claims=json.dumps(capsule_data.claims),
        content=capsule_data.content,
        content_hash=content_hash,
        status="proposed",
    )
    db.add(capsule)
    await db.commit()
    await db.refresh(capsule)
    return capsule_to_response(capsule)


@router.get("", response_model=CapsuleListResponse)
async def list_capsules(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: Optional[str] = Query(None, alias="status"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Capsule)
    count_query = select(func.count(Capsule.id))

    if status_filter:
        query = query.where(Capsule.status == status_filter)
        count_query = count_query.where(Capsule.status == status_filter)

    query = query.offset((page - 1) * page_size).limit(page_size).order_by(Capsule.created_at.desc())

    result = await db.execute(query)
    capsules = result.scalars().all()

    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    return CapsuleListResponse(
        items=[capsule_to_response(c) for c in capsules],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{capsule_id}", response_model=CapsuleResponse)
async def get_capsule(
    capsule_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Capsule).where(Capsule.id == capsule_id))
    capsule = result.scalar_one_or_none()
    if not capsule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Capsule not found")
    return capsule_to_response(capsule)


@router.patch("/{capsule_id}", response_model=CapsuleResponse)
async def update_capsule(
    capsule_id: int,
    capsule_data: CapsuleUpdate,
    user: User = Depends(require_role(Role.OPERATOR, Role.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Capsule).where(Capsule.id == capsule_id))
    capsule = result.scalar_one_or_none()
    if not capsule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Capsule not found")

    if capsule_data.scope is not None:
        validate_capsule_paths(capsule_data.scope)
        capsule.scope = json.dumps(capsule_data.scope)
    if capsule_data.evidence is not None:
        validate_capsule_paths(capsule_data.evidence)
        capsule.evidence = json.dumps(capsule_data.evidence)
    if capsule_data.invalidated_by is not None:
        validate_capsule_paths(capsule_data.invalidated_by)
        capsule.invalidated_by = json.dumps(capsule_data.invalidated_by)
    if capsule_data.claims is not None:
        for claim in capsule_data.claims:
            if "verifier" in claim:
                validate_capsule_paths([claim["verifier"]])
        capsule.claims = json.dumps(capsule_data.claims)
    if capsule_data.content is not None:
        capsule.content = capsule_data.content
        capsule.content_hash = compute_content_hash(capsule_data.content)
        capsule.status = "proposed"  # Reset status on content change

    capsule.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(capsule)
    return capsule_to_response(capsule)


@router.delete("/{capsule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_capsule(
    capsule_id: int,
    user: User = Depends(require_role(Role.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Capsule).where(Capsule.id == capsule_id))
    capsule = result.scalar_one_or_none()
    if not capsule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Capsule not found")

    await db.delete(capsule)
    await db.commit()


@router.post("/{capsule_id}/check", response_model=dict)
async def check_capsule_freshness(
    capsule_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Check capsule freshness against Git history (check-memory.sh equivalent)."""
    from app.services.capsule_checker import check_capsule_freshness

    result = await db.execute(select(Capsule).where(Capsule.id == capsule_id))
    capsule = result.scalar_one_or_none()
    if not capsule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Capsule not found")

    freshness = await check_capsule_freshness(capsule)
    return freshness