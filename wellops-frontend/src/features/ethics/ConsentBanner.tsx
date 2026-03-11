import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchConsent, grantConsent } from "./ethics.api";
import { useNavigate } from "react-router-dom";

export function ConsentBanner() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: consents, isLoading } = useQuery({
    queryKey: ["consents"],
    queryFn: fetchConsent,
  });

  const mutation = useMutation({
    mutationFn: () => grantConsent("SURVEY_DATA"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consents"] });
    },
  });

  // Don't show while loading
  if (isLoading) return null;

  // Check if SURVEY_DATA consent is granted
  const surveyConsent = consents?.find((c) => c.consent_type === "SURVEY_DATA");
  if (surveyConsent?.granted) return null;

  return (
    <div className="wo-banner">
      <div className="wo-banner-content">
        <strong>Data Consent Required</strong>
        <p style={{ margin: "6px 0 0", fontSize: "0.88rem", opacity: 0.85 }}>
          WellOps collects wellness survey data to generate insights. Your
          responses are anonymized and aggregated.{" "}
          <span
            className="wo-banner-link"
            onClick={() => navigate("/app/privacy")}
          >
            Read our Privacy Policy
          </span>
        </p>
      </div>
      <button
        className="wo-banner-btn"
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
      >
        {mutation.isPending ? "Saving…" : "I Agree"}
      </button>
    </div>
  );
}
