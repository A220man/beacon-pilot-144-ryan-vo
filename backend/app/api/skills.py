from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user, require_role
from app.core.database import get_db
from app.models import Role, Skill, User


router = APIRouter()


class SkillCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    slug: str = Field(..., min_length=1, max_length=255, pattern=r"^[a-z0-9-]+$")
    description: str = Field(..., min_length=1)
    schema_json: str = Field(default="{}")
    version: str = Field(default="1.0.0")


class SkillUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, min_length=1)
    schema_json: Optional[str] = None
    version: Optional[str] = Field(None, max_length=50)


class SkillResponse(BaseModel):
    id: int
    owner_id: int
    name: str
    slug: str
    description: str
    schema_json: str
    version: str
    created_at: datetime
    updated_at: datetime


class SkillListResponse(BaseModel):
    items: list[SkillResponse]
    total: int
    page: int
    page_size: int


def skill_to_response(skill: Skill) -> SkillResponse:
    return SkillResponse(
        id=skill.id,
        owner_id=skill.owner_id,
        name=skill.name,
        slug=skill.slug,
        description=skill.description,
        schema_json=skill.schema_json,
        version=skill.version,
        created_at=skill.created_at,
        updated_at=skill.updated_at,
    )


@router.post("", response_model=SkillResponse, status_code=status.HTTP_201_CREATED)
async def create_skill(
    skill_data: SkillCreate,
    user: User = Depends(require_role(Role.OPERATOR, Role.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    # Check slug uniqueness
    result = await db.execute(select(Skill).where(Skill.slug == skill_data.slug))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Slug already exists")

    skill = Skill(
        owner_id=user.id,
        name=skill_data.name,
        slug=skill_data.slug,
        description=skill_data.description,
        schema_json=skill_data.schema_json,
        version=skill_data.version,
    )
    db.add(skill)
    await db.commit()
    await db.refresh(skill)
    return skill_to_response(skill)


@router.get("", response_model=SkillListResponse)
async def list_skills(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Skill)
    count_query = select(func.count(Skill.id))

    if search:
        search_term = f"%{search}%"
        query = query.where(Skill.name.ilike(search_term) | Skill.description.ilike(search_term))
        count_query = count_query.where(Skill.name.ilike(search_term) | Skill.description.ilike(search_term))

    # Apply pagination
    query = query.offset((page - 1) * page_size).limit(page_size).order_by(Skill.created_at.desc())

    result = await db.execute(query)
    skills = result.scalars().all()

    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    return SkillListResponse(
        items=[skill_to_response(s) for s in skills],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{skill_id}", response_model=SkillResponse)
async def get_skill(
    skill_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Skill).where(Skill.id == skill_id))
    skill = result.scalar_one_or_none()
    if not skill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found")
    return skill_to_response(skill)


@router.patch("/{skill_id}", response_model=SkillResponse)
async def update_skill(
    skill_id: int,
    skill_data: SkillUpdate,
    user: User = Depends(require_role(Role.OPERATOR, Role.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Skill).where(Skill.id == skill_id))
    skill = result.scalar_one_or_none()
    if not skill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found")

    # Check slug uniqueness if changing
    if skill_data.name and skill_data.name != skill.name:
        result = await db.execute(select(Skill).where(Skill.slug == skill_data.slug))
        if result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Slug already exists")

    if skill_data.name is not None:
        skill.name = skill_data.name
    if skill_data.description is not None:
        skill.description = skill_data.description
    if skill_data.schema_json is not None:
        skill.schema_json = skill_data.schema_json
    if skill_data.version is not None:
        skill.version = skill_data.version

    skill.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(skill)
    return skill_to_response(skill)


@router.delete("/{skill_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_skill(
    skill_id: int,
    user: User = Depends(require_role(Role.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Skill).where(Skill.id == skill_id))
    skill = result.scalar_one_or_none()
    if not skill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found")

    await db.delete(skill)
    await db.commit()