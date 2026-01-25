# app/users/routes.py
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.auth.deps import get_current_user
from app.users.models import User  # ✅ FIXED IMPORT

router = APIRouter(prefix="/users", tags=["users"])


@router.get("")
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Optional: restrict to ADMIN
    # if current_user.role != "ADMIN":
    #     raise HTTPException(403, "Not authorized")

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
