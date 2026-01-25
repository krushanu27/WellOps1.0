from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.database.models import Survey  # ORM models live here
from app.database.session import get_db
from app.users.models import AuditLog, User

router = APIRouter(prefix="/surveys", tags=["surveys"])


@router.post("", status_code=status.HTTP_201_CREATED)
def create_survey(
    title: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in {"MANAGER", "ADMIN"}:
        raise HTTPException(status_code=403, detail="Not authorized to create surveys")

    survey = Survey(
        title=title,
        status="DRAFT",
        created_by_user_id=current_user.id,
    )

    db.add(survey)

    # Audit log
    db.add(
        AuditLog(
            actor_user_id=current_user.id,
            actor_role=current_user.role,
            action="CREATE_SURVEY",
            endpoint="/surveys",
        )
    )

    db.commit()
    db.refresh(survey)

    return {
        "id": str(survey.id),
        "title": survey.title,
        "description": survey.description,
        "status": survey.status,
        "created_by_user_id": str(survey.created_by_user_id),
        "created_at": survey.created_at,
        "updated_at": survey.updated_at,
    }


@router.get("", status_code=status.HTTP_200_OK)
def list_surveys(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    surveys = db.execute(
        select(Survey).order_by(Survey.created_at.desc())
    ).scalars().all()

    return [
        {
            "id": str(s.id),
            "title": s.title,
            "description": s.description,
            "status": s.status,
            "created_by_user_id": str(s.created_by_user_id),
            "created_at": s.created_at,
            "updated_at": s.updated_at,
        }
        for s in surveys
    ]


@router.get("/{survey_id}", status_code=status.HTTP_200_OK)
def get_survey(
    survey_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    survey = db.get(Survey, survey_id)
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")

    return {
        "id": str(survey.id),
        "title": survey.title,
        "description": survey.description,
        "status": survey.status,
        "created_by_user_id": str(survey.created_by_user_id),
        "created_at": survey.created_at,
        "updated_at": survey.updated_at,
    }
