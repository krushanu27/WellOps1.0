from __future__ import annotations
from datetime import datetime
from typing import Any, Dict, Optional
from uuid import UUID

from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.auth.deps import get_current_user
from app.analytics.schemas import TeamSurveyAggregate, QuestionAggregate
from app.users.models import Team
from app.database import models as survey_models
from app.analytics.schemas import PredictRequest, PredictResponse
from app.surveys.prediction_service import call_ml_prediction
from app.audit.service import log_audit
from app.users.models import User

router = APIRouter(prefix="/analytics", tags=["analytics"])

K_ANONYMITY = 5  # hard minimum


@router.get(
    "/surveys/{version_id}/teams/{team_id}",
    response_model=TeamSurveyAggregate,
)
def get_team_survey_aggregate(
    version_id,
    team_id,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # Role enforcement
    if current_user.role not in {"MANAGER", "ADMIN"}:
        raise HTTPException(403, "Not authorized")

    # Managers can only see their own team
    if current_user.role == "MANAGER" and current_user.team_id != team_id:
        raise HTTPException(403, "Managers can only view their own team")

    version = db.get(survey_models.SurveyVersion, version_id)
    if not version or version.status != "PUBLISHED":
        raise HTTPException(400, "Survey version not published")

    team = db.get(Team, team_id)
    if not team:
        raise HTTPException(404, "Team not found")

    # Count respondents
    respondent_count = db.execute(
        select(func.count(survey_models.SurveySubmission.id)).where(
            survey_models.SurveySubmission.version_id == version_id,
            survey_models.SurveySubmission.team_id == team_id,
        )
    ).scalar()

    if respondent_count < K_ANONYMITY:
        raise HTTPException(
            422,
            f"Not enough respondents for anonymization (need ≥ {K_ANONYMITY})",
        )

    questions = db.execute(
        select(survey_models.SurveyQuestion)
        .where(survey_models.SurveyQuestion.version_id == version_id)
        .order_by(survey_models.SurveyQuestion.display_order)
    ).scalars().all()

    aggregates = []

    for q in questions:
        answers = db.execute(
            select(survey_models.SurveyAnswer.value).join(
                survey_models.SurveySubmission,
                survey_models.SurveyAnswer.submission_id == survey_models.SurveySubmission.id,
            ).where(
                survey_models.SurveySubmission.version_id == version_id,
                survey_models.SurveySubmission.team_id == team_id,
                survey_models.SurveyAnswer.question_id == q.id,
            )
        ).scalars().all()

        if q.type == "SCALE":
            values = [a.get("value") for a in answers if isinstance(a, dict)]
            aggregate = {
                "average": sum(values) / len(values) if values else None,
                "min": min(values) if values else None,
                "max": max(values) if values else None,
            }
        elif q.type in ("SINGLE_CHOICE", "MULTI_CHOICE"):
            counts: dict[str, int] = {}
            for a in answers:
                for choice in a.get("choices", []):
                    counts[choice] = counts.get(choice, 0) + 1
            aggregate = counts
        else:  # TEXT
            aggregate = {
                "note": "Free-text responses are not aggregated for privacy"
            }

        aggregates.append(
            QuestionAggregate(
                question_id=q.id,
                question_key=q.question_key,
                type=q.type,
                response_count=len(answers),
                aggregate=aggregate,
            )
        )

    return TeamSurveyAggregate(
        team_id=team.id,
        team_name=team.name,
        respondent_count=respondent_count,
        questions=aggregates,
    )


@router.post("/predict", response_model=PredictResponse)
def predict(
    payload: PredictRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    endpoint = "/analytics/predict"

    # Resolve target user/team
    target_user_id: UUID = payload.user_id or current_user.id
    target_team_id: UUID | None = payload.team_id

    # EMPLOYEE restrictions: can only predict for self and cannot override team/user
    if current_user.role == "EMPLOYEE":
        if payload.user_id and payload.user_id != current_user.id:
            log_audit(
                db,
                user_id=current_user.id,
                action="PREDICT_FORBIDDEN",
                endpoint=endpoint,
                status_code=403,
                metadata={"reason": "employee_user_override", "user_id": str(payload.user_id)},
            )
            raise HTTPException(403, "Employees can only predict for themselves")

        if payload.team_id is not None and payload.team_id != current_user.team_id:
            log_audit(
                db,
                user_id=current_user.id,
                action="PREDICT_FORBIDDEN",
                endpoint=endpoint,
                status_code=403,
                metadata={"reason": "employee_team_override", "team_id": str(payload.team_id)},
            )
            raise HTTPException(403, "Employees cannot request team-level predictions")

        target_user_id = current_user.id
        target_team_id = current_user.team_id

    # MANAGER restrictions: can only access their team; can predict for any user in their team
    if current_user.role == "MANAGER":
        if payload.team_id and payload.team_id != current_user.team_id:
            log_audit(
                db,
                user_id=current_user.id,
                action="PREDICT_FORBIDDEN",
                endpoint=endpoint,
                status_code=403,
                metadata={"reason": "manager_cross_team", "team_id": str(payload.team_id)},
            )
            raise HTTPException(403, "Managers can only predict for their own team")

        # If user_id specified, verify user exists and belongs to manager team
        if payload.user_id:
            user = db.get(User, payload.user_id)
            if not user:
                raise HTTPException(404, "User not found")
            if user.team_id != current_user.team_id:
                log_audit(
                    db,
                    user_id=current_user.id,
                    action="PREDICT_FORBIDDEN",
                    endpoint=endpoint,
                    status_code=403,
                    metadata={"reason": "manager_user_not_in_team", "user_id": str(payload.user_id)},
                )
                raise HTTPException(403, "Managers can only predict for users in their team")

        target_team_id = current_user.team_id

    # ADMIN: no extra restrictions

    prediction = call_ml_prediction(
        {
            "workload": float(payload.features.workload),
            "overtime_hours": float(payload.features.overtime_hours),
            "stress_score": float(payload.features.stress_score),
            "sleep_quality": float(payload.features.sleep_quality),
            "mood": float(payload.features.mood),
        }
    )

    resp = PredictResponse(
        burnout_risk_score=prediction["burnout_risk_score"],
        productivity_risk_score=prediction["productivity_risk_score"],
        risk_level=prediction["risk_level"],
        generated_at=prediction["generated_at"],
    )

    log_audit(
        db,
        user_id=current_user.id,
        action="PREDICT_REQUEST",
        endpoint=endpoint,
        status_code=200,
        metadata={
            "target_user_id": str(target_user_id),
            "target_team_id": str(target_team_id) if target_team_id else None,
            "survey_version_id": str(payload.survey_version_id) if payload.survey_version_id else None,
            "risk_level": prediction["risk_level"],
        },
    )

    return resp


class PredictFeatures(BaseModel):
    workload: float = Field(..., ge=0, le=10)
    overtime_hours: float = Field(..., ge=0, le=80)
    stress_score: float = Field(..., ge=0, le=10)
    sleep_quality: float = Field(..., ge=0, le=10)
    mood: float = Field(..., ge=0, le=10)


class PredictRequest(BaseModel):
    team_id: Optional[UUID] = None
    user_id: Optional[UUID] = None
    survey_version_id: Optional[UUID] = None
    features: PredictFeatures


class PredictResponse(BaseModel):
    burnout_risk_score: float  # 0..1
    productivity_risk_score: float  # 0..1
    risk_level: str  # LOW/MEDIUM/HIGH
    generated_at: datetime