import { http } from "../../shared/api/http";

export interface Team {
  id: string;
  name: string;
  department: string;
  created_at: string;
}

export interface TeamUser {
  id: string;
  email: string;
  role: string;
  team_id: string;
}

export async function fetchTeams(): Promise<Team[]> {
  const res = await http.get("/teams");
  return res.data;
}

export async function fetchTeamUsers(teamId: string): Promise<TeamUser[]> {
  const res = await http.get(`/teams/${teamId}/users`);
  return res.data;
}
