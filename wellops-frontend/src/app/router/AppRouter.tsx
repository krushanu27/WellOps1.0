import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "../providers/AuthProvider";
import { AppLayout } from "../layout/AppLayout";

import { LoginPage } from "../../pages/LoginPage";
import { SurveysListPage } from "../../pages/SurveysListPage";
import { SurveyDetailPage } from "../../pages/SurveyDetailPage";
import PredictPage from "../../pages/PredictPage";
import UsersPage from "../../pages/UsersPage";
import TeamsPage from "../../pages/TeamsPage";
import DashboardPage from "../../pages/DashboardPage";
import PrivacyPage from "../../pages/PrivacyPage";

type Role = "ADMIN" | "MANAGER" | "EMPLOYEE";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireRole({ children, roles }: { children: React.ReactNode; roles: Role[] }) {
  const { role } = useAuth();
  if (!role || !roles.includes(role)) return <Navigate to="/app/dashboard" replace />;
  return <>{children}</>;
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/app/dashboard" replace />} />

      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/app"
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/app/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="surveys" element={<SurveysListPage />} />
        <Route path="surveys/:id" element={<SurveyDetailPage />} />
        <Route path="analytics" element={<PredictPage />} />
        <Route path="privacy" element={<PrivacyPage />} />

        <Route
          path="users"
          element={
            <RequireRole roles={["ADMIN", "MANAGER"]}>
              <UsersPage />
            </RequireRole>
          }
        />

        <Route
          path="teams"
          element={
            <RequireRole roles={["ADMIN", "MANAGER"]}>
              <TeamsPage />
            </RequireRole>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}