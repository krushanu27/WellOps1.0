import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchSurveyById } from "./surveys.api";
import { LoadingState, ErrorState } from "../../shared/components/PageState";
import axios from "axios";

export function SurveyDetailPage() {
  const { id } = useParams<{ id: string }>();

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["survey", id],
    queryFn: () => fetchSurveyById(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return <LoadingState title="Survey details" message="Loading survey…" />;
  }

  // Handle 404 vs generic error cleanly
  if (error) {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;

    return (
      <ErrorState
        title={status === 404 ? "Survey not found" : "Failed to load survey"}
        message={
          status === 404
            ? "This survey ID doesn’t exist (or you don’t have access)."
            : "Something went wrong while loading this survey."
        }
        action={
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => refetch()}>Retry</button>
            <Link to="/app/surveys">Back to surveys</Link>
          </div>
        }
      />
    );
  }

  if (!data) {
    return (
      <ErrorState
        title="Survey not found"
        message="No data returned for this survey."
        action={<Link to="/app/surveys">Back to surveys</Link>}
      />
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 12 }}>
        <Link to="/app/surveys">← Back to surveys</Link>
      </div>

      <h1 style={{ marginTop: 0 }}>{data.title}</h1>

      <div style={{ marginTop: 16, border: "1px solid rgba(0,0,0,0.1)", borderRadius: 10, padding: 14 }}>
        <div style={{ display: "grid", gap: 8 }}>
          <div>
            <strong>ID:</strong> {data.id}
          </div>
          <div>
            <strong>Created:</strong>{" "}
            {data.created_at ? new Date(data.created_at).toLocaleString() : "—"}
          </div>
        </div>
      </div>
    </div>
  );
}
