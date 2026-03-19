import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  fetchDashboardStats,
  fetchAnalyticsSummary,
  fetchPredictionTrends,
  fetchAnalyticsInsights,
} from "./dashboard.api";
import { useAuth } from "../../app/providers/AuthProvider";
import { LoadingState, ErrorState } from "../../shared/components/PageState";
import { RoleDistributionChart } from "./components/RoleDistributionChart";
import { TeamSizeChart } from "./components/TeamSizeChart";
import { SurveyStatusChart } from "./components/SurveyStatusChart";
import { PredictionTrendChart } from "./components/PredictionTrendChart";
import { RiskDistributionChart } from "./components/RiskDistributionChart";
import { InsightsPanel } from "./components/InsightsPanel";

function RoleBadge({ role }: { role: string }) {
  const cls = `wo-badge wo-badge--${role.toLowerCase()}`;
  return <span className={cls}>{role}</span>;
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`wo-badge wo-badge--status wo-badge--status-${status.toLowerCase()}`}
    >
      {status}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function DashboardPage() {
  const { role } = useAuth();
  const navigate = useNavigate();

  const dashboardQuery = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: fetchDashboardStats,
  });

  const summaryQuery = useQuery({
    queryKey: ["analytics-summary"],
    queryFn: fetchAnalyticsSummary,
  });

  const trendQuery = useQuery({
    queryKey: ["prediction-trends"],
    queryFn: fetchPredictionTrends,
  });

  const insightsQuery = useQuery({
    queryKey: ["analytics-insights", 30],
    queryFn: () => fetchAnalyticsInsights(30),
    retry: false,
  });

  const isAdmin = role === "ADMIN";
  const isManager = role === "MANAGER";
  const canManageOrg = isAdmin || isManager;

  if (
    dashboardQuery.isLoading ||
    summaryQuery.isLoading ||
    trendQuery.isLoading
  ) {
    return <LoadingState title="Dashboard" message="Loading dashboard…" />;
  }

  if (dashboardQuery.error || summaryQuery.error || trendQuery.error) {
    return (
      <ErrorState
        title="Failed to load dashboard"
        message="Unable to fetch dashboard data."
        action={
          <button
            onClick={() => {
              dashboardQuery.refetch();
              summaryQuery.refetch();
              trendQuery.refetch();
            }}
          >
            Retry
          </button>
        }
      />
    );
  }

  const data = dashboardQuery.data;
  const summary = summaryQuery.data;
  const trends = trendQuery.data;

  if (!data || !summary || !trends) return null;

  return (
    <div className="wo-page-shell">
      <div className="wo-page-header">
        <div>
          <h1 style={{ marginBottom: 4 }}>Welcome to WellOps</h1>
          <p className="wo-muted" style={{ margin: 0 }}>
            Your employee wellness platform overview
          </p>
        </div>
        {role && <RoleBadge role={role} />}
      </div>

      <div className={`wo-cards-row ${canManageOrg ? "" : "wo-cards-row--compact"}`}>
        {canManageOrg && (
          <div
            className="wo-card wo-card--clickable wo-card--metric"
            onClick={() => navigate("/app/users")}
          >
            <div className="wo-card-label">Total Users</div>
            <div className="wo-card-value">{summary.users.total}</div>
            <div className="wo-card-detail">
              <span>{summary.users.admins} admins</span>
              <span>{summary.users.managers} managers</span>
              <span>{summary.users.employees} employees</span>
            </div>
          </div>
        )}

        {canManageOrg && (
          <div
            className="wo-card wo-card--clickable wo-card--metric"
            onClick={() => navigate("/app/teams")}
          >
            <div className="wo-card-label">Teams</div>
            <div className="wo-card-value">{summary.teams.total}</div>
            <div className="wo-card-detail">
              <span>{summary.teams.with_members} with members</span>
              <span>{summary.teams.empty} empty</span>
            </div>
          </div>
        )}

        <div
          className="wo-card wo-card--clickable wo-card--metric"
          onClick={() => navigate("/app/surveys")}
        >
          <div className="wo-card-label">Surveys</div>
          <div className="wo-card-value">{summary.surveys.total}</div>
          <div className="wo-card-detail">
            <span>{summary.surveys.draft} draft</span>
            <span>{summary.surveys.active} active</span>
            <span>{summary.surveys.closed} closed</span>
          </div>
        </div>

        <div
          className="wo-card wo-card--clickable wo-card--metric wo-card--accent"
          onClick={() => navigate("/app/analytics")}
        >
          <div className="wo-card-label">Predictions</div>
          <div className="wo-card-value">{summary.predictions.analyzed}</div>
          <div className="wo-card-detail">
            <span>{summary.predictions.high_risk} high</span>
            <span>{summary.predictions.medium_risk} medium</span>
            <span>{summary.predictions.low_risk} low</span>
          </div>
        </div>
      </div>

      <InsightsPanel
        data={insightsQuery.data}
        isLoading={insightsQuery.isLoading}
        isError={insightsQuery.isError}
      />

      {canManageOrg && (
        <div className="wo-dashboard-grid">
          <RoleDistributionChart data={data.role_breakdown} />
          <TeamSizeChart data={data.team_sizes} />
        </div>
      )}

      <div className="wo-dashboard-grid">
        <PredictionTrendChart data={trends.daily_predictions} />
        <RiskDistributionChart data={trends.latest_risk_distribution} />
      </div>

      <div
        className={`wo-dashboard-grid wo-dashboard-grid--secondary ${canManageOrg ? "" : "wo-dashboard-grid--stacked"
          }`}
      >
        <SurveyStatusChart data={data.survey_status_breakdown} />

        <div className="wo-chart-card">
          <div className="wo-chart-card__header">
            <div>
              <h3>Operational Snapshot</h3>
              <p className="wo-muted">High-level readiness and usage indicators</p>
            </div>
          </div>

          <div className="wo-insight-list">
            <div className="wo-insight-item">
              <span className="wo-insight-label">Tracked users</span>
              <strong>{summary.users.total}</strong>
            </div>
            <div className="wo-insight-item">
              <span className="wo-insight-label">Predictions analyzed</span>
              <strong>{summary.predictions.analyzed}</strong>
            </div>
            <div className="wo-insight-item">
              <span className="wo-insight-label">High risk cases</span>
              <strong>{summary.predictions.high_risk}</strong>
            </div>
            <div className="wo-insight-item">
              <span className="wo-insight-label">Medium risk cases</span>
              <strong>{summary.predictions.medium_risk}</strong>
            </div>
            <div className="wo-insight-item">
              <span className="wo-insight-label">Low risk cases</span>
              <strong>{summary.predictions.low_risk}</strong>
            </div>
            <div className="wo-insight-item">
              <span className="wo-insight-label">Recent surveys listed</span>
              <strong>{data.recent_surveys.length}</strong>
            </div>
          </div>
        </div>
      </div>

      {data.recent_surveys.length > 0 && (
        <div className="wo-section-card" style={{ marginTop: 28 }}>
          <div className="wo-section-card__header">
            <div>
              <h2>Recent Surveys</h2>
              <p className="wo-muted" style={{ margin: 0 }}>
                Latest survey activity across the platform
              </p>
            </div>
          </div>

          <table className="wo-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {data.recent_surveys.map((s) => (
                <tr
                  key={s.id}
                  className="wo-row-clickable"
                  onClick={() => navigate(`/app/surveys/${s.id}`)}
                >
                  <td style={{ fontWeight: 500 }}>{s.title}</td>
                  <td>
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="wo-muted">{formatDate(s.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="wo-section-card" style={{ marginTop: 28 }}>
        <div className="wo-section-card__header">
          <div>
            <h2>Quick Actions</h2>
            <p className="wo-muted" style={{ margin: 0 }}>
              Jump to the most-used parts of WellOps
            </p>
          </div>
        </div>

        <div className="wo-quick-actions-grid">
          <button className="wo-action-tile" onClick={() => navigate("/app/surveys")}>
            <span className="wo-action-tile__icon">📋</span>
            <div>
              <strong>View Surveys</strong>
              <p>Browse existing surveys and responses</p>
            </div>
          </button>

          {canManageOrg && (
            <button className="wo-action-tile" onClick={() => navigate("/app/users")}>
              <span className="wo-action-tile__icon">👤</span>
              <div>
                <strong>Manage Users</strong>
                <p>Inspect accounts, roles, and assignments</p>
              </div>
            </button>
          )}

          {canManageOrg && (
            <button className="wo-action-tile" onClick={() => navigate("/app/teams")}>
              <span className="wo-action-tile__icon">👥</span>
              <div>
                <strong>Open Teams</strong>
                <p>Review departments and member distribution</p>
              </div>
            </button>
          )}

          <button className="wo-action-tile" onClick={() => navigate("/app/analytics")}>
            <span className="wo-action-tile__icon">⚡</span>
            <div>
              <strong>Run Prediction</strong>
              <p>Launch wellness risk analysis</p>
            </div>
          </button>

          <button className="wo-action-tile" onClick={() => navigate("/app/privacy")}>
            <span className="wo-action-tile__icon">🔒</span>
            <div>
              <strong>Privacy Policy</strong>
              <p>Review consent and privacy controls</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}