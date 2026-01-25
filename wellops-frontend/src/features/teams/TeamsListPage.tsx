import { useQuery } from "@tanstack/react-query";
import { fetchTeams } from "./teams.api";
import type { Team } from "./teams.api";
import { LoadingState, EmptyState, ErrorState } from "../../shared/components/PageState";

export function TeamsListPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["teams"],
    queryFn: fetchTeams,
  });

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

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginTop: 0 }}>Teams</h1>

      <div style={{ marginTop: 16, border: "1px solid rgba(0,0,0,0.1)", borderRadius: 10 }}>
        {data.map((t: Team, idx) => (
          <div
            key={t.id}
            style={{
              padding: 12,
              borderTop: idx === 0 ? "none" : "1px solid rgba(0,0,0,0.08)",
            }}
          >
            <div style={{ fontWeight: 500 }}>{t.name}</div>
            {t.description && (
              <div style={{ fontSize: 13, opacity: 0.75 }}>{t.description}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
