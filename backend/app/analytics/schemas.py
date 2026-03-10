# app/analytics/schemas.py
from __future__ import annotations
from uuid import UUID
from typing import Any
from pydantic import BaseModel


from datetime import datetime
from typing import Optional


from pydantic import Field



class QuestionAggregate(BaseModel):
    question_id: UUID
    question_key: str
    type: str
    response_count: int
    aggregate: dict[str, Any]


class TeamSurveyAggregate(BaseModel):
    team_id: UUID
    team_name: str
    respondent_count: int
    questions: list[QuestionAggregate]


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