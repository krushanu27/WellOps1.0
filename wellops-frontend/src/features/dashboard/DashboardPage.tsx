import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { fetchDashboardStats } from "./dashboard.api";
import { useAuth } from "../../app/providers/AuthProvider";
import { LoadingState, ErrorState } from "../../shared/components/PageState";

function RoleBadge({ role }: { role: string }) {
  const cls = `wo-badge wo-badge--${role.toLowerCase()}`;
  return <span className={cls}>{role}</span>;
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

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: fetchDashboardStats,
  });

  if (isLoading) {
    return <LoadingState title="Dashboard" message="Loading dashboard…" />;
  }

  if (error) {
    return (
      <ErrorState
        title="Failed to load dashboard"
        message="Unable to fetch dashboard data."
        action={<button onClick={() => refetch()}>Retry</button>}
      />
    );
  }

  if (!data) return null;

  const isAdmin = role === "ADMIN";
  const isManager = role === "MANAGER";

  return (
    <div style={{ padding: 24 }}>
      {/* Welcome header */}
      <div className="wo-page-header">
        <div>
          <h1 style={{ marginBottom: 4 }}>Welcome to WellOps</h1>
          <p className="wo-muted" style={{ margin: 0 }}>
            Your employee wellness platform overview
          </p>
        </div>
        {role && <RoleBadge role={role} />}
      </div>

      {/* Stat cards */}
      <div className="wo-cards-row">
        {(isAdmin || isManager) && (
          <div
            className="wo-card wo-card--clickable"
            onClick={() => navigate("/app/users")}
          >
            <div className="wo-card-value">{data.total_users}</div>
            <div className="wo-card-label">Total Users</div>
            {data.role_breakdown && (
              <div className="wo-card-detail">
                {Object.entries(data.role_breakdown).map(([r, count]) => (
                  <span key={r}>
                    {count} {r.toLowerCase()}
                    {count !== 1 ? "s" : ""}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {(isAdmin || isManager) && (
          <div
            className="wo-card wo-card--clickable"
            onClick={() => navigate("/app/teams")}
          >
            <div className="wo-card-value">{data.total_teams}</div>
            <div className="wo-card-label">Teams</div>
          </div>
        )}

        <div
          className="wo-card wo-card--clickable"
          onClick={() => navigate("/app/surveys")}
        >
          <div className="wo-card-value">{data.total_surveys}</div>
          <div className="wo-card-label">Surveys</div>
        </div>

        <div
          className="wo-card wo-card--clickable"
          onClick={() => navigate("/app/analytics")}
        >
          <div className="wo-card-value">⚡</div>
          <div className="wo-card-label">Run Prediction</div>
        </div>
      </div>

      {/* Recent surveys */}
      {data.recent_surveys.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: "1.1rem", marginBottom: 12 }}>
            Recent Surveys
          </h2>
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
                    <span
                      className={`wo-badge ${
                        s.status === "DRAFT"
                          ? "wo-badge--employee"
                          : "wo-badge--manager"
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="wo-muted">{formatDate(s.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Quick actions */}
      <div style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: "1.1rem", marginBottom: 12 }}>Quick Actions</h2>
        <div className="wo-cards-row">
          <div
            className="wo-card wo-card--clickable wo-card--compact"
            onClick={() => navigate("/app/surveys")}
          >
            📋 View Surveys
          </div>
          <div
            className="wo-card wo-card--clickable wo-card--compact"
            onClick={() => navigate("/app/analytics")}
          >
            📊 Analytics
          </div>
          {(isAdmin || isManager) && (
            <div
              className="wo-card wo-card--clickable wo-card--compact"
              onClick={() => navigate("/app/teams")}
            >
              👥 Manage Teams
            </div>
          )}
          {(isAdmin || isManager) && (
            <div
              className="wo-card wo-card--clickable wo-card--compact"
              onClick={() => navigate("/app/users")}
            >
              🧑‍💼 Manage Users
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
