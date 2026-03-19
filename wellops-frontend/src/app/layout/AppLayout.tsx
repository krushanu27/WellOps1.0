import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../providers/AuthProvider";
import { usePageTitle } from "../lib/usePageTitle";
import { ConsentBanner } from "../../features/ethics/ConsentBanner";

export function AppLayout() {
  const { logout, role } = useAuth();
  const navigate = useNavigate();
  const title = usePageTitle();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  const activeStyle = (isActive: boolean) => ({
    background: isActive ? "rgba(79, 70, 229, 0.12)" : undefined,
    color: isActive ? "#4f46e5" : undefined,
  });

  return (
    <div className="wo-app-layout">
      <aside className="wo-sidebar">
        <div className="wo-sidebar-brand">WellOps</div>

        <nav className="wo-sidebar-nav">
          <NavLink to="/app/dashboard" style={({ isActive }) => activeStyle(isActive)}>
            📊 Dashboard
          </NavLink>

          <NavLink to="/app/surveys" style={({ isActive }) => activeStyle(isActive)}>
            📋 Surveys
          </NavLink>

          {role === "ADMIN" && (
            <NavLink to="/app/users" style={({ isActive }) => activeStyle(isActive)}>
              👤 Users
            </NavLink>
          )}

          {(role === "ADMIN" || role === "MANAGER") && (
            <NavLink to="/app/teams" style={({ isActive }) => activeStyle(isActive)}>
              👥 Teams
            </NavLink>
          )}

          <NavLink to="/app/analytics" style={({ isActive }) => activeStyle(isActive)}>
            ⚡ Analytics
          </NavLink>

          <NavLink to="/app/privacy" style={({ isActive }) => activeStyle(isActive)}>
            🔒 Privacy
          </NavLink>
        </nav>

        <div className="wo-sidebar-logout">
          <button onClick={handleLogout}>Sign Out</button>
        </div>
      </aside>

      <main className="wo-app-main">
        <div className="wo-breadcrumb">{title}</div>

        <div className="wo-app-content">
          <ConsentBanner />
          <Outlet />
        </div>
      </main>
    </div>
  );
}