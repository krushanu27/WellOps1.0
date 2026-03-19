# backend/app/analytics/insights_schemas.py

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


InsightSeverity = Literal["critical", "high", "medium", "low", "info"]
InsightCategory = Literal["risk", "trend", "team", "participation", "stability"]
InsightScope = Literal["org", "team"]


class InsightMetric(BaseModel):
    label: str
    value: float | int | str
    change_pct: float | None = None


class InsightItem(BaseModel):
    id: str
    title: str
    summary: str
    recommendation: str
    severity: InsightSeverity
    category: InsightCategory
    scope: InsightScope
    team_id: int | None = None
    metrics: list[InsightMetric] = Field(default_factory=list)


class InsightsResponse(BaseModel):
    generated_at: datetime
    period_days: int
    scope: InsightScope
    team_ids: list[int] = Field(default_factory=list)
    items: list[InsightItem] = Field(default_factory=list)