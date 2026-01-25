import { useQuery } from "@tanstack/react-query";
import { fetchUsers } from "./users.api";
import type { User } from "./users.api";
import { LoadingState, EmptyState, ErrorState } from "../../shared/components/PageState";

export function UsersListPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
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

  if (!data || data.length === 0) {
    return <EmptyState title="No users" message="No users found." />;
  }

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginTop: 0 }}>Users</h1>

      <div style={{ marginTop: 16, border: "1px solid rgba(0,0,0,0.1)", borderRadius: 10 }}>
        {data.map((u: User, idx) => (
          <div
            key={u.id}
            style={{
              padding: 12,
              borderTop: idx === 0 ? "none" : "1px solid rgba(0,0,0,0.08)",
            }}
          >
            <div style={{ fontWeight: 500 }}>{u.full_name || "—"}</div>
            <div style={{ fontSize: 13, opacity: 0.75 }}>{u.email}</div>
            <div style={{ fontSize: 12, opacity: 0.6 }}>
              Status: {u.is_active ? "Active" : "Inactive"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
