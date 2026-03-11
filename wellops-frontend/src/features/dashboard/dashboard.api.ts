import { http } from "../../shared/api/http";

export interface DashboardStats {
  total_users: number;
  total_teams: number;
  total_surveys: number;
  role_breakdown: Record<string, number>;
  recent_surveys: {
    id: string;
    title: string;
    status: string;
    created_at: string;
  }[];
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const res = await http.get("/analytics/dashboard");
  return res.data;
}
