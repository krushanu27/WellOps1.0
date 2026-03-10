import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../providers/AuthProvider";
import { usePageTitle } from "../lib/usePageTitle";

const linkStyle = ({ isActive }: { isActive: boolean }) => ({
  display: "block",
  padding: "10px 12px",
  borderRadius: 8,
  textDecoration: "none",
  color: "inherit",
  background: isActive ? "rgba(0,0,0,0.08)" : "transparent",
});

export function AppLayout() {
  const { logout, role } = useAuth();
  const navigate = useNavigate();
  const title = usePageTitle();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside
        style={{
          width: 260,
          padding: 16,
          borderRight: "1px solid rgba(0,0,0,0.1)",
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 16 }}>WellOps</div>

        <nav style={{ display: "grid", gap: 6 }}>
          <NavLink to="/app/surveys" style={linkStyle}>
            Surveys
          </NavLink>

          {(role === "ADMIN" || role === "MANAGER") && (
            <NavLink to="/app/users" style={linkStyle}>
              Users
            </NavLink>
          )}

          {(role === "ADMIN" || role === "MANAGER") && (
            <NavLink to="/app/teams" style={linkStyle}>
              Teams
            </NavLink>
          )}

          <NavLink to="/app/analytics" style={linkStyle}>
            Analytics
          </NavLink>
        </nav>

        <div style={{ marginTop: 24 }}>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </aside>

      <main style={{ flex: 1 }}>
        <header
          style={{
            padding: "14px 18px",
            borderBottom: "1px solid rgba(0,0,0,0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ fontWeight: 600 }}>{title}</div>
        </header>

        <div style={{ padding: 18 }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}