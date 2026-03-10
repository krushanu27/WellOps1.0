from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
import joblib
import numpy as np
import os
from datetime import datetime, timezone

app = FastAPI(title="WellOps ML Service")

# Load models at startup
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.path.join(BASE_DIR, "models")

burnout_model = None
productivity_model = None

@app.on_event("startup")
def load_models():
    global burnout_model, productivity_model
    burnout_model = joblib.load(os.path.join(MODELS_DIR, "burnout_model.pkl"))
    productivity_model = joblib.load(os.path.join(MODELS_DIR, "productivity_model.pkl"))
    print("Models loaded successfully!")


class PredictRequest(BaseModel):
    workload: float = Field(..., ge=0, le=10)
    overtime_hours: float = Field(..., ge=0, le=40)
    stress_score: float = Field(..., ge=0, le=10)
    sleep_quality: float = Field(..., ge=0, le=10)
    mood: float = Field(..., ge=0, le=10)


class PredictResponse(BaseModel):
    burnout_risk_score: float
    productivity_risk_score: float
    risk_level: str
    generated_at: str


@app.get("/health")
def health():
    return {"status": "ok", "models_loaded": burnout_model is not None}


@app.post("/predict", response_model=PredictResponse)
def predict(payload: PredictRequest):
    if burnout_model is None or productivity_model is None:
        raise HTTPException(500, "Models not loaded")

    features = np.array([[
        payload.workload,
        payload.overtime_hours,
        payload.stress_score,
        payload.sleep_quality,
        payload.mood,
    ]])

    burnout = float(np.clip(burnout_model.predict(features)[0], 0, 1))
    productivity = float(np.clip(productivity_model.predict(features)[0], 0, 1))

    worst = max(burnout, productivity)
    if worst >= 0.70:
        level = "HIGH"
    elif worst >= 0.40:
        level = "MEDIUM"
    else:
        level = "LOW"

    return PredictResponse(
        burnout_risk_score=round(burnout, 4),
        productivity_risk_score=round(productivity, 4),
        risk_level=level,
        generated_at=datetime.now(timezone.utc).isoformat(),
    )