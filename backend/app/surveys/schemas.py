from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field


QuestionType = Literal["SCALE", "SINGLE_CHOICE", "MULTI_CHOICE", "TEXT"]
SurveyVersionStatus = Literal["DRAFT", "PUBLISHED"]
SurveyStatus = Literal["DRAFT", "ARCHIVED"]


class SurveyCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: str | None = None


class SurveyUpdate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: str | None = None


class SurveyOut(BaseModel):
    id: UUID
    title: str
    description: str | None
    status: SurveyStatus
    created_by_user_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SurveyVersionCreate(BaseModel):
    version_number: int = Field(ge=1)


class SurveyVersionOut(BaseModel):
    id: UUID
    survey_id: UUID
    version_number: int
    status: SurveyVersionStatus
    published_at: datetime | None
    created_at: datetime

    class Config:
        from_attributes = True


class QuestionCreate(BaseModel):
    question_key: str = Field(min_length=1, max_length=100)
    prompt: str = Field(min_length=1)
    type: QuestionType
    options: dict[str, Any] | None = None
    scale_min: int | None = None
    scale_max: int | None = None
    required: bool = True
    display_order: int = Field(default=0, ge=0)


class QuestionOut(BaseModel):
    id: UUID
    version_id: UUID
    question_key: str
    prompt: str
    type: QuestionType
    options: dict[str, Any] | None
    scale_min: int | None
    scale_max: int | None
    required: bool
    display_order: int

    class Config:
        from_attributes = True


class VersionDetailOut(BaseModel):
    version: SurveyVersionOut
    questions: list[QuestionOut]


class AnswerIn(BaseModel):
    question_id: UUID
    value: dict[str, Any]


class SubmissionCreate(BaseModel):
    answers: list[AnswerIn] = Field(min_length=1)


class PredictionResultOut(BaseModel):
    burnout_risk_score: float
    productivity_risk_score: float
    risk_level: str
    generated_at: str


class SubmissionOut(BaseModel):
    id: UUID
    version_id: UUID
    user_id: UUID
    team_id: UUID
    submitted_at: datetime

    class Config:
        from_attributes = True


class SubmissionWithPredictionOut(SubmissionOut):
    prediction: PredictionResultOut