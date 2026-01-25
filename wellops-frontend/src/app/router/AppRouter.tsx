import { Routes, Route, Navigate } from "react-router-dom";
import { LoginPage } from "../../features/auth/LoginPage";
import { ProtectedRoute } from "./ProtectedRoute";
import { AppLayout } from "../layout/AppLayout";
import { SurveysListPage } from "../../features/surveys/SurveysListPage";
import { SurveyDetailPage } from "../../features/surveys/SurveyDetailPage";
import { UsersListPage } from "../../features/users/UsersListPage";
import { TeamsListPage } from "../../features/teams/TeamsListPage";

function Placeholder({ title }: { title: string }) {
  return (
    <div>
      <h1>{title}</h1>
      <p>Coming next.</p>
    </div>
  );
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="surveys" replace />} />
        <Route path="surveys" element={<SurveysListPage />} />
        <Route path="surveys/:id" element={<SurveyDetailPage />} />

        <Route path="analytics" element={<Placeholder title="Analytics" />} />
        <Route path="users" element={<UsersListPage />} />
        <Route path="teams" element={<TeamsListPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  );
}
