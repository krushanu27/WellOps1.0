# app/users/teams_routes.py
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.auth.deps import get_current_user
from app.users.models import Team, User  # ✅ FIXED IMPORTS

router = APIRouter(prefix="/teams", tags=["teams"])


@router.get("")
def list_teams(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    teams = db.execute(select(Team)).scalars().all()
    return [
        {
            "id": t.id,
            "name": t.name,
            "department": t.department,
            "created_at": t.created_at,
        }
        for t in teams
    ]


@router.get("/{team_id}/users")
def list_team_users(
    team_id,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Managers can view their own team; Admin can view all
    if current_user.role == "MANAGER" and str(current_user.team_id) != str(team_id):
        raise HTTPException(403, "Managers can only view their own team")

    users = db.execute(select(User).where(User.team_id == team_id)).scalars().all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "role": u.role,
            "team_id": u.team_id,
        }
        for u in users
    ]
