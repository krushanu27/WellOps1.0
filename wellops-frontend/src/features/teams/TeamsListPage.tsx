import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchTeams, fetchTeamUsers } from "./teams.api";
import type { Team, TeamUser } from "./teams.api";
import { LoadingState, EmptyState, ErrorState } from "../../shared/components/PageState";

function RoleBadge({ role }: { role: string }) {
  const cls = `wo-badge wo-badge--${role.toLowerCase()}`;
  return <span className={cls}>{role}</span>;
}

function TeamMembersRow({ teamId, colSpan }: { teamId: string; colSpan: number }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["team-users", teamId],
    queryFn: () => fetchTeamUsers(teamId),
  });

  return (
    <tr className="wo-expand-row">
      <td colSpan={colSpan}>
        <div className="wo-expand-inner">
          <strong>Members</strong>
          {isLoading && <div className="wo-muted">Loading members…</div>}
          {error && <div style={{ color: "darkred" }}>Failed to load members.</div>}
          {data && data.length === 0 && <div className="wo-muted">No members in this team.</div>}
          {data && data.length > 0 && (
            <ul>
              {data.map((u: TeamUser) => (
                <li key={u.id}>
                  {u.email} <RoleBadge role={u.role} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </td>
    </tr>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function TeamsListPage() {
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["teams"],
    queryFn: fetchTeams,
  });

  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (isLoading) {
    return <LoadingState title="Teams" message="Loading teams…" />;
  }

  if (error) {
    return (
      <ErrorState
        title="Failed to load teams"
        message="Unable to fetch teams."
        action={<button onClick={() => refetch()}>Retry</button>}
      />
    );
  }

  if (!data || data.length === 0) {
    return <EmptyState title="No teams" message="No teams found." />;
  }

  const colCount = 4;

  return (
    <div style={{ padding: 24 }}>
      <div className="wo-page-header">
        <h1>Teams</h1>
        <span className="wo-stat">
          {isFetching ? "Refreshing…" : `${data.length} team${data.length !== 1 ? "s" : ""}`}
        </span>
      </div>

      <table className="wo-table">
        <thead>
          <tr>
            <th></th>
            <th>Team Name</th>
            <th>Department</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {data.map((t: Team) => {
            const isOpen = expandedId === t.id;
            return (
              <>
                <tr
                  key={t.id}
                  className="wo-row-clickable"
                  onClick={() => setExpandedId(isOpen ? null : t.id)}
                >
                  <td style={{ width: 32, textAlign: "center" }}>
                    {isOpen ? "▾" : "▸"}
                  </td>
                  <td style={{ fontWeight: 500 }}>{t.name}</td>
                  <td>{t.department}</td>
                  <td className="wo-muted">{formatDate(t.created_at)}</td>
                </tr>
                {isOpen && (
                  <TeamMembersRow key={`${t.id}-members`} teamId={t.id} colSpan={colCount} />
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
