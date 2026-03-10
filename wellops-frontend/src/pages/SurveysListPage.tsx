import { useQuery } from "@tanstack/react-query";
import { fetchSurveys } from "../features/surveys/surveys.api";
import { LoadingState, EmptyState, ErrorState } from "../shared/components/PageState";
import { SurveyCard } from "../features/surveys/components/SurveyCard";

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

      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        {data.map((s) => (
          <SurveyCard key={s.id} survey={s} />
        ))}
      </div>
    </div>
  );
}