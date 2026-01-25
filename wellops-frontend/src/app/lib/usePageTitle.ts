import { useLocation } from "react-router-dom";

export function usePageTitle() {
  const { pathname } = useLocation();

  if (pathname.startsWith("/app/surveys/")) return "Survey Details";
  if (pathname === "/app/surveys") return "Surveys";
  if (pathname === "/app/users") return "Users";
  if (pathname === "/app/teams") return "Teams";
  if (pathname === "/app/analytics") return "Analytics";

  return "Dashboard";
}
