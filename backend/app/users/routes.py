from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.database.session import get_db
from app.database.models import User
from app.auth.deps import require_roles

router = APIRouter(prefix="/users", tags=["users"])


@router.get("")
def list_users(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("ADMIN")),
):
    users = db.execute(select(User)).scalars().all()
    return [
        {
            "id": str(u.id),
            "email": u.email,
            "role": u.role,
            "team_id": str(u.team_id) if u.team_id else None,
        }
        for u in users
    ]
