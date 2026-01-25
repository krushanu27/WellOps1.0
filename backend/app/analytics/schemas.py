# app/analytics/schemas.py
from uuid import UUID
from typing import Any
from pydantic import BaseModel


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
