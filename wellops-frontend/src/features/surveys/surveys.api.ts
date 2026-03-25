import { http } from "../../shared/api/http";

export interface Survey {
  id: string;
  title: string;
  description?: string | null;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED" | string;
  created_by_user_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SurveyPayload {
  title: string;
  description?: string | null;
}

export interface SurveyVersion {
  id: string;
  survey_id: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED" | string;
  created_at?: string;
  updated_at?: string;
}

export interface Question {
  id: string;
  question_key: string;
  prompt: string;
  type: "SCALE" | "SINGLE_CHOICE" | "MULTI_CHOICE" | "TEXT";
  scale_min?: number;
  scale_max?: number;
  options?: Record<string, any>;
  required: boolean;
  display_order: number;
}

export async function fetchSurveys(): Promise<Survey[]> {
  const res = await http.get("/surveys");
  return res.data;
}

export async function fetchSurveyById(id: string): Promise<Survey> {
  const res = await http.get(`/surveys/${id}`);
  return res.data;
}

export async function createSurvey(payload: SurveyPayload): Promise<Survey> {
  const res = await http.post("/surveys", payload);
  return res.data;
}

export async function updateSurvey(
  surveyId: string,
  payload: SurveyPayload
): Promise<Survey> {
  const res = await http.put(`/surveys/${surveyId}`, payload);
  return res.data;
}

export async function deleteSurvey(surveyId: string): Promise<void> {
  await http.delete(`/surveys/${surveyId}`);
}

export async function fetchActiveSurveyVersion(
  surveyId: string
): Promise<SurveyVersion> {
  const res = await http.get(`/surveys/${surveyId}/active-version`);
  return res.data;
}

export async function fetchQuestions(
  surveyId: string,
  versionId: string
): Promise<Question[]> {
  const res = await http.get(`/surveys/${surveyId}/versions/${versionId}/questions`);
  return res.data;
}

export async function submitSurvey(
  surveyId: string,
  versionId: string,
  answers: { question_id: string; value: Record<string, any> }[]
): Promise<void> {
  await http.post(`/surveys/${surveyId}/versions/${versionId}/submit`, { answers });
}