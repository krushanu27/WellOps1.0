import {http} from "../shared/api/http";

export type PredictRequest = {
  team_id?: string;
  user_id?: string;
  survey_version_id?: string;
  features: {
    workload: number;
    overtime_hours: number;
    stress_score: number;
    sleep_quality: number;
    mood: number;
  };
};

export type PredictResponse = {
  burnout_risk_score: number;
  productivity_risk_score: number;
  risk_level: "LOW" | "MEDIUM" | "HIGH";
  generated_at: string;
};

export async function predict(payload: PredictRequest): Promise<PredictResponse> {
  const res = await http.post<PredictResponse>("/analytics/predict", payload);
  return res.data;
}