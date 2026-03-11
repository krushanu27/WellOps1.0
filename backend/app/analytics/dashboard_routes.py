# app/analytics/dashboard_routes.py
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.auth.deps import get_current_user
from app.users.models import User, Team
from app.database.models import Survey


router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/dashboard")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Total counts
    total_users = db.execute(select(func.count(User.id))).scalar() or 0
    total_teams = db.execute(select(func.count(Team.id))).scalar() or 0
    total_surveys = db.execute(select(func.count(Survey.id))).scalar() or 0

    # Role breakdown
    role_rows = db.execute(
        select(User.role, func.count(User.id)).group_by(User.role)
    ).all()
    role_breakdown = {row[0]: row[1] for row in role_rows}

    # Recent surveys (last 5)
    recent = db.execute(
        select(Survey).order_by(Survey.created_at.desc()).limit(5)
    ).scalars().all()

    recent_surveys = [
        {
            "id": str(s.id),
            "title": s.title,
            "status": s.status,
            "created_at": s.created_at,
        }
        for s in recent
    ]

    return {
        "total_users": total_users,
        "total_teams": total_teams,
        "total_surveys": total_surveys,
        "role_breakdown": role_breakdown,
        "recent_surveys": recent_surveys,
    }
