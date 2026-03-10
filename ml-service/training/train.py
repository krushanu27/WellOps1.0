import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import mean_squared_error, r2_score
import joblib
import os

# ── 1. Synthetic data generation ─────────────────────────────────────────────
np.random.seed(42)
N = 5000

def generate_synthetic_data(n):
    workload = np.random.uniform(0, 10, n)
    overtime_hours = np.random.uniform(0, 40, n)
    stress_score = np.random.uniform(0, 10, n)
    sleep_quality = np.random.uniform(0, 10, n)
    mood = np.random.uniform(0, 10, n)

    # Burnout: high workload, stress, overtime, low sleep/mood → high burnout
    burnout = (
        0.30 * (workload / 10) +
        0.35 * (stress_score / 10) +
        0.20 * (1 - sleep_quality / 10) +
        0.10 * (overtime_hours / 40) +
        0.05 * (1 - mood / 10) +
        np.random.normal(0, 0.05, n)  # noise
    ).clip(0, 1)

    # Productivity: driven more by mood, sleep, stress
    productivity_risk = (
        0.25 * (stress_score / 10) +
        0.25 * (1 - sleep_quality / 10) +
        0.20 * (overtime_hours / 40) +
        0.20 * (1 - mood / 10) +
        0.10 * (workload / 10) +
        np.random.normal(0, 0.05, n)
    ).clip(0, 1)

    return pd.DataFrame({
        "workload": workload,
        "overtime_hours": overtime_hours,
        "stress_score": stress_score,
        "sleep_quality": sleep_quality,
        "mood": mood,
        "burnout_score": burnout,
        "productivity_risk_score": productivity_risk,
    })

print("Generating synthetic training data...")
df = generate_synthetic_data(N)
print(f"Dataset shape: {df.shape}")
print(df.describe())

# ── 2. Features & targets ─────────────────────────────────────────────────────
FEATURES = ["workload", "overtime_hours", "stress_score", "sleep_quality", "mood"]
X = df[FEATURES]
y_burnout = df["burnout_score"]
y_productivity = df["productivity_risk_score"]

X_train, X_test, yb_train, yb_test, yp_train, yp_test = train_test_split(
    X, y_burnout, y_productivity, test_size=0.2, random_state=42
)

# ── 3. Train burnout model ────────────────────────────────────────────────────
print("\nTraining burnout model...")
burnout_model = Pipeline([
    ("scaler", StandardScaler()),
    ("model", GradientBoostingRegressor(n_estimators=200, max_depth=4, random_state=42))
])
burnout_model.fit(X_train, yb_train)
yb_pred = burnout_model.predict(X_test)
print(f"Burnout  → RMSE: {mean_squared_error(yb_test, yb_pred)**0.5:.4f}  R²: {r2_score(yb_test, yb_pred):.4f}")

# ── 4. Train productivity model ───────────────────────────────────────────────
print("\nTraining productivity model...")
productivity_model = Pipeline([
    ("scaler", StandardScaler()),
    ("model", GradientBoostingRegressor(n_estimators=200, max_depth=4, random_state=42))
])
productivity_model.fit(X_train, yp_train)
yp_pred = productivity_model.predict(X_test)
print(f"Productivity → RMSE: {mean_squared_error(yp_test, yp_pred)**0.5:.4f}  R²: {r2_score(yp_test, yp_pred):.4f}")

# ── 5. Save models ────────────────────────────────────────────────────────────
os.makedirs("../models", exist_ok=True)
joblib.dump(burnout_model, "../models/burnout_model.pkl")
joblib.dump(productivity_model, "../models/productivity_model.pkl")
print("\nModels saved to ../models/")
print("Done!")