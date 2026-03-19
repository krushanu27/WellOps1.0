from __future__ import annotations

import os
from typing import Any
from uuid import UUID

import httpx
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.audit.models import AuditLog
from app.database.models import SurveyQuestion


ML_SERVICE_URL = os.getenv("ML_SERVICE_URL", "http://127.0.0.1:8001")
ML_PREDICT_ENDPOINT = f"{ML_SERVICE_URL}/predict"

REQUIRED_MODEL_KEYS = {
    "workload",
    "overtime_hours",
    "stress_score",
    "sleep_quality",
    "mood",
}


def _extract_numeric_answer(value: dict[str, Any]) -> float:
    """
    Accept a few common flexible JSON shapes and extract a numeric value.
    Expected examples:
    {"value": 7}
    {"score": 6}
    {"selected": 5}
    {"answer": 8}
    """
    candidate_keys = ("value", "score", "selected", "answer")

    for key in candidate_keys:
        raw = value.get(key)
        if raw is None:
            continue
        try:
            return float(raw)
        except (TypeError, ValueError):
            break

    raise HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail="Survey answer value must contain a numeric field such as value/score/selected/answer",
    )


def build_ml_payload(
    db: Session,
    answers: list,
) -> dict[str, float]:
    """
    Map submitted answers to ML payload using SurveyQuestion.question_key.
    """
    question_ids = [answer.question_id for answer in answers]

    questions = db.execute(
        select(SurveyQuestion).where(SurveyQuestion.id.in_(question_ids))
    ).scalars().all()

    question_by_id = {q.id: q for q in questions}
    payload: dict[str, float] = {}

    for answer in answers:
        question = question_by_id.get(answer.question_id)
        if not question:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Question {answer.question_id} not found",
            )

        key = question.question_key
        if key not in REQUIRED_MODEL_KEYS:
            continue

        payload[key] = _extract_numeric_answer(answer.value)

    missing = REQUIRED_MODEL_KEYS - set(payload.keys())
    if missing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Survey is missing ML-required answers for: {sorted(missing)}",
        )

    return payload


def call_ml_prediction(payload: dict[str, float]) -> dict[str, Any]:
    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.post(ML_PREDICT_ENDPOINT, json=payload)
    except httpx.RequestError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Prediction service is unavailable",
        )

    if response.status_code >= 400:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Prediction service failed with status {response.status_code}",
        )

    data = response.json()

    required_response_keys = {
        "burnout_risk_score",
        "productivity_risk_score",
        "risk_level",
        "generated_at",
    }
    missing = required_response_keys - set(data.keys())
    if missing:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Prediction service returned incomplete response: {sorted(missing)}",
        )

    return data


def create_prediction_audit_log(
    *,
    user_id: UUID,
    team_id: UUID,
    prediction: dict[str, Any],
) -> AuditLog:
    return AuditLog(
        user_id=user_id,
        action="PREDICT_REQUEST",
        endpoint="/surveys/{survey_id}/versions/{version_id}/submit",
        status_code=201,
        meta={
            "risk_level": prediction["risk_level"],
            "target_user_id": str(user_id),
            "target_team_id": str(team_id),
            "burnout_risk_score": prediction["burnout_risk_score"],
            "productivity_risk_score": prediction["productivity_risk_score"],
            "generated_at": prediction["generated_at"],
        },
    )