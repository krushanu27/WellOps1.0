from __future__ import annotations
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_squared_error, r2_score
import joblib
import os

FEATURES = ["workload", "overtime_hours", "stress_score", "sleep_quality", "mood"]

# ── 1. Load & process IBM HR dataset ─────────────────────────────────────────
def process_ibm(path: str) -> pd.DataFrame:
    df = pd.read_csv(path)

    # Map overtime: Yes→30, No→0
    df["overtime_hours"] = df["OverTime"].map({"Yes": 30, "No": 0}).fillna(0)

    # WorkLifeBalance 1-4 → stress (inverted, scaled 0-10)
    df["stress_score"] = ((5 - df["WorkLifeBalance"]) / 4 * 10).clip(0, 10)

    # JobInvolvement 1-4 → workload (scaled 0-10)
    df["workload"] = ((df["JobInvolvement"] - 1) / 3 * 10).clip(0, 10)

    # EnvironmentSatisfaction 1-4 → sleep quality (scaled 0-10)
    df["sleep_quality"] = ((df["EnvironmentSatisfaction"] - 1) / 3 * 10).clip(0, 10)

    # JobSatisfaction 1-4 → mood (scaled 0-10)
    df["mood"] = ((df["JobSatisfaction"] - 1) / 3 * 10).clip(0, 10)

    # Burnout proxy: Attrition=Yes + low satisfaction = high burnout
    attrition = (df["Attrition"] == "Yes").astype(float)
    low_satisfaction = 1 - (df["JobSatisfaction"] / 4)
    high_stress = 1 - (df["WorkLifeBalance"] / 4)
    df["burnout_score"] = (0.5 * attrition + 0.3 * low_satisfaction + 0.2 * high_stress).clip(0, 1)

    # Productivity risk: driven by performance & satisfaction
    perf = (df["PerformanceRating"] - 1) / 3  # 1-4 scale
    df["productivity_risk_score"] = (
        0.4 * low_satisfaction +
        0.3 * high_stress +
        0.3 * (1 - perf)
    ).clip(0, 1)

    return df[FEATURES + ["burnout_score", "productivity_risk_score"]].dropna()


# ── 2. Load & process OSMI dataset ───────────────────────────────────────────
def process_osmi(path: str) -> pd.DataFrame:
    df = pd.read_csv(path)

    # work_interfere: Often/Always=high stress
    interfere_map = {"Never": 0, "Rarely": 2.5, "Sometimes": 5, "Often": 7.5, "Always": 10}
    df["stress_score"] = df["work_interfere"].map(interfere_map).fillna(5)

    # remote_work: Yes=lower workload
    df["workload"] = df["remote_work"].map({"Yes": 4, "No": 7}).fillna(5.5)

    # wellness_program: Yes=better sleep
    df["sleep_quality"] = df["wellness_program"].map({"Yes": 7, "No": 4, "Don't know": 5}).fillna(5)

    # treatment sought = proxy for mood issues
    df["mood"] = df["treatment"].map({"Yes": 3, "No": 7}).fillna(5)

    # No overtime info in OSMI, use moderate default
    df["overtime_hours"] = 10.0

    # Burnout proxy: sought treatment + work interference
    treatment = (df["treatment"] == "Yes").astype(float)
    stress_norm = df["stress_score"] / 10
    df["burnout_score"] = (0.6 * treatment + 0.4 * stress_norm).clip(0, 1)

    # Productivity risk
    df["productivity_risk_score"] = (
        0.5 * stress_norm +
        0.3 * treatment +
        0.2 * (1 - df["mood"] / 10)
    ).clip(0, 1)

    return df[FEATURES + ["burnout_score", "productivity_risk_score"]].dropna()


# ── 3. Generate synthetic data ────────────────────────────────────────────────
def generate_synthetic(n: int = 3000) -> pd.DataFrame:
    np.random.seed(42)
    workload = np.random.uniform(0, 10, n)
    overtime_hours = np.random.uniform(0, 40, n)
    stress_score = np.random.uniform(0, 10, n)
    sleep_quality = np.random.uniform(0, 10, n)
    mood = np.random.uniform(0, 10, n)

    burnout = (
        0.30 * (workload / 10) +
        0.35 * (stress_score / 10) +
        0.20 * (1 - sleep_quality / 10) +
        0.10 * (overtime_hours / 40) +
        0.05 * (1 - mood / 10) +
        np.random.normal(0, 0.04, n)
    ).clip(0, 1)

    productivity_risk = (
        0.25 * (stress_score / 10) +
        0.25 * (1 - sleep_quality / 10) +
        0.20 * (overtime_hours / 40) +
        0.20 * (1 - mood / 10) +
        0.10 * (workload / 10) +
        np.random.normal(0, 0.04, n)
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


# ── 4. Combine datasets ───────────────────────────────────────────────────────
print("Loading datasets...")
ibm = process_ibm(r"training\ibmhr\ibmhr.csv")
osmi = process_osmi(r"training\osmi\osmi_mental_health.csv")
synthetic = generate_synthetic(3000)

print(f"IBM rows: {len(ibm)}, OSMI rows: {len(osmi)}, Synthetic rows: {len(synthetic)}")

df = pd.concat([ibm, osmi, synthetic], ignore_index=True)
print(f"Combined dataset: {df.shape}")
print(df.describe())

# ── 5. Train ──────────────────────────────────────────────────────────────────
X = df[FEATURES]
y_burnout = df["burnout_score"]
y_productivity = df["productivity_risk_score"]

X_train, X_test, yb_train, yb_test, yp_train, yp_test = train_test_split(
    X, y_burnout, y_productivity, test_size=0.2, random_state=42
)

print("\nTraining burnout model...")
burnout_model = Pipeline([
    ("scaler", StandardScaler()),
    ("model", GradientBoostingRegressor(n_estimators=300, max_depth=5, learning_rate=0.05, random_state=42))
])
burnout_model.fit(X_train, yb_train)
yb_pred = burnout_model.predict(X_test)
print(f"Burnout  → RMSE: {mean_squared_error(yb_test, yb_pred)**0.5:.4f}  R²: {r2_score(yb_test, yb_pred):.4f}")

print("\nTraining productivity model...")
productivity_model = Pipeline([
    ("scaler", StandardScaler()),
    ("model", GradientBoostingRegressor(n_estimators=300, max_depth=5, learning_rate=0.05, random_state=42))
])
productivity_model.fit(X_train, yp_train)
yp_pred = productivity_model.predict(X_test)
print(f"Productivity → RMSE: {mean_squared_error(yp_test, yp_pred)**0.5:.4f}  R²: {r2_score(yp_test, yp_pred):.4f}")

# ── 6. Save ───────────────────────────────────────────────────────────────────
os.makedirs("models", exist_ok=True)
joblib.dump(burnout_model, r"C:\dev\WellOps1\ml-service\models\burnout_model.pkl")
joblib.dump(productivity_model, r"C:\dev\WellOps1\ml-service\models\productivity_model.pkl")
print("Done!")