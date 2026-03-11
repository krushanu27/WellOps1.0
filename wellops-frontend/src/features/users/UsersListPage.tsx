import { useQuery } from "@tanstack/react-query";
import { fetchUsers } from "./users.api";
import { fetchTeams } from "../teams/teams.api";
import type { User } from "./users.api";
import type { Team } from "../teams/teams.api";
import { LoadingState, EmptyState, ErrorState } from "../../shared/components/PageState";

function RoleBadge({ role }: { role: string }) {
  const cls = `wo-badge wo-badge--${role.toLowerCase()}`;
  return <span className={cls}>{role}</span>;
}

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function UsersListPage() {
  const {
    data: users,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
  });

  const { data: teams } = useQuery({
    queryKey: ["teams"],
    queryFn: fetchTeams,
  });

  if (isLoading) {
    return <LoadingState title="Users" message="Loading users…" />;
  }

  if (error) {
    return (
      <ErrorState
        title="Failed to load users"
        message="Unable to fetch users."
        action={<button onClick={() => refetch()}>Retry</button>}
      />
    );
  }

  if (!users || users.length === 0) {
    return <EmptyState title="No users" message="No users found." />;
  }

  // Build a team lookup map
  const teamMap = new Map<string, string>();
  if (teams) {
    teams.forEach((t: Team) => teamMap.set(t.id, t.name));
  }

  return (
    <div style={{ padding: 24 }}>
      <div className="wo-page-header">
        <h1>Users</h1>
        <span className="wo-stat">
          {isFetching ? "Refreshing…" : `${users.length} user${users.length !== 1 ? "s" : ""}`}
        </span>
      </div>

      <table className="wo-table">
        <thead>
          <tr>
            <th>Name / Email</th>
            <th>Role</th>
            <th>Team</th>
            <th>Joined</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u: User) => (
            <tr key={u.id}>
              <td>
                <div style={{ fontWeight: 500 }}>{u.full_name || u.email}</div>
                {u.full_name && <div className="wo-muted">{u.email}</div>}
              </td>
              <td>
                <RoleBadge role={u.role} />
              </td>
              <td>{u.team_id ? teamMap.get(u.team_id) || "—" : "—"}</td>
              <td className="wo-muted">{formatDate(u.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
