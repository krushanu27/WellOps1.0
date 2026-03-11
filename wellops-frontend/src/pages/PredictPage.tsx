import { useState } from "react";
import { predict } from "../api/analytics";
import type { PredictResponse } from "../api/analytics";
import { EmptyState, ErrorState, LoadingState } from "../shared/components/PageState";

type FormState = {
  workload: string;
  overtime_hours: string;
  stress_score: string;
  sleep_quality: string;
  mood: string;

  user_id: string;
  team_id: string;
  survey_version_id: string;
};

export default function PredictPage() {
  const [form, setForm] = useState<FormState>({
    workload: "5",
    overtime_hours: "0",
    stress_score: "5",
    sleep_quality: "5",
    mood: "5",
    user_id: "",
    team_id: "",
    survey_version_id: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PredictResponse | null>(null);

  const onChange =
    (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((s) => ({ ...s, [key]: e.target.value }));
    };

  const toNum = (s: string, fallback = 0) => {
    const n = Number(s);
    return Number.isFinite(n) ? n : fallback;
  };

  async function onSubmit() {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const payload = {
        team_id: form.team_id.trim() || undefined,
        user_id: form.user_id.trim() || undefined,
        survey_version_id: form.survey_version_id.trim() || undefined,
        features: {
          workload: toNum(form.workload, 0),
          overtime_hours: toNum(form.overtime_hours, 0),
          stress_score: toNum(form.stress_score, 0),
          sleep_quality: toNum(form.sleep_quality, 0),
          mood: toNum(form.mood, 0),
        },
      };

      const res = await predict(payload);
      setData(res);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || "Request failed";
      setError(String(msg));
    } finally {
      setLoading(false);
    }
  }

  const levelClass = data
    ? `wo-result-card wo-result-card--${data.risk_level.toLowerCase()}`
    : "";

  return (
    <div style={{ maxWidth: 760, padding: 24 }}>
      <div className="wo-page-header">
        <div>
          <h1 style={{ marginBottom: 4 }}>Burnout Prediction</h1>
          <p className="wo-muted" style={{ margin: 0 }}>
            Enter wellness metrics to predict burnout and productivity risk
          </p>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 4,
          marginTop: 16,
        }}
      >
        <Field
          label="Workload (0–10)"
          value={form.workload}
          onChange={onChange("workload")}
        />
        <Field
          label="Overtime hours (0–40)"
          value={form.overtime_hours}
          onChange={onChange("overtime_hours")}
        />
        <Field
          label="Stress score (0–10)"
          value={form.stress_score}
          onChange={onChange("stress_score")}
        />
        <Field
          label="Sleep quality (0–10)"
          value={form.sleep_quality}
          onChange={onChange("sleep_quality")}
        />
        <Field
          label="Mood (0–10)"
          value={form.mood}
          onChange={onChange("mood")}
        />
      </div>

      <h3 style={{ marginTop: 20, fontSize: "0.9rem", opacity: 0.7 }}>
        Optional overrides (ADMIN / MANAGER only)
      </h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 }}>
        <Field label="Team ID" value={form.team_id} onChange={onChange("team_id")} />
        <Field label="User ID" value={form.user_id} onChange={onChange("user_id")} />
        <Field
          label="Survey Version ID"
          value={form.survey_version_id}
          onChange={onChange("survey_version_id")}
        />
      </div>

      <div style={{ marginTop: 18 }}>
        <button
          className="wo-btn-primary"
          onClick={onSubmit}
          disabled={loading}
          style={{ width: "auto", padding: "10px 28px" }}
        >
          {loading ? "Predicting…" : "Run Prediction"}
        </button>
      </div>

      <div style={{ marginTop: 16 }}>
        {loading && (
          <LoadingState title="Predicting…" message="Crunching the numbers…" />
        )}

        {!loading && error && (
          <ErrorState title="Prediction failed" message={error} />
        )}

        {!loading && !error && !data && (
          <EmptyState
            title="No prediction yet"
            message="Fill the inputs and click Run Prediction."
          />
        )}

        {data && (
          <div className={levelClass}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>
              Risk Level:{" "}
              <span
                className={`wo-badge wo-badge--${
                  data.risk_level === "LOW"
                    ? "employee"
                    : data.risk_level === "MEDIUM"
                    ? "manager"
                    : "admin"
                }`}
                style={{ fontSize: "0.82rem" }}
              >
                {data.risk_level}
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <div className="wo-muted">Burnout Risk</div>
                <div style={{ fontSize: "1.4rem", fontWeight: 700 }}>
                  {(data.burnout_risk_score * 100).toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="wo-muted">Productivity Risk</div>
                <div style={{ fontSize: "1.4rem", fontWeight: 700 }}>
                  {(data.productivity_risk_score * 100).toFixed(1)}%
                </div>
              </div>
            </div>
            <div className="wo-muted" style={{ marginTop: 10 }}>
              Generated at: {new Date(data.generated_at).toLocaleString()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChange: (e: any) => void;
}) {
  return (
    <div className="wo-field">
      <label className="wo-field-label">{props.label}</label>
      <input
        className="wo-input"
        value={props.value}
        onChange={props.onChange}
      />
    </div>
  );
}