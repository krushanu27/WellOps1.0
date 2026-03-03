from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.auth.rbac import require_roles
from app.users.models import User

router = APIRouter(
    prefix="/users",
    tags=["users"],
    dependencies=[Depends(require_roles("ADMIN"))],  # ✅ ADMIN-only for all /users routes
)


@router.get("")
def list_users(db: Session = Depends(get_db)):
    users = db.execute(select(User)).scalars().all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "role": u.role,
            "team_id": u.team_id,
            "created_at": u.created_at,
        }
        for u in users
    ]