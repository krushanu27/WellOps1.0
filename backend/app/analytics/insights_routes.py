# backend/app/analytics/insights_routes.py

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.analytics.insights_schemas import InsightsResponse
from app.analytics.insights_service import generate_insights
from app.auth.deps import get_current_user
from app.database.session import get_db

router = APIRouter(prefix="/analytics", tags=["analytics"])


def _resolve_insight_scope(current_user) -> tuple[str, list[int] | None]:
    """
    IMPORTANT:
    If dashboard_routes.py already contains your team visibility logic,
    replace this function by reusing that exact logic.

    Current behavior:
    - ADMIN => org-wide
    - MANAGER => only own team
    - EMPLOYEE => forbidden
    """
    role = getattr(current_user, "role", None)

    if role == "ADMIN":
        return "org", None

    if role == "MANAGER":
        manager_team_id = getattr(current_user, "team_id", None)
        if manager_team_id is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Manager is not assigned to a team.",
            )
        return "team", [manager_team_id]

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You are not allowed to access analytics insights.",
    )


@router.get("/insights", response_model=InsightsResponse)
def get_insights(
    period_days: int = Query(default=30, ge=7, le=90),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    scope, team_ids = _resolve_insight_scope(current_user)

    response = generate_insights(
        db=db,
        period_days=period_days,
        scope=scope,
        team_ids=team_ids,
    )
    return response