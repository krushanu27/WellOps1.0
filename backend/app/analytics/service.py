from __future__ import annotations

from datetime import datetime, timezone
from typing import Tuple
import requests

ML_SERVICE_URL = "http://127.0.0.1:8001"


def score_risks_ml(features) -> Tuple[float, float, str]:
    """Call the ML service for predictions."""
    try:
        response = requests.post(
            f"{ML_SERVICE_URL}/predict",
            json={
                "workload": features.workload,
                "overtime_hours": features.overtime_hours,
                "stress_score": features.stress_score,
                "sleep_quality": features.sleep_quality,
                "mood": features.mood,
            },
            timeout=5,
        )
        response.raise_for_status()
        data = response.json()
        return data["burnout_risk_score"], data["productivity_risk_score"], data["risk_level"]

    except Exception as e:
        # Fallback to rule-based scoring if ML service is down
        print(f"ML service unavailable, falling back to rule-based: {e}")
        return score_risks_fallback(features)


def score_risks_fallback(features) -> Tuple[float, float, str]:
    """Rule-based fallback if ML service is unavailable."""
    def clamp01(x): return max(0.0, min(1.0, x))

    workload = features.workload / 10.0
    stress = features.stress_score / 10.0
    sleep_bad = 1.0 - (features.sleep_quality / 10.0)
    mood_bad = 1.0 - (features.mood / 10.0)
    overtime = clamp01(features.overtime_hours / 40.0)

    burnout = clamp01(0.30 * workload + 0.35 * stress + 0.20 * sleep_bad + 0.10 * overtime + 0.05 * mood_bad)
    productivity = clamp01(0.25 * stress + 0.25 * sleep_bad + 0.20 * overtime + 0.20 * mood_bad + 0.10 * workload)

    worst = max(burnout, productivity)
    level = "HIGH" if worst >= 0.70 else "MEDIUM" if worst >= 0.40 else "LOW"
    return burnout, productivity, level


# Keep old name as alias for backward compatibility
score_risks = score_risks_ml


def generated_at() -> datetime:
    return datetime.now(timezone.utc)