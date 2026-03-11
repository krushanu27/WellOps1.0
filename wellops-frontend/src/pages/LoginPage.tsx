import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../features/auth/auth.api";
import { useAuth } from "../app/providers/AuthProvider";

export function LoginPage() {
  const navigate = useNavigate();
  const { login: saveToken } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authError = sessionStorage.getItem("auth_error");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = await login(username, password);
      saveToken(data.access_token);
      sessionStorage.removeItem("auth_error");
      navigate("/app", { replace: true });
    } catch {
      setError("Invalid credentials");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="wo-login-wrapper">
      <div className="wo-login-card">
        <div className="wo-login-header">
          <h1>WellOps</h1>
          <p>Employee Wellness Platform</p>
        </div>

        <div className="wo-login-body">
          {authError === "expired" && (
            <div className="wo-error-text">
              Your session expired. Please sign in again.
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="wo-field">
              <label className="wo-field-label">Email</label>
              <input
                className="wo-input"
                placeholder="admin@test.com"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="wo-field">
              <label className="wo-field-label">Password</label>
              <input
                className="wo-input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && <div className="wo-error-text">{error}</div>}

            <button
              className="wo-btn-primary"
              type="submit"
              disabled={loading}
              style={{ marginTop: 6 }}
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
