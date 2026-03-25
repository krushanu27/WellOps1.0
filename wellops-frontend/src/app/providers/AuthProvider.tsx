import { createContext, useContext, useMemo, useState } from "react";

export type Role = "ADMIN" | "MANAGER" | "EMPLOYEE";

type AuthContextType = {
  token: string | null;
  role: Role | null;
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
};

function getRoleFromToken(token: string | null): Role | null {
  if (!token) return null;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.role ?? null;
  } catch {
    return null;
  }
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("access_token")
  );

  const role = getRoleFromToken(token);

  const login = (newToken: string) => {
    localStorage.setItem("access_token", newToken);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    setToken(null);
  };

  const value = useMemo<AuthContextType>(
    () => ({
      token,
      role,
      isAuthenticated: !!token,
      login,
      logout,
    }),
    [token, role]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}