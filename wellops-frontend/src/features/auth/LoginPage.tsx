import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "./auth.api";
import { useAuth } from "../../app/providers/AuthProvider";

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

      // Clear any prior auth error message
      sessionStorage.removeItem("auth_error");

      navigate("/app", { replace: true });
    } catch (err: any) {
      setError("Invalid credentials");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 360, margin: "80px auto", padding: 16 }}>
      <h1 style={{ marginBottom: 12 }}>WellOps</h1>

      {authError === "expired" && (
        <div style={{ marginBottom: 12, color: "darkred" }}>
          Your session expired. Please sign in again.
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <input
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            style={{ width: "100%", padding: 10, boxSizing: "border-box" }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: "100%", padding: 10, boxSizing: "border-box" }}
          />
        </div>

        {error && (
          <div style={{ color: "red", marginBottom: 12 }}>{error}</div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{ width: "100%", padding: 10 }}
        >
          {loading ? "Signing in..." : "Login"}
        </button>
      </form>
    </div>
  );
}
