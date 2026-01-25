# app/analytics/routes.py
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.auth.deps import get_current_user
from app.analytics.schemas import TeamSurveyAggregate, QuestionAggregate
from app.users.models import Team
from app.database import models as survey_models

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
                survey_models.SurveyAnswer.submission_id
                == survey_models.SurveySubmission.id,
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
