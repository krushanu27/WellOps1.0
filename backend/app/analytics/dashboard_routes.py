# app/analytics/dashboard_routes.py
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.auth.deps import get_current_user
from app.users.models import User, Team
from app.database.models import Survey
from app.audit.models import AuditLog
from datetime import datetime, timedelta, timezone
from collections import defaultdict

router = APIRouter(prefix="/analytics", tags=["analytics"])


def _build_prediction_summary(
    db: Session,
    current_user: User,
) -> dict:
    logs = db.execute(
        select(AuditLog).where(AuditLog.action == "PREDICT_REQUEST")
    ).scalars().all()

    filtered_logs: list[AuditLog] = []

    for log in logs:
        meta = log.meta or {}
        target_user_id = str(meta.get("target_user_id")) if meta.get("target_user_id") else None
        target_team_id = str(meta.get("target_team_id")) if meta.get("target_team_id") else None

        if current_user.role == "ADMIN":
            filtered_logs.append(log)
        elif current_user.role == "MANAGER":
            if current_user.team_id and target_team_id == str(current_user.team_id):
                filtered_logs.append(log)
        else:  # EMPLOYEE
            if target_user_id == str(current_user.id):
                filtered_logs.append(log)

    high_risk = 0
    medium_risk = 0
    low_risk = 0

    for log in filtered_logs:
        meta = log.meta or {}
        level = str(meta.get("risk_level", "")).upper()

        if level == "HIGH":
            high_risk += 1
        elif level == "MEDIUM":
            medium_risk += 1
        elif level == "LOW":
            low_risk += 1

    analyzed = len(filtered_logs)

    return {
        "analyzed": analyzed,
        "high_risk": high_risk,
        "medium_risk": medium_risk,
        "low_risk": low_risk,
    }


@router.get("/summary")
def get_analytics_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    total_users = db.execute(select(func.count(User.id))).scalar() or 0
    total_teams = db.execute(select(func.count(Team.id))).scalar() or 0
    total_surveys = db.execute(select(func.count(Survey.id))).scalar() or 0

    role_rows = db.execute(
        select(User.role, func.count(User.id)).group_by(User.role)
    ).all()
    role_breakdown = {row[0]: row[1] for row in role_rows}

    team_rows = db.execute(
        select(
            Team.name,
            func.count(User.id)
        )
        .select_from(Team)
        .join(User, User.team_id == Team.id, isouter=True)
        .group_by(Team.id, Team.name)
    ).all()

    teams_with_members = sum(1 for _, size in team_rows if size > 0)
    empty_teams = sum(1 for _, size in team_rows if size == 0)

    survey_status_rows = db.execute(
        select(Survey.status, func.count(Survey.id)).group_by(Survey.status)
    ).all()
    survey_status_breakdown = {row[0]: row[1] for row in survey_status_rows}

    predictions = _build_prediction_summary(db, current_user)

    return {
        "users": {
            "total": total_users,
            "admins": role_breakdown.get("ADMIN", 0),
            "managers": role_breakdown.get("MANAGER", 0),
            "employees": role_breakdown.get("EMPLOYEE", 0),
        },
        "teams": {
            "total": total_teams,
            "with_members": teams_with_members,
            "empty": empty_teams,
        },
        "surveys": {
            "total": total_surveys,
            "draft": survey_status_breakdown.get("DRAFT", 0),
            "active": survey_status_breakdown.get("ACTIVE", 0),
            "closed": survey_status_breakdown.get("CLOSED", 0),
            "published": survey_status_breakdown.get("PUBLISHED", 0),
            "archived": survey_status_breakdown.get("ARCHIVED", 0),
        },
        "predictions": predictions,
    }


@router.get("/dashboard")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    total_users = db.execute(select(func.count(User.id))).scalar() or 0
    total_teams = db.execute(select(func.count(Team.id))).scalar() or 0
    total_surveys = db.execute(select(func.count(Survey.id))).scalar() or 0

    role_rows = db.execute(
        select(User.role, func.count(User.id)).group_by(User.role)
    ).all()
    role_breakdown = {row[0]: row[1] for row in role_rows}

    team_rows = db.execute(
        select(
            Team.name,
            func.count(User.id)
        )
        .select_from(Team)
        .join(User, User.team_id == Team.id, isouter=True)
        .group_by(Team.id, Team.name)
        .order_by(func.count(User.id).desc(), Team.name.asc())
    ).all()

    team_sizes = [
        {
            "name": row[0],
            "size": row[1],
        }
        for row in team_rows
    ]

    survey_status_rows = db.execute(
        select(Survey.status, func.count(Survey.id)).group_by(Survey.status)
    ).all()
    survey_status_breakdown = {row[0]: row[1] for row in survey_status_rows}

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
        "team_sizes": team_sizes,
        "survey_status_breakdown": survey_status_breakdown,
        "recent_surveys": recent_surveys,
    }

@router.get("/prediction-trends")
def get_prediction_trends(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    logs = db.execute(
        select(AuditLog).where(AuditLog.action == "PREDICT_REQUEST")
    ).scalars().all()

    daily_counts = defaultdict(int)
    risk_distribution = defaultdict(int)

    for log in logs:
        meta = log.meta or {}

        # RBAC filtering
        target_user_id = str(meta.get("target_user_id")) if meta.get("target_user_id") else None
        target_team_id = str(meta.get("target_team_id")) if meta.get("target_team_id") else None

        if current_user.role == "MANAGER":
            if current_user.team_id and target_team_id != str(current_user.team_id):
                continue

        if current_user.role == "EMPLOYEE":
            if target_user_id != str(current_user.id):
                continue

        if not log.timestamp:
            continue

        date_key = log.timestamp.date().isoformat()
        daily_counts[date_key] += 1

        risk = str(meta.get("risk_level", "")).upper()
        if risk:
            risk_distribution[risk] += 1

    today = datetime.now(timezone.utc).date()
    last_7_days = []

    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        key = day.isoformat()
        last_7_days.append({
            "date": key,
            "count": daily_counts.get(key, 0)
        })

    return {
        "daily_predictions": last_7_days,
        "latest_risk_distribution": {
            "HIGH": risk_distribution.get("HIGH", 0),
            "MEDIUM": risk_distribution.get("MEDIUM", 0),
            "LOW": risk_distribution.get("LOW", 0),
        }
    }