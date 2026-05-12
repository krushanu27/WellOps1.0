import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useAuth } from "../app/providers/AuthProvider";
import {
  fetchSurveyById,
  fetchActiveSurveyVersion,
  fetchQuestions,
  submitSurvey,
  createDraftCopy,
  publishSurveyVersion,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  type Question,
  type QuestionPayload,
} from "../features/surveys/surveys.api";
import { LoadingState, ErrorState, EmptyState } from "../shared/components/PageState";

type QuestionFormState = {
  question_key: string;
  prompt: string;
  type: "TEXT" | "SCALE" | "SINGLE_CHOICE" | "MULTI_CHOICE";
  scale_min: string;
  scale_max: string;
  options_text: string;
  required: boolean;
  display_order: string;
};

const initialQuestionForm: QuestionFormState = {
  question_key: "",
  prompt: "",
  type: "SCALE",
  scale_min: "1",
  scale_max: "10",
  options_text: "",
  required: true,
  display_order: "0",
};

function parseOptions(type: QuestionFormState["type"], optionsText: string) {
  if (type !== "SINGLE_CHOICE" && type !== "MULTI_CHOICE") return null;

  const options = optionsText
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

  return { choices: options };
}

function toQuestionPayload(form: QuestionFormState): QuestionPayload {
  return {
    question_key: form.question_key.trim(),
    prompt: form.prompt.trim(),
    type: form.type,
    scale_min: form.type === "SCALE" ? Number(form.scale_min || 0) : null,
    scale_max: form.type === "SCALE" ? Number(form.scale_max || 10) : null,
    options: parseOptions(form.type, form.options_text),
    required: form.required,
    display_order: Number(form.display_order || 0),
  };
}

function questionToForm(question: Question): QuestionFormState {
  const choices = Array.isArray(question.options?.choices)
    ? question.options?.choices.join("\n")
    : "";

  return {
    question_key: question.question_key,
    prompt: question.prompt,
    type: question.type,
    scale_min: String(question.scale_min ?? 1),
    scale_max: String(question.scale_max ?? 10),
    options_text: choices,
    required: question.required,
    display_order: String(question.display_order ?? 0),
  };
}

export function SurveyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { role } = useAuth();

  const canManage = role === "ADMIN" || role === "MANAGER";
  const isEmployee = role === "EMPLOYEE";

  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [questionForm, setQuestionForm] = useState<QuestionFormState>(
    initialQuestionForm
  );
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

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

  const submitMutation = useMutation({
    mutationFn: () =>
      submitSurvey(
        id!,
        activeVersion!.id,
        Object.entries(answers).map(([question_id, value]) => ({
          question_id,
          value: { value },
        }))
      ),
    onSuccess: async () => {
      setSubmitted(true);
      await queryClient.invalidateQueries({ queryKey: ["surveys"] });
    },
  });

  const createDraftMutation = useMutation({
    mutationFn: () => createDraftCopy(id!, activeVersion!.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["survey-active-version", id] });
      await queryClient.invalidateQueries({ queryKey: ["questions", id] });
      await queryClient.invalidateQueries({ queryKey: ["surveys"] });
      setEditingQuestion(null);
      setQuestionForm(initialQuestionForm);
    },
  });

  const publishMutation = useMutation({
    mutationFn: () => publishSurveyVersion(id!, activeVersion!.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["survey-active-version", id] });
      await queryClient.invalidateQueries({ queryKey: ["questions", id] });
      await queryClient.invalidateQueries({ queryKey: ["surveys"] });
      setEditingQuestion(null);
      setQuestionForm(initialQuestionForm);
    },
  });

  const createQuestionMutation = useMutation({
    mutationFn: (payload: QuestionPayload) =>
      createQuestion(id!, activeVersion!.id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["questions", id, activeVersion?.id] });
      setQuestionForm(initialQuestionForm);
    },
  });

  const updateQuestionMutation = useMutation({
    mutationFn: ({
      questionId,
      payload,
    }: {
      questionId: string;
      payload: QuestionPayload;
    }) => updateQuestion(id!, activeVersion!.id, questionId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["questions", id, activeVersion?.id] });
      setEditingQuestion(null);
      setQuestionForm(initialQuestionForm);
    },
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: (questionId: string) =>
      deleteQuestion(id!, activeVersion!.id, questionId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["questions", id, activeVersion?.id] });
    },
  });

  const isLoading = surveyLoading || versionLoading || questionsLoading;
  const loadError = surveyError || versionError || questionsError;
  const isDraft = activeVersion?.status === "DRAFT";

  const answeredRequiredCount = useMemo(() => {
    if (!questions?.length) return 0;
    return questions.filter((q) => q.required && answers[q.id] !== undefined).length;
  }, [questions, answers]);

  const allRequiredAnswered = useMemo(() => {
    if (!questions?.length) return false;
    return questions.every((q) => !q.required || answers[q.id] !== undefined);
  }, [questions, answers]);

  function resetQuestionForm() {
    setEditingQuestion(null);
    setQuestionForm(initialQuestionForm);
  }

  function startEditQuestion(question: Question) {
    setEditingQuestion(question);
    setQuestionForm(questionToForm(question));
  }

  function handleQuestionSubmit(e: React.FormEvent) {
    e.preventDefault();

    const payload = toQuestionPayload(questionForm);
    if (!payload.question_key || !payload.prompt) return;

    if (editingQuestion) {
      updateQuestionMutation.mutate({
        questionId: editingQuestion.id,
        payload,
      });
    } else {
      createQuestionMutation.mutate(payload);
    }
  }

  function handleDeleteQuestion(question: Question) {
    const confirmed = window.confirm(`Delete question "${question.prompt}"?`);
    if (!confirmed) return;
    deleteQuestionMutation.mutate(question.id);
  }

  if (isLoading) {
    return <LoadingState title="Loading survey" message="Loading survey..." />;
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
      } else if (
        status === 404 &&
        (detail === "No survey version found" ||
          detail === "No published survey version found")
      ) {
        title = "Survey not available";
        message = "This survey does not have an available version yet.";
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
        Active version: v{activeVersion.version_number} ({activeVersion.status})
      </div>

      {canManage && (
        <div
          style={{
            marginBottom: 20,
            padding: 16,
            borderRadius: 12,
            border: "1px solid rgba(0,0,0,0.1)",
            background: "#ffffff",
            color: "#111827",
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          {activeVersion.status === "PUBLISHED" && (
            <button
              onClick={() => createDraftMutation.mutate()}
              disabled={createDraftMutation.isPending}
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                border: "1px solid #2563eb",
                background: "#2563eb",
                color: "#ffffff",
                cursor: "pointer",
              }}
            >
              {createDraftMutation.isPending ? "Creating..." : "Create Draft Copy"}
            </button>
          )}

          {activeVersion.status === "DRAFT" && (
            <button
              onClick={() => publishMutation.mutate()}
              disabled={publishMutation.isPending}
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                border: "1px solid #16a34a",
                background: "#16a34a",
                color: "#ffffff",
                cursor: "pointer",
              }}
            >
              {publishMutation.isPending ? "Publishing..." : "Publish Survey"}
            </button>
          )}
        </div>
      )}

      {(createDraftMutation.isError ||
        publishMutation.isError ||
        createQuestionMutation.isError ||
        updateQuestionMutation.isError ||
        deleteQuestionMutation.isError ||
        submitMutation.isError) && (
          <div style={{ color: "darkred", marginBottom: 12 }}>
            {axios.isAxiosError(
              createDraftMutation.error ||
              publishMutation.error ||
              createQuestionMutation.error ||
              updateQuestionMutation.error ||
              deleteQuestionMutation.error ||
              submitMutation.error
            )
              ? (
                (createDraftMutation.error ||
                  publishMutation.error ||
                  createQuestionMutation.error ||
                  updateQuestionMutation.error ||
                  deleteQuestionMutation.error ||
                  submitMutation.error) as any
              )?.response?.data?.detail || "Request failed"
              : "Request failed"}
          </div>
        )}

      {canManage && isDraft && (
        <form
          onSubmit={handleQuestionSubmit}
          style={{
            display: "grid",
            gap: 12,
            padding: 16,
            border: "1px solid #d1d5db",
            borderRadius: 12,
            background: "#ffffff",
            marginBottom: 20,
          }}
        >
          <h3 style={{ margin: 0 }}>
            {editingQuestion ? "Edit Question" : "Add Question"}
          </h3>

          <input
            value={questionForm.question_key}
            placeholder="Question key"
            onChange={(e) =>
              setQuestionForm((prev) => ({ ...prev, question_key: e.target.value }))
            }
            style={{
              padding: 10,
              borderRadius: 8,
              border: "1px solid #d1d5db",
              background: "#ffffff",
              color: "#111827",
              outline: "none",
            }}
          />

          <textarea
            value={questionForm.prompt}
            placeholder="Question prompt"
            onChange={(e) =>
              setQuestionForm((prev) => ({ ...prev, prompt: e.target.value }))
            }
            rows={3}
            style={{
              padding: 10,
              borderRadius: 8,
              border: "1px solid #d1d5db",
              resize: "vertical",
              background: "#ffffff",
              color: "#111827",
              outline: "none",
            }}
          />

          <select
            value={questionForm.type}
            onChange={(e) =>
              setQuestionForm((prev) => ({
                ...prev,
                type: e.target.value as QuestionFormState["type"],
              }))
            }
            style={{
              padding: 10,
              borderRadius: 8,
              border: "1px solid #d1d5db",
              background: "#ffffff",
              color: "#111827",
            }}
          >
            <option value="TEXT">TEXT</option>
            <option value="SCALE">SCALE</option>
            <option value="SINGLE_CHOICE">SINGLE_CHOICE</option>
            <option value="MULTI_CHOICE">MULTI_CHOICE</option>
          </select>

          {questionForm.type === "SCALE" && (
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={questionForm.scale_min}
                placeholder="Scale min"
                onChange={(e) =>
                  setQuestionForm((prev) => ({ ...prev, scale_min: e.target.value }))
                }
                style={{
                  flex: 1,
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  background: "#ffffff",
                  color: "#111827",
                }}
              />
              <input
                value={questionForm.scale_max}
                placeholder="Scale max"
                onChange={(e) =>
                  setQuestionForm((prev) => ({ ...prev, scale_max: e.target.value }))
                }
                style={{
                  flex: 1,
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  background: "#ffffff",
                  color: "#111827",
                }}
              />
            </div>
          )}

          {(questionForm.type === "SINGLE_CHOICE" ||
            questionForm.type === "MULTI_CHOICE") && (
              <textarea
                value={questionForm.options_text}
                placeholder={"One option per line"}
                onChange={(e) =>
                  setQuestionForm((prev) => ({
                    ...prev,
                    options_text: e.target.value,
                  }))
                }
                rows={4}
                style={{
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  resize: "vertical",
                  background: "#ffffff",
                  color: "#111827",
                  outline: "none",
                }}
              />
            )}

          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={questionForm.display_order}
              placeholder="Display order"
              onChange={(e) =>
                setQuestionForm((prev) => ({
                  ...prev,
                  display_order: e.target.value,
                }))
              }
              style={{
                flex: 1,
                padding: 10,
                borderRadius: 8,
                border: "1px solid #d1d5db",
                background: "#ffffff",
                color: "#111827",
              }}
            />

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #d1d5db",
                background: "#ffffff",
                color: "#111827",
              }}
            >
              <input
                type="checkbox"
                checked={questionForm.required}
                onChange={(e) =>
                  setQuestionForm((prev) => ({
                    ...prev,
                    required: e.target.checked,
                  }))
                }
              />
              Required
            </label>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="submit"
              disabled={
                createQuestionMutation.isPending || updateQuestionMutation.isPending
              }
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                border: "1px solid #2563eb",
                background: "#2563eb",
                color: "#ffffff",
                cursor: "pointer",
              }}
            >
              {editingQuestion
                ? updateQuestionMutation.isPending
                  ? "Updating..."
                  : "Update Question"
                : createQuestionMutation.isPending
                  ? "Adding..."
                  : "Add Question"}
            </button>

            {editingQuestion && (
              <button
                type="button"
                onClick={resetQuestionForm}
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  background: "#ffffff",
                  color: "#111827",
                  cursor: "pointer",
                }}
              >
                Cancel Edit
              </button>
            )}
          </div>
        </form>
      )}

      {!questions?.length ? (
        <EmptyState
          title="No questions found"
          message={
            canManage && isDraft
              ? "This draft version has no questions yet."
              : "This survey version has no questions yet."
          }
        />
      ) : (
        <>
          <div style={{ display: "grid", gap: 20, marginTop: 20 }}>
            {questions.map((q: Question) => {
              const currentValue =
                answers[q.id] ??
                (q.type === "SCALE"
                  ? Math.round(((q.scale_max ?? 10) + (q.scale_min ?? 0)) / 2)
                  : q.type === "MULTI_CHOICE"
                    ? []
                    : "");

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
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      alignItems: "flex-start",
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>
                      {q.prompt}{" "}
                      {q.required && <span style={{ color: "#dc2626" }}>*</span>}
                    </div>

                    {canManage && isDraft && (
                      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={() => startEditQuestion(q)}
                          style={{
                            padding: "8px 12px",
                            borderRadius: 8,
                            border: "1px solid #d1d5db",
                            background: "#ffffff",
                            color: "#111827",
                            cursor: "pointer",
                          }}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion(q)}
                          disabled={deleteQuestionMutation.isPending}
                          style={{
                            padding: "8px 12px",
                            borderRadius: 8,
                            border: "1px solid #dc2626",
                            background: "#dc2626",
                            color: "#ffffff",
                            cursor: "pointer",
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>

                  <div style={{ fontSize: 12, opacity: 0.65, marginBottom: 10 }}>
                    {q.type} • Order {q.display_order}
                  </div>

                  {isEmployee && q.type === "SCALE" && (
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

                  {isEmployee && q.type === "TEXT" && (
                    <textarea
                      value={currentValue}
                      onChange={(e) =>
                        setAnswers((prev) => ({
                          ...prev,
                          [q.id]: e.target.value,
                        }))
                      }
                      rows={4}
                      style={{
                        width: "100%",
                        padding: 10,
                        borderRadius: 8,
                        border: "1px solid #d1d5db",
                        resize: "vertical",
                        background: "#ffffff",
                        color: "#111827",
                        outline: "none",
                      }}
                    />
                  )}

                  {isEmployee && q.type === "SINGLE_CHOICE" && (
                    <div style={{ display: "grid", gap: 8 }}>
                      {(Array.isArray(q.options?.choices) ? q.options?.choices : []).map(
                        (choice: string) => (
                          <label
                            key={choice}
                            style={{ display: "flex", alignItems: "center", gap: 8 }}
                          >
                            <input
                              type="radio"
                              name={q.id}
                              checked={answers[q.id] === choice}
                              onChange={() =>
                                setAnswers((prev) => ({
                                  ...prev,
                                  [q.id]: choice,
                                }))
                              }
                            />
                            {choice}
                          </label>
                        )
                      )}
                    </div>
                  )}

                  {isEmployee && q.type === "MULTI_CHOICE" && (
                    <div style={{ display: "grid", gap: 8 }}>
                      {(Array.isArray(q.options?.choices) ? q.options?.choices : []).map(
                        (choice: string) => {
                          const selectedValues = Array.isArray(answers[q.id])
                            ? answers[q.id]
                            : [];

                          const checked = selectedValues.includes(choice);

                          return (
                            <label
                              key={choice}
                              style={{ display: "flex", alignItems: "center", gap: 8 }}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  const nextValues = e.target.checked
                                    ? [...selectedValues, choice]
                                    : selectedValues.filter((item: string) => item !== choice);

                                  setAnswers((prev) => ({
                                    ...prev,
                                    [q.id]: nextValues,
                                  }));
                                }}
                              />
                              {choice}
                            </label>
                          );
                        }
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {isEmployee && (
            <>
              <div style={{ marginTop: 16, fontSize: 13, opacity: 0.7 }}>
                Answered required questions: {answeredRequiredCount} /{" "}
                {questions.filter((q) => q.required).length}
              </div>

              <button
                onClick={() => submitMutation.mutate()}
                disabled={
                  submitMutation.isPending || !questions.length || !allRequiredAnswered
                }
                style={{
                  marginTop: 24,
                  padding: "12px 24px",
                  borderRadius: 10,
                  border: "1px solid #333",
                  fontWeight: 600,
                  cursor:
                    submitMutation.isPending || !allRequiredAnswered
                      ? "not-allowed"
                      : "pointer",
                  opacity:
                    submitMutation.isPending || !allRequiredAnswered ? 0.7 : 1,
                }}
              >
                {submitMutation.isPending ? "Submitting..." : "Submit Survey"}
              </button>

              {!allRequiredAnswered && (
                <div style={{ marginTop: 10, fontSize: 13, color: "#b45309" }}>
                  Please answer all required questions before submitting.
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}