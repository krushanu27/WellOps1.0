import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../app/providers/AuthProvider";
import {
  fetchSurveys,
  createSurvey,
  updateSurvey,
  deleteSurvey,
  type Survey,
} from "../features/surveys/surveys.api";
import {
  LoadingState,
  EmptyState,
  ErrorState,
} from "../shared/components/PageState";

type SurveyFormState = {
  title: string;
  description: string;
  survey_type: "GENERAL" | "PREDICTION";
};

const initialForm: SurveyFormState = {
  title: "",
  description: "",
  survey_type: "GENERAL",
};

function StatusBadge({
  label,
  color,
  background,
}: {
  label: string;
  color: string;
  background: string;
}) {
  return (
    <span
      style={{
        padding: "4px 8px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        color,
        background,
        border: `1px solid ${color}`,
      }}
    >
      {label}
    </span>
  );
}

export function SurveysListPage() {
  const queryClient = useQueryClient();
  const { role } = useAuth();

  const canManage = role === "ADMIN" || role === "MANAGER";
  const isEmployee = role === "EMPLOYEE";

  const [form, setForm] = useState(initialForm);
  const [editingSurvey, setEditingSurvey] = useState<Survey | null>(null);
  const [showForm, setShowForm] = useState(false);

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

  const createMutation = useMutation({
    mutationFn: createSurvey,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["surveys"] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      surveyId,
      payload,
    }: {
      surveyId: string;
      payload: {
        title: string;
        description?: string | null;
        survey_type?: "GENERAL" | "PREDICTION";
      };
    }) => updateSurvey(surveyId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["surveys"] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSurvey,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["surveys"] });
    },
  });

  function resetForm() {
    setForm(initialForm);
    setEditingSurvey(null);
    setShowForm(false);
  }

  function startCreate() {
    setEditingSurvey(null);
    setForm(initialForm);
    setShowForm(true);
  }

  function startEdit(survey: Survey) {
    setEditingSurvey(survey);
    setForm({
      title: survey.title,
      description: survey.description ?? "",
      survey_type: survey.survey_type === "PREDICTION" ? "PREDICTION" : "GENERAL",
    });
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const trimmedTitle = form.title.trim();
    const trimmedDescription = form.description.trim();

    if (!trimmedTitle) return;

    const payload = {
      title: trimmedTitle,
      description: trimmedDescription || null,
      survey_type: form.survey_type,
    };

    if (editingSurvey) {
      updateMutation.mutate({
        surveyId: editingSurvey.id,
        payload,
      });
    } else {
      createMutation.mutate(payload);
    }
  }

  function handleDelete(survey: Survey) {
    const confirmed = window.confirm(`Delete survey "${survey.title}"?`);
    if (!confirmed) return;
    deleteMutation.mutate(survey.id);
  }

  if (isLoading) {
    return <LoadingState title="Loading surveys" message="Please wait..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Failed to load surveys"
        message="Something went wrong while loading surveys."
        action={<button onClick={() => refetch()}>Retry</button>}
      />
    );
  }

  return (
    <div>
      <h1 style={{ marginBottom: 8 }}>Surveys</h1>
      <p style={{ color: "#6b7280", marginBottom: 16 }}>
        {isFetching ? "Refreshing…" : `${data?.length ?? 0} total`}
      </p>

      {canManage && (
        <button
          onClick={startCreate}
          style={{
            marginBottom: 16,
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid #2563eb",
            background: "#2563eb",
            color: "#ffffff",
            cursor: "pointer",
          }}
        >
          + New Survey
        </button>
      )}

      {canManage && showForm && (
        <form
          onSubmit={handleSubmit}
          style={{
            display: "grid",
            gap: 12,
            padding: 16,
            border: "1px solid #d1d5db",
            borderRadius: 12,
            background: "#ffffff",
            marginBottom: 16,
          }}
        >
          <h3 style={{ margin: 0 }}>
            {editingSurvey ? "Edit Survey" : "Create Survey"}
          </h3>

          <input
            value={form.title}
            placeholder="Survey title"
            onChange={(e) =>
              setForm((prev) => ({ ...prev, title: e.target.value }))
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
            value={form.description}
            placeholder="Description"
            onChange={(e) =>
              setForm((prev) => ({ ...prev, description: e.target.value }))
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

          <select
            value={form.survey_type}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                survey_type: e.target.value as "GENERAL" | "PREDICTION",
              }))
            }
            style={{
              padding: 10,
              borderRadius: 8,
              border: "1px solid #d1d5db",
              background: "#ffffff",
              color: "#111827",
              outline: "none",
            }}
          >
            <option value="GENERAL">General Survey</option>
            <option value="PREDICTION">Prediction Survey</option>
          </select>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                border: "1px solid #2563eb",
                background: "#2563eb",
                color: "#ffffff",
                cursor: "pointer",
              }}
            >
              {editingSurvey
                ? updateMutation.isPending
                  ? "Updating..."
                  : "Update Survey"
                : createMutation.isPending
                  ? "Creating..."
                  : "Create Survey"}
            </button>

            <button
              type="button"
              onClick={resetForm}
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                border: "1px solid #d1d5db",
                background: "#ffffff",
                color: "#111827",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>

          {(createMutation.isError || updateMutation.isError) && (
            <div style={{ color: "#b42318", fontSize: 14 }}>
              Failed to save survey. Please try again.
            </div>
          )}
        </form>
      )}

      {!data || data.length === 0 ? (
        <EmptyState
          title="No surveys"
          message="There are no surveys available yet."
        />
      ) : (
        <div
          style={{
            marginTop: 16,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {data.map((s) => {
            const employeeCanOpen = isEmployee && !!s.latest_version_id;
            const shouldTakeLatest =
              isEmployee &&
              !!s.latest_version_id &&
              (!s.has_submitted_latest || !!s.new_version_available);

            return (
              <div
                key={s.id}
                style={{
                  border: "1px solid #d1d5db",
                  borderRadius: 12,
                  padding: 16,
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 16,
                  background: "#ffffff",
                  color: "#111827",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
                }}
              >
                <div style={{ flex: 1, color: "#111827" }}>
                  <h3 style={{ margin: "0 0 8px 0", color: "#111827" }}>
                    {s.title}
                  </h3>

                  {s.description && (
                    <p style={{ margin: "0 0 8px 0", color: "#4b5563" }}>
                      {s.description}
                    </p>
                  )}

                  <div
                    style={{
                      fontSize: 12,
                      color: "#6b7280",
                      display: "flex",
                      gap: 12,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <span>Status: {s.status ?? "DRAFT"}</span>

                    <span>
                      Type: {s.survey_type === "PREDICTION" ? "Prediction" : "General"}
                    </span>

                    {typeof s.latest_version_number === "number" && (
                      <span>Latest version: v{s.latest_version_number}</span>
                    )}

                    {s.created_at && (
                      <span>Created: {new Date(s.created_at).toLocaleString()}</span>
                    )}

                    {isEmployee && s.new_version_available && (
                      <StatusBadge
                        label="New Version Available"
                        color="#2563eb"
                        background="#dbeafe"
                      />
                    )}

                    {isEmployee &&
                      !s.new_version_available &&
                      s.has_submitted_latest && (
                        <StatusBadge
                          label="Submitted"
                          color="#15803d"
                          background="#dcfce7"
                        />
                      )}

                    {isEmployee &&
                      !!s.latest_version_id &&
                      !s.has_submitted_latest && (
                        <StatusBadge
                          label="Pending"
                          color="#b45309"
                          background="#fef3c7"
                        />
                      )}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "flex-start",
                    flexShrink: 0,
                  }}
                >
                  {canManage && (
                    <>
                      <Link
                        to={`/app/surveys/${s.id}`}
                        style={{
                          padding: "10px 14px",
                          borderRadius: 8,
                          border: "1px solid #2563eb",
                          background: "#2563eb",
                          color: "#ffffff",
                          textDecoration: "none",
                        }}
                      >
                        View
                      </Link>

                      <button
                        onClick={() => startEdit(s)}
                        style={{
                          padding: "10px 14px",
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
                        onClick={() => handleDelete(s)}
                        disabled={deleteMutation.isPending}
                        style={{
                          padding: "10px 14px",
                          borderRadius: 8,
                          border: "1px solid #dc2626",
                          background: "#dc2626",
                          color: "#ffffff",
                          cursor: "pointer",
                        }}
                      >
                        {deleteMutation.isPending ? "Deleting..." : "Delete"}
                      </button>
                    </>
                  )}

                  {isEmployee && employeeCanOpen && (
                    <Link
                      to={`/app/surveys/${s.id}`}
                      style={{
                        padding: "10px 14px",
                        borderRadius: 8,
                        border: shouldTakeLatest
                          ? "1px solid #16a34a"
                          : "1px solid #2563eb",
                        background: shouldTakeLatest ? "#16a34a" : "#2563eb",
                        color: "#ffffff",
                        textDecoration: "none",
                      }}
                    >
                      {shouldTakeLatest ? "Take Survey" : "Open"}
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}