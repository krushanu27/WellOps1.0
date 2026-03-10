from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, Tuple


@dataclass(frozen=True)
class RiskResult:
    burnout: float   # 0..1
    productivity: float  # 0..1
    level: str       # LOW/MEDIUM/HIGH
    generated_at: datetime


def _clamp01(x: float) -> float:
    if x < 0.0:
        return 0.0
    if x > 1.0:
        return 1.0
    return x


def score(features: Dict[str, Any]) -> RiskResult:
    """
    Rule-based placeholder:
    - workload (0..10)
    - overtime_hours (0..40)
    - stress_score (0..10)
    - sleep_quality (0..10) higher is better
    - mood (0..10) higher is better
    """
    workload = float(features.get("workload", 5))
    overtime = float(features.get("overtime_hours", 0))
    stress = float(features.get("stress_score", 5))
    sleep = float(features.get("sleep_quality", 5))
    mood = float(features.get("mood", 5))

    # normalize
    w = _clamp01(workload / 10.0)
    o = _clamp01(overtime / 40.0)
    s = _clamp01(stress / 10.0)
    sl_bad = _clamp01(1.0 - (sleep / 10.0))
    m_bad = _clamp01(1.0 - (mood / 10.0))

    burnout = _clamp01(0.30 * w + 0.25 * o + 0.30 * s + 0.10 * sl_bad + 0.05 * m_bad)
    productivity = _clamp01(0.25 * w + 0.20 * o + 0.20 * s + 0.20 * sl_bad + 0.15 * m_bad)

    worst = max(burnout, productivity)
    if worst >= 0.67:
        level = "HIGH"
    elif worst >= 0.34:
        level = "MEDIUM"
    else:
        level = "LOW"

    return RiskResult(
        burnout=burnout,
        productivity=productivity,
        level=level,
        generated_at=datetime.now(timezone.utc),
    )