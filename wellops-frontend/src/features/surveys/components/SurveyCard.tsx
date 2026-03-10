import { Link } from "react-router-dom";
import type { Survey } from "../surveys.api";

type Props = {
  survey: Survey;
};

export function SurveyCard({ survey }: Props) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 10,
        border: "1px solid rgba(0,0,0,0.1)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div>
        <Link
          to={`/app/surveys/${survey.id}`}
          style={{ fontWeight: 600, textDecoration: "none", fontSize: 15 }}
        >
          {survey.title}
        </Link>
        <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>ID: {survey.id}</div>
      </div>

      <div style={{ fontSize: 13, opacity: 0.75, textAlign: "right" }}>
        {survey.created_at ? new Date(survey.created_at).toLocaleString() : "—"}
      </div>
    </div>
  );
}