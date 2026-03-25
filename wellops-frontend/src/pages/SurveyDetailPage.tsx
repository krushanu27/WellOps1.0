import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import axios from "axios";
import {
  fetchSurveyById,
  fetchActiveSurveyVersion,
  fetchQuestions,
  submitSurvey,
  type Question,
} from "../features/surveys/surveys.api";
import { LoadingState, ErrorState, EmptyState } from "../shared/components/PageState";

export function SurveyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const {
    data: survey,
    isLoading: surveyLoading,
    error: surveyError,
    refetch: refetchSurvey,
  } = useQuery({
    queryKey: ["survey", id],
    queryFn: () => fetchSurveyById(id!),
    enabled: !!id,
  });

  const {
    data: activeVersion,
    isLoading: versionLoading,
    error: versionError,
    refetch: refetchVersion,
  } = useQuery({
    queryKey: ["survey-active-version", id],
    queryFn: () => fetchActiveSurveyVersion(id!),
    enabled: !!id,
  });

  const {
    data: questions,
    isLoading: questionsLoading,
    error: questionsError,
    refetch: refetchQuestions,
  } = useQuery({
    queryKey: ["questions", id, activeVersion?.id],
    queryFn: () => fetchQuestions(id!, activeVersion!.id),
    enabled: !!id && !!activeVersion?.id,
  });

  const mutation = useMutation({
    mutationFn: () =>
      submitSurvey(
        id!,
        activeVersion!.id,
        Object.entries(answers).map(([question_id, value]) => ({
          question_id,
          value: { value },
        }))
      ),
    onSuccess: () => setSubmitted(true),
  });

  const isLoading = surveyLoading || versionLoading || questionsLoading;

  const loadError = surveyError || versionError || questionsError;

  const answeredRequiredCount = useMemo(() => {
    if (!questions?.length) return 0;
    return questions.filter((q) => q.required && answers[q.id] !== undefined).length;
  }, [questions, answers]);

  const allRequiredAnswered = useMemo(() => {
    if (!questions?.length) return false;
    return questions.every((q) => !q.required || answers[q.id] !== undefined);
  }, [questions, answers]);

  if (isLoading) {
    return (
      <LoadingState
        title="Loading survey"
        message="Loading survey..."
      />
    );
  }

  if (loadError) {
    let title = "Failed to load survey";
    let message = "Something went wrong.";

    if (axios.isAxiosError(loadError)) {
      const status = loadError.response?.status;
      const detail = loadError.response?.data?.detail;

      if (status === 404 && detail === "Survey not found") {
        title = "Survey not found";
        message = "This survey does not exist.";
      } else if (status === 404 && detail === "No published survey version found") {
        title = "Survey not available";
        message = "This survey does not have a published version yet.";
      }
    }

    return (
      <ErrorState
        title={title}
        message={message}
        action={
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => {
                refetchSurvey();
                refetchVersion();
                refetchQuestions();
              }}
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                border: "1px solid #d1d5db",
                background: "#ffffff",
                color: "#111827",
                cursor: "pointer",
              }}
            >
              Retry
            </button>
            <Link to="/app/surveys">Back to surveys</Link>
          </div>
        }
      />
    );
  }

  if (!survey || !activeVersion) {
    return (
      <EmptyState
        title="Survey unavailable"
        message="This survey is not available right now."
      />
    );
  }

  if (submitted) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ marginBottom: 12 }}>
          <Link to="/app/surveys">← Back to surveys</Link>
        </div>

        <div
          style={{
            padding: 24,
            borderRadius: 12,
            border: "1px solid rgba(0,0,0,0.1)",
            textAlign: "center",
            background: "#ffffff",
            color: "#111827",
          }}
        >
          <div style={{ fontSize: 32 }}>✅</div>
          <h2>Survey submitted!</h2>
          <p style={{ opacity: 0.75 }}>
            Thank you for completing the survey.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 720 }}>
      <div style={{ marginBottom: 12 }}>
        <Link to="/app/surveys">← Back to surveys</Link>
      </div>

      <h1 style={{ marginTop: 0 }}>{survey.title}</h1>
      {survey.description && <p style={{ opacity: 0.75 }}>{survey.description}</p>}

      <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 16 }}>
        Published version: {activeVersion.id}
      </div>

      {mutation.isError && (
        <div style={{ color: "darkred", marginBottom: 12 }}>
          {axios.isAxiosError(mutation.error)
            ? mutation.error.response?.data?.detail || "Submission failed"
            : "Submission failed"}
        </div>
      )}

      {!questions?.length ? (
        <EmptyState
          title="No questions found"
          message="This published survey version has no questions yet."
        />
      ) : (
        <>
          <div style={{ display: "grid", gap: 20, marginTop: 20 }}>
            {questions.map((q: Question) => {
              const currentValue =
                answers[q.id] ??
                Math.round(((q.scale_max ?? 10) + (q.scale_min ?? 0)) / 2);

              return (
                <div
                  key={q.id}
                  style={{
                    padding: 16,
                    borderRadius: 10,
                    border: "1px solid rgba(0,0,0,0.1)",
                    background: "#ffffff",
                    color: "#111827",
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>
                    {q.prompt} {q.required && <span style={{ color: "#dc2626" }}>*</span>}
                  </div>

                  {q.type === "SCALE" && (
                    <div>
                      <input
                        type="range"
                        min={q.scale_min ?? 0}
                        max={q.scale_max ?? 10}
                        value={currentValue}
                        onChange={(e) =>
                          setAnswers((prev) => ({
                            ...prev,
                            [q.id]: Number(e.target.value),
                          }))
                        }
                        style={{ width: "100%" }}
                      />
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 12,
                          opacity: 0.6,
                        }}
                      >
                        <span>{q.scale_min ?? 0}</span>
                        <span style={{ fontWeight: 600 }}>{currentValue}</span>
                        <span>{q.scale_max ?? 10}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 16, fontSize: 13, opacity: 0.7 }}>
            Answered required questions: {answeredRequiredCount} /{" "}
            {questions.filter((q) => q.required).length}
          </div>

          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !questions.length || !allRequiredAnswered}
            style={{
              marginTop: 24,
              padding: "12px 24px",
              borderRadius: 10,
              border: "1px solid #333",
              fontWeight: 600,
              cursor:
                mutation.isPending || !allRequiredAnswered ? "not-allowed" : "pointer",
              opacity: mutation.isPending || !allRequiredAnswered ? 0.7 : 1,
            }}
          >
            {mutation.isPending ? "Submitting..." : "Submit Survey"}
          </button>

          {!allRequiredAnswered && (
            <div style={{ marginTop: 10, fontSize: 13, color: "#b45309" }}>
              Please answer all required questions before submitting.
            </div>
          )}
        </>
      )}
    </div>
  );
}