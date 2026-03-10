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

  // ALWAYS returns a number (never undefined)
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

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>Analytics Prediction</h1>
      <p style={{ opacity: 0.8 }}>
        Rule-based placeholder scoring. Later you can swap in a real ML model without changing the API contract.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
        <Field label="Workload (0-10)" value={form.workload} onChange={onChange("workload")} />
        <Field label="Overtime hours (0-40)" value={form.overtime_hours} onChange={onChange("overtime_hours")} />
        <Field label="Stress score (0-10)" value={form.stress_score} onChange={onChange("stress_score")} />
        <Field label="Sleep quality (0-10)" value={form.sleep_quality} onChange={onChange("sleep_quality")} />
        <Field label="Mood (0-10)" value={form.mood} onChange={onChange("mood")} />
      </div>

      <h3 style={{ marginTop: 18 }}>Optional overrides (ADMIN/MANAGER only)</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="team_id" value={form.team_id} onChange={onChange("team_id")} />
        <Field label="user_id" value={form.user_id} onChange={onChange("user_id")} />
        <Field label="survey_version_id" value={form.survey_version_id} onChange={onChange("survey_version_id")} />
      </div>

      <div style={{ marginTop: 16 }}>
        <button
          onClick={onSubmit}
          disabled={loading}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #333",
            cursor: loading ? "not-allowed" : "pointer",
            fontWeight: 600,
          }}
        >
          {loading ? "Predicting..." : "Predict"}
        </button>
      </div>

      <div style={{ marginTop: 16 }}>
        {loading && <LoadingState title="Predicting..." message="Crunching the numbers..." />}

        {!loading && error && <ErrorState title="Prediction failed" message={error} />}

        {!loading && !error && !data && (
          <EmptyState title="No prediction yet" message="Fill the inputs and click Predict." />
        )}

        {data && (
          <div style={{ border: "1px solid #333", borderRadius: 12, padding: 14, marginTop: 12 }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>Risk Level: {data.risk_level}</div>
            <div style={{ marginTop: 8 }}>
              Burnout Risk: {(data.burnout_risk_score * 100).toFixed(1)}%
            </div>
            <div>
              Productivity Risk: {(data.productivity_risk_score * 100).toFixed(1)}%
            </div>
            <div style={{ marginTop: 8, opacity: 0.8, fontSize: 12 }}>
              Generated at: {new Date(data.generated_at).toLocaleString()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field(props: { label: string; value: string; onChange: (e: any) => void }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 13, opacity: 0.85 }}>{props.label}</span>
      <input
        value={props.value}
        onChange={props.onChange}
        style={{
          padding: "10px 12px",
          borderRadius: 10,
          border: "1px solid #333",
          outline: "none",
        }}
      />
    </label>
  );
}