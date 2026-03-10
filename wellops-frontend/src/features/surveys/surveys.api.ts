import { http } from "../../shared/api/http";

export interface Survey {
  id: string;
  title: string;
  description?: string;
  status?: string;
  created_at?: string;
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

export async function fetchQuestions(surveyId: string, versionId: string): Promise<Question[]> {
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