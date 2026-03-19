import { useState } from "react";
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
};

const initialForm: SurveyFormState = {
  title: "",
  description: "",
};

export function SurveysListPage() {
  const queryClient = useQueryClient();
  const auth = useAuth();

  const currentUser =
    (auth as any).currentUser ??
    (auth as any).user ??
    null;

  const canManage =
    currentUser?.role === "ADMIN" || currentUser?.role === "MANAGER";

  const [form, setForm] = useState<SurveyFormState>(initialForm);
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
      payload: { title: string; description?: string | null };
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

  return (
    <div style={{ padding: 24 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <h1 style={{ margin: 0 }}>Surveys</h1>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            {isFetching ? "Refreshing…" : `${data?.length ?? 0} total`}
          </div>
          {canManage && (
            <button onClick={startCreate}>+ New Survey</button>
          )}
        </div>
      </div>

      {canManage && showForm && (
        <form
          onSubmit={handleSubmit}
          style={{
            border: "1px solid #d1d5db",
            borderRadius: 12,
            padding: 16,
            marginTop: 16,
            display: "grid",
            gap: 12,
            background: "#ffffff",
            color: "#111827",
            boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
          }}
        >
          <div style={{ fontWeight: 600, color: "#111827" }}>
            {editingSurvey ? "Edit Survey" : "Create Survey"}
          </div>

          <input
            type="text"
            placeholder="Survey title"
            value={form.title}
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
            placeholder="Survey description"
            value={form.description}
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
                ? (updateMutation.isPending ? "Updating..." : "Update Survey")
                : (createMutation.isPending ? "Creating..." : "Create Survey")}
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
          {data.map((s) => (
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
                  }}
                >
                  <span>Status: {s.status ?? "DRAFT"}</span>
                  {s.created_at && (
                    <span>
                      Created: {new Date(s.created_at).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>

              {canManage && (
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "flex-start",
                    flexShrink: 0,
                  }}
                >
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
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}