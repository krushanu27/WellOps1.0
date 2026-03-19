# backend/app/analytics/insights_service.py

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.analytics.insights_schemas import (
    InsightItem,
    InsightMetric,
    InsightsResponse,
)
from app.analytics.queries import (
    get_prediction_summary_for_periods,
    pct_change,
)


DEFAULT_PERIOD_DAYS = 30


def _build_risk_trend_insight(
    current: dict[str, Any],
    previous: dict[str, Any],
    scope: str,
) -> InsightItem | None:
    current_high = current["risk_counts"]["high"]
    previous_high = previous["risk_counts"]["high"]
    current_total = current["total_predictions"]
    previous_total = previous["total_predictions"]

    high_change = pct_change(current_high, previous_high)
    total_change = pct_change(current_total, previous_total)

    if current_total == 0 and previous_total == 0:
        return None

    severity = "info"
    title = "Burnout risk pattern is stable"
    summary = (
        f"High-risk predictions are {current_high} in the current period "
        f"compared with {previous_high} in the previous period."
    )
    recommendation = "Continue monitoring prediction patterns and recheck after the next survey cycle."

    if current_high > previous_high and current_high >= 3:
        severity = "high" if current_high >= 5 else "medium"
        title = "High-risk burnout predictions increased"
        summary = (
            f"High-risk predictions increased from {previous_high} to {current_high} "
            f"in the current period."
        )
        recommendation = (
            "Review the teams contributing most to high-risk predictions and schedule manager follow-ups."
        )
    elif current_high < previous_high and previous_high > 0:
        severity = "low"
        title = "High-risk burnout predictions decreased"
        summary = (
            f"High-risk predictions decreased from {previous_high} to {current_high} "
            f"in the current period."
        )
        recommendation = "Maintain current interventions and verify whether improvements are sustained."

    return InsightItem(
        id="risk-trend",
        title=title,
        summary=summary,
        recommendation=recommendation,
        severity=severity,
        category="trend",
        scope=scope,
        metrics=[
            InsightMetric(label="Current high-risk count", value=current_high, change_pct=high_change),
            InsightMetric(label="Current prediction volume", value=current_total, change_pct=total_change),
            InsightMetric(
                label="Current high-risk ratio",
                value=round(current["high_ratio"] * 100, 1),
            ),
        ],
    )


def _build_team_hotspot_insight(
    current: dict[str, Any],
    previous: dict[str, Any],
    scope: str,
    allowed_team_ids: list[int],
) -> InsightItem | None:
    team_high_counts: dict[int, int] = current["team_high_counts"]
    team_counts: dict[int, int] = current["team_counts"]

    if not team_counts:
        return None

    hotspot_candidates: list[tuple[int, int, int, float]] = []
    for team_id, total_count in team_counts.items():
        high_count = team_high_counts.get(team_id, 0)
        if total_count <= 0:
            continue

        high_ratio = high_count / total_count
        hotspot_candidates.append((team_id, high_count, total_count, high_ratio))

    if not hotspot_candidates:
        return None

    hotspot_candidates.sort(key=lambda item: (item[1], item[3], item[2]), reverse=True)
    top_team_id, top_high_count, top_total_count, top_high_ratio = hotspot_candidates[0]

    # previous period comparison for same team
    prev_team_high = previous["team_high_counts"].get(top_team_id, 0)
    prev_team_total = previous["team_counts"].get(top_team_id, 0)
    prev_ratio = (prev_team_high / prev_team_total) if prev_team_total else 0.0
    ratio_change = pct_change(top_high_ratio, prev_ratio)

    # basic thresholding to avoid noisy nonsense
    if top_high_count == 0:
        return None

    severity = "medium"
    if top_high_count >= 5 or top_high_ratio >= 0.5:
        severity = "high"
    if top_high_count >= 8 or top_high_ratio >= 0.7:
        severity = "critical"

    return InsightItem(
        id=f"team-hotspot-{top_team_id}",
        title="Team hotspot detected",
        summary=(
            f"Team {top_team_id} has the highest concentration of high-risk predictions "
            f"with {top_high_count} high-risk cases out of {top_total_count} predictions "
            f"({round(top_high_ratio * 100, 1)}%)."
        ),
        recommendation=(
            "Prioritize manager review for this team, validate recent survey completion, "
            "and identify workload or engagement issues behind the concentration."
        ),
        severity=severity,
        category="team",
        scope=scope,
        team_id=top_team_id,
        metrics=[
            InsightMetric(label="High-risk count", value=top_high_count),
            InsightMetric(label="Prediction count", value=top_total_count),
            InsightMetric(label="High-risk ratio", value=round(top_high_ratio * 100, 1), change_pct=ratio_change),
        ],
    )


def _build_participation_insight(
    scope: str,
    participation: dict[str, Any] | None,
) -> InsightItem | None:
    if not participation:
        return None

    eligible = participation.get("eligible_users", 0)
    completed = participation.get("completed_users", 0)
    previous_rate = participation.get("previous_completion_rate")
    current_rate = participation.get("completion_rate", 0.0)

    if eligible <= 0:
        return None

    severity = "info"
    title = "Survey participation is acceptable"
    recommendation = "Continue sending reminders before the survey window closes."

    if current_rate < 50:
        severity = "high"
        title = "Survey participation is low"
        recommendation = "Trigger reminders and ask managers to follow up with non-responders."
    elif current_rate < 70:
        severity = "medium"
        title = "Survey participation needs improvement"
        recommendation = "Increase reminders and check whether any teams are consistently under-responding."

    return InsightItem(
        id="survey-participation",
        title=title,
        summary=(
            f"{completed} of {eligible} eligible users completed the survey in the current period "
            f"({round(current_rate, 1)}%)."
        ),
        recommendation=recommendation,
        severity=severity,
        category="participation",
        scope=scope,
        metrics=[
            InsightMetric(
                label="Completion rate",
                value=round(current_rate, 1),
                change_pct=pct_change(current_rate, previous_rate) if previous_rate is not None else None,
            ),
            InsightMetric(label="Completed users", value=completed),
            InsightMetric(label="Eligible users", value=eligible),
        ],
    )


def _build_stability_insight(scope: str) -> InsightItem:
    return InsightItem(
        id="stability-fallback",
        title="No major anomalies detected",
        summary="Prediction activity does not currently show a sharp deterioration pattern.",
        recommendation="Keep monitoring upcoming survey cycles and prediction trends.",
        severity="info",
        category="stability",
        scope=scope,
        metrics=[],
    )


def _sort_insights(items: list[InsightItem]) -> list[InsightItem]:
    severity_rank = {
        "critical": 5,
        "high": 4,
        "medium": 3,
        "low": 2,
        "info": 1,
    }
    return sorted(items, key=lambda item: severity_rank[item.severity], reverse=True)


def get_survey_participation_snapshot(
    db: Session,
    period_days: int,
    team_ids: list[int] | None = None,
) -> dict[str, Any] | None:
    """
    Replace this body with your real survey query logic.

    Keep this return shape:
    {
        "eligible_users": int,
        "completed_users": int,
        "completion_rate": float,              # 0..100
        "previous_completion_rate": float|None # 0..100
    }

    Returning None is valid and keeps the engine working until wired.
    """
    return None


def generate_insights(
    db: Session,
    period_days: int = DEFAULT_PERIOD_DAYS,
    scope: str = "org",
    team_ids: list[int] | None = None,
) -> InsightsResponse:
    summary = get_prediction_summary_for_periods(
        db=db,
        period_days=period_days,
        team_ids=team_ids,
    )

    current = summary["current"]
    previous = summary["previous"]

    items: list[InsightItem] = []

    risk_trend = _build_risk_trend_insight(current=current, previous=previous, scope=scope)
    if risk_trend:
        items.append(risk_trend)

    hotspot = _build_team_hotspot_insight(
        current=current,
        previous=previous,
        scope=scope,
        allowed_team_ids=team_ids or [],
    )
    if hotspot:
        items.append(hotspot)

    participation = get_survey_participation_snapshot(
        db=db,
        period_days=period_days,
        team_ids=team_ids,
    )
    participation_insight = _build_participation_insight(
        scope=scope,
        participation=participation,
    )
    if participation_insight:
        items.append(participation_insight)

    if not items:
        items.append(_build_stability_insight(scope=scope))

    items = _sort_insights(items)

    return InsightsResponse(
        generated_at=summary["bounds"]["current_end"],
        period_days=period_days,
        scope=scope,
        team_ids=team_ids or [],
        items=items,
    )