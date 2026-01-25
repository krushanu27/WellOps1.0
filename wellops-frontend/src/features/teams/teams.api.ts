import { http } from "../../shared/api/http";

export interface Team {
  id: string;
  name: string;
  description?: string;
}

export async function fetchTeams(): Promise<Team[]> {
  const res = await http.get("/teams");
  return res.data;
}
