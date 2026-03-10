import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import axios from "axios";
import {
  fetchSurveyById,
  fetchQuestions,
  submitSurvey,
  type Question,
} from "../features/surveys/surveys.api";
import { LoadingState, ErrorState } from "../shared/components/PageState";

const VERSION_ID = "fbe7f12b-9a9a-4794-a4fb-4484bff547af";

export function SurveyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const { data: survey, isLoading: surveyLoading, error: surveyError, refetch } = useQuery({
    queryKey: ["survey", id],
    queryFn: () => fetchSurveyById(id!),
    enabled: !!id,
  });

  const { data: questions, isLoading: questionsLoading } = useQuery({
    queryKey: ["questions", id, VERSION_ID],
    queryFn: () => fetchQuestions(id!, VERSION_ID),
    enabled: !!id,
  });

  const mutation = useMutation({
    mutationFn: () =>
      submitSurvey(
        id!,
        VERSION_ID,
        Object.entries(answers).map(([question_id, value]) => ({
          question_id,
          value: { value },
        }))
      ),
    onSuccess: () => setSubmitted(true),
  });

  if (surveyLoading || questionsLoading) return <LoadingState title="Loading survey..." />;

  if (surveyError) {
    const status = axios.isAxiosError(surveyError) ? surveyError.response?.status : undefined;
    return (
      <ErrorState
        title={status === 404 ? "Survey not found" : "Failed to load survey"}
        message={status === 404 ? "This survey doesn't exist." : "Something went wrong."}
        action={
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => refetch()}>Retry</button>
            <Link to="/app/surveys">Back to surveys</Link>
          </div>
        }
      />
    );
  }

  if (submitted) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ marginBottom: 12 }}>
          <Link to="/app/surveys">← Back to surveys</Link>
        </div>
        <div style={{ padding: 24, borderRadius: 12, border: "1px solid rgba(0,0,0,0.1)", textAlign: "center" }}>
          <div style={{ fontSize: 32 }}>✅</div>
          <h2>Survey submitted!</h2>
          <p style={{ opacity: 0.75 }}>Thank you for completing the survey.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 720 }}>
      <div style={{ marginBottom: 12 }}>
        <Link to="/app/surveys">← Back to surveys</Link>
      </div>

      <h1 style={{ marginTop: 0 }}>{survey?.title}</h1>
      {survey?.description && <p style={{ opacity: 0.75 }}>{survey.description}</p>}

      {mutation.isError && (
        <div style={{ color: "darkred", marginBottom: 12 }}>
          {axios.isAxiosError(mutation.error)
            ? mutation.error.response?.data?.detail || "Submission failed"
            : "Submission failed"}
        </div>
      )}

      <div style={{ display: "grid", gap: 20, marginTop: 20 }}>
        {questions?.map((q: Question) => (
          <div key={q.id} style={{ padding: 16, borderRadius: 10, border: "1px solid rgba(0,0,0,0.1)" }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>{q.prompt}</div>
            {q.type === "SCALE" && (
              <div>
                <input
                  type="range"
                  min={q.scale_min ?? 0}
                  max={q.scale_max ?? 10}
                  value={answers[q.id] ?? Math.round(((q.scale_max ?? 10) + (q.scale_min ?? 0)) / 2)}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: Number(e.target.value) }))}
                  style={{ width: "100%" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, opacity: 0.6 }}>
                  <span>{q.scale_min ?? 0}</span>
                  <span style={{ fontWeight: 600 }}>
                    {answers[q.id] ?? Math.round(((q.scale_max ?? 10) + (q.scale_min ?? 0)) / 2)}
                  </span>
                  <span>{q.scale_max ?? 10}</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending || !questions?.length}
        style={{
          marginTop: 24,
          padding: "12px 24px",
          borderRadius: 10,
          border: "1px solid #333",
          fontWeight: 600,
          cursor: mutation.isPending ? "not-allowed" : "pointer",
        }}
      >
        {mutation.isPending ? "Submitting..." : "Submit Survey"}
      </button>
    </div>
  );
}