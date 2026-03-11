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
    background: isActive ? "rgba(79, 70, 229, 0.1)" : undefined,
    color: isActive ? "#4f46e5" : undefined,
  });

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside className="wo-sidebar">
        <div className="wo-sidebar-brand">WellOps</div>

        <nav className="wo-sidebar-nav">
          <NavLink to="/app/dashboard" style={({ isActive }) => activeStyle(isActive)}>
            📊 Dashboard
          </NavLink>
          <NavLink to="/app/surveys" style={({ isActive }) => activeStyle(isActive)}>
            📋 Surveys
          </NavLink>

          {(role === "ADMIN" || role === "MANAGER") && (
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

      <main style={{ flex: 1 }}>
        <div className="wo-breadcrumb">{title}</div>

        <div style={{ padding: 18 }}>
          <ConsentBanner />
          <Outlet />
        </div>
      </main>
    </div>
  );
}