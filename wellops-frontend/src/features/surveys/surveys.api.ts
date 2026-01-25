import { http } from "../../shared/api/http";

export interface Survey {
  id: string;
  title: string;
  created_at?: string;
}

export async function fetchSurveys(): Promise<Survey[]> {
  const res = await http.get("/surveys");
  return res.data;
}

export async function fetchSurveyById(id: string): Promise<Survey> {
  const res = await http.get(`/surveys/${id}`);
  return res.data;
}
