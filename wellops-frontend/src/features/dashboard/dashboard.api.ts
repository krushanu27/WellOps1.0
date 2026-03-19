import { http } from "../../shared/api/http";

export interface DashboardSurveySummary {
  id: string;
  title: string;
  status: string;
  created_at: string;
}

export interface DashboardTeamSize {
  name: string;
  size: number;
}

export interface DashboardStats {
  total_users: number;
  total_teams: number;
  total_surveys: number;
  role_breakdown: Record<string, number>;
  team_sizes: DashboardTeamSize[];
  survey_status_breakdown: Record<string, number>;
  recent_surveys: DashboardSurveySummary[];
}

export interface AnalyticsSummary {
  users: {
    total: number;
    admins: number;
    managers: number;
    employees: number;
  };
  teams: {
    total: number;
    with_members: number;
    empty: number;
  };
  surveys: {
    total: number;
    draft: number;
    active: number;
    closed: number;
    published: number;
    archived: number;
  };
  predictions: {
    analyzed: number;
    high_risk: number;
    medium_risk: number;
    low_risk: number;
  };
}

export interface PredictionTrend {
  date: string;
  count: number;
}

export interface PredictionTrendResponse {
  daily_predictions: PredictionTrend[];
  latest_risk_distribution: Record<string, number>;
}

export type InsightSeverity = "critical" | "high" | "medium" | "low" | "info";

export type InsightCategory =
  | "risk"
  | "trend"
  | "team"
  | "participation"
  | "stability";

export type InsightScope = "org" | "team";

export interface InsightMetric {
  label: string;
  value: number | string;
  change_pct?: number | null;
}

export interface InsightItem {
  id: string;
  category: InsightCategory;
  severity: InsightSeverity;
  title: string;
  summary: string;
  recommendation: string;
  metrics: InsightMetric[];
  scope: InsightScope;
  team_id?: number | null;
}

export interface InsightsResponse {
  generated_at: string;
  period_days: number;
  scope: InsightScope;
  team_ids: number[];
  items: InsightItem[];
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const res = await http.get("/analytics/dashboard");
  return res.data;
}

export async function fetchAnalyticsSummary(): Promise<AnalyticsSummary> {
  const res = await http.get("/analytics/summary");
  return res.data;
}

export async function fetchPredictionTrends(): Promise<PredictionTrendResponse> {
  const res = await http.get("/analytics/prediction-trends");
  return res.data;
}

export async function fetchAnalyticsInsights(
  periodDays = 30
): Promise<InsightsResponse> {
  const res = await http.get("/analytics/insights", {
    params: { period_days: periodDays },
  });

  const data = res.data;

  // backward compatibility in case old response shape still appears somewhere
  if (Array.isArray(data)) {
    return {
      generated_at: new Date().toISOString(),
      period_days: periodDays,
      scope: "org",
      team_ids: [],
      items: data,
    };
  }

  if (data?.insights && Array.isArray(data.insights)) {
    return {
      generated_at: data.generated_at ?? new Date().toISOString(),
      period_days: data.period_days ?? periodDays,
      scope: data.scope ?? "org",
      team_ids: data.team_ids ?? [],
      items: data.insights,
    };
  }

  return data;
}