from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field


SurveyTypeLiteral = Literal["GENERAL", "PREDICTION"]
SurveyStatusLiteral = Literal["DRAFT", "PUBLISHED", "ARCHIVED"]
SurveyVersionStatusLiteral = Literal["DRAFT", "PUBLISHED", "ARCHIVED"]
QuestionTypeLiteral = Literal["TEXT", "SCALE", "SINGLE_CHOICE", "MULTI_CHOICE"]


class SurveyCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str | None = None
    survey_type: SurveyTypeLiteral = "GENERAL"


class SurveyUpdate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str | None = None
    survey_type: SurveyTypeLiteral | None = None


class SurveyOut(BaseModel):
    id: UUID
    title: str
    description: str | None = None
    status: SurveyStatusLiteral
    survey_type: SurveyTypeLiteral
    created_by_user_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SurveyVersionOut(BaseModel):
    id: UUID
    survey_id: UUID
    version_number: int
    status: SurveyVersionStatusLiteral
    created_at: datetime
    published_at: datetime | None = None

    class Config:
        from_attributes = True


class QuestionCreate(BaseModel):
    question_key: str = Field(..., min_length=1, max_length=100)
    prompt: str = Field(..., min_length=1)
    type: QuestionTypeLiteral
    scale_min: int | None = None
    scale_max: int | None = None
    options: dict[str, Any] | None = None
    required: bool = True
    display_order: int = 0


class QuestionOut(BaseModel):
    id: UUID
    question_key: str
    prompt: str
    type: QuestionTypeLiteral
    scale_min: int | None = None
    scale_max: int | None = None
    options: dict[str, Any] | None = None
    required: bool
    display_order: int

    class Config:
        from_attributes = True


class AnswerCreate(BaseModel):
    question_id: UUID
    value: dict[str, Any]


class SubmissionCreate(BaseModel):
    answers: list[AnswerCreate]


class SubmissionWithPredictionOut(BaseModel):
    id: UUID
    version_id: UUID
    user_id: UUID
    team_id: UUID
    submitted_at: datetime
    prediction: dict[str, Any] | None = None

    class Config:
        from_attributes = True