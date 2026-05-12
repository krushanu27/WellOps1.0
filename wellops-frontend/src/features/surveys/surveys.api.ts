import { http } from "../../shared/api/http";

export interface Survey {
  id: string;
  title: string;
  description?: string | null;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED" | string;
  survey_type?: "GENERAL" | "PREDICTION";
  created_by_user_id?: string;
  created_at?: string;
  updated_at?: string;
  latest_version_id?: string | null;
  latest_version_number?: number | null;
  last_submitted_version_number?: number | null;
  has_submitted_latest?: boolean;
  new_version_available?: boolean;
}

export interface SurveyPayload {
  title: string;
  description?: string | null;
  survey_type?: "GENERAL" | "PREDICTION";
}

export interface SurveyVersion {
  id: string;
  survey_id: string;
  version_number: number;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED" | string;
  published_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Question {
  id: string;
  version_id?: string;
  question_key: string;
  prompt: string;
  type: "SCALE" | "SINGLE_CHOICE" | "MULTI_CHOICE" | "TEXT";
  scale_min?: number;
  scale_max?: number;
  options?: Record<string, any>;
  required: boolean;
  display_order: number;
}

export interface QuestionPayload {
  question_key: string;
  prompt: string;
  type: "TEXT" | "SCALE" | "SINGLE_CHOICE" | "MULTI_CHOICE";
  scale_min?: number | null;
  scale_max?: number | null;
  options?: Record<string, any> | null;
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

export async function createDraftCopy(
  surveyId: string,
  versionId: string
): Promise<SurveyVersion> {
  const res = await http.post(
    `/surveys/${surveyId}/versions/${versionId}/duplicate-to-draft`
  );
  return res.data;
}

export async function publishSurveyVersion(
  surveyId: string,
  versionId: string
): Promise<SurveyVersion> {
  const res = await http.post(`/surveys/${surveyId}/versions/${versionId}/publish`);
  return res.data;
}

export async function fetchQuestions(
  surveyId: string,
  versionId: string
): Promise<Question[]> {
  const res = await http.get(`/surveys/${surveyId}/versions/${versionId}/questions`);
  return res.data;
}

export async function createQuestion(
  surveyId: string,
  versionId: string,
  payload: QuestionPayload
): Promise<Question> {
  const res = await http.post(
    `/surveys/${surveyId}/versions/${versionId}/questions`,
    payload
  );
  return res.data;
}

export async function updateQuestion(
  surveyId: string,
  versionId: string,
  questionId: string,
  payload: QuestionPayload
): Promise<Question> {
  const res = await http.put(
    `/surveys/${surveyId}/versions/${versionId}/questions/${questionId}`,
    payload
  );
  return res.data;
}

export async function deleteQuestion(
  surveyId: string,
  versionId: string,
  questionId: string
): Promise<void> {
  await http.delete(
    `/surveys/${surveyId}/versions/${versionId}/questions/${questionId}`
  );
}

export async function submitSurvey(
  surveyId: string,
  versionId: string,
  answers: { question_id: string; value: Record<string, any> }[]
): Promise<void> {
  await http.post(`/surveys/${surveyId}/versions/${versionId}/submit`, { answers });
}