from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.auth.deps import get_current_user
from app.users.models import User, AuditLog
from app.database.models import Survey  # surveys ORM lives here

router = APIRouter(prefix="/surveys", tags=["surveys"])


@router.post("", status_code=status.HTTP_201_CREATED)
def create_survey(
    title: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Only MANAGER/ADMIN can create surveys
    if current_user.role not in {"MANAGER", "ADMIN"}:
        raise HTTPException(status_code=403, detail="Not authorized to create surveys")

    survey = Survey(
        title=title,
        status="DRAFT",
        created_by_user_id=current_user.id,  # ✅ FIX
    )

    db.add(survey)

    # Optional: audit log
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
        "status": survey.status,
        "created_by_user_id": str(survey.created_by_user_id),
    }
