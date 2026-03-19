# backend/app/analytics/queries.py

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.audit.models import AuditLog


RISK_LEVELS = ("low", "medium", "high")


@dataclass
class PredictionEvent:
    timestamp: datetime
    risk_level: str
    target_user_id: int | None
    target_team_id: int | None


def _to_utc_naive(dt: datetime) -> datetime:
    """
    Normalize datetimes so comparisons are safe even if DB values mix
    offset-aware and offset-naive timestamps.
    """
    if dt.tzinfo is None:
        return dt
    return dt.astimezone(timezone.utc).replace(tzinfo=None)


def _safe_int(value: Any) -> int | None:
    try:
        if value is None:
            return None
        return int(value)
    except (TypeError, ValueError):
        return None


def _safe_str(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip().lower()
    return text or None


def get_period_bounds(period_days: int, now: datetime | None = None) -> dict[str, datetime]:
    now = _to_utc_naive(now or datetime.utcnow())

    current_end = now
    current_start = now - timedelta(days=period_days)

    previous_end = current_start
    previous_start = previous_end - timedelta(days=period_days)

    return {
        "current_start": current_start,
        "current_end": current_end,
        "previous_start": previous_start,
        "previous_end": previous_end,
    }


def get_prediction_logs(
    db: Session,
    start_dt: datetime,
    end_dt: datetime,
    team_ids: list[int] | None = None,
) -> list[PredictionEvent]:
    start_dt = _to_utc_naive(start_dt)
    end_dt = _to_utc_naive(end_dt)

    stmt = select(AuditLog).where(AuditLog.action == "PREDICT_REQUEST")
    rows = db.execute(stmt).scalars().all()

    events: list[PredictionEvent] = []

    for row in rows:
        raw_ts = getattr(row, "timestamp", None)
        if raw_ts is None:
            continue

        ts = _to_utc_naive(raw_ts)
        if ts < start_dt or ts >= end_dt:
            continue

        meta = getattr(row, "meta", None) or {}
        risk_level = _safe_str(meta.get("risk_level"))
        if risk_level not in RISK_LEVELS:
            continue

        target_user_id = _safe_int(meta.get("target_user_id"))
        target_team_id = _safe_int(meta.get("target_team_id"))

        if team_ids is not None:
            if target_team_id is None or target_team_id not in team_ids:
                continue

        events.append(
            PredictionEvent(
                timestamp=ts,
                risk_level=risk_level,
                target_user_id=target_user_id,
                target_team_id=target_team_id,
            )
        )

    return events


def summarize_prediction_events(events: list[PredictionEvent]) -> dict[str, Any]:
    total = len(events)
    risk_counts = {level: 0 for level in RISK_LEVELS}
    team_counts: dict[int, int] = defaultdict(int)
    team_high_counts: dict[int, int] = defaultdict(int)
    user_ids: set[int] = set()

    for event in events:
        risk_counts[event.risk_level] += 1

        if event.target_team_id is not None:
            team_counts[event.target_team_id] += 1
            if event.risk_level == "high":
                team_high_counts[event.target_team_id] += 1

        if event.target_user_id is not None:
            user_ids.add(event.target_user_id)

    high_ratio = (risk_counts["high"] / total) if total else 0.0

    return {
        "total_predictions": total,
        "risk_counts": risk_counts,
        "team_counts": dict(team_counts),
        "team_high_counts": dict(team_high_counts),
        "unique_users": len(user_ids),
        "high_ratio": high_ratio,
    }


def pct_change(current: float, previous: float) -> float | None:
    if previous == 0:
        if current == 0:
            return 0.0
        return None
    return ((current - previous) / previous) * 100.0


def get_prediction_summary_for_periods(
    db: Session,
    period_days: int,
    team_ids: list[int] | None = None,
) -> dict[str, Any]:
    bounds = get_period_bounds(period_days=period_days)

    current_events = get_prediction_logs(
        db=db,
        start_dt=bounds["current_start"],
        end_dt=bounds["current_end"],
        team_ids=team_ids,
    )
    previous_events = get_prediction_logs(
        db=db,
        start_dt=bounds["previous_start"],
        end_dt=bounds["previous_end"],
        team_ids=team_ids,
    )

    current = summarize_prediction_events(current_events)
    previous = summarize_prediction_events(previous_events)

    return {
        "bounds": bounds,
        "current_events": current_events,
        "previous_events": previous_events,
        "current": current,
        "previous": previous,
    }