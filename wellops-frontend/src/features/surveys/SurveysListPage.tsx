import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchSurveys } from "./surveys.api";
import type { Survey } from "./surveys.api";
import { LoadingState, EmptyState, ErrorState } from "../../shared/components/PageState";

export function SurveysListPage() {
  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ["surveys"],
    queryFn: fetchSurveys,
  });

  if (isLoading) {
    return <LoadingState title="Surveys" message="Fetching survey list…" />;
  }

  if (error) {
    return (
      <ErrorState
        title="Failed to load surveys"
        message="Something went wrong while fetching surveys. Try again."
        action={<button onClick={() => refetch()}>Retry</button>}
      />
    );
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        title="No surveys"
        message="There are no surveys available yet."
      />
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1 style={{ margin: 0 }}>Surveys</h1>
        <div style={{ fontSize: 12, opacity: 0.7 }}>
          {isFetching ? "Refreshing…" : `${data.length} total`}
        </div>
      </div>

      <div style={{ marginTop: 16, border: "1px solid rgba(0,0,0,0.1)", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", padding: 12, background: "rgba(0,0,0,0.04)", fontWeight: 600 }}>
          <div>Title</div>
          <div>Created</div>
        </div>

        {data.map((s: Survey) => (
          <div
            key={s.id}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 220px",
              padding: 12,
              borderTop: "1px solid rgba(0,0,0,0.08)",
              alignItems: "center",
            }}
          >
            <div style={{ fontWeight: 500 }}>
              <Link to={`/app/surveys/${s.id}`} style={{ textDecoration: "none" }}>
                {s.title}
              </Link>
              <div style={{ fontSize: 12, opacity: 0.65 }}>ID: {s.id}</div>
            </div>

            <div style={{ fontSize: 13, opacity: 0.8 }}>
              {s.created_at ? new Date(s.created_at).toLocaleString() : "—"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
