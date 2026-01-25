import { http } from "../../shared/api/http";

export async function login(username: string, password: string) {
  const body = new URLSearchParams();
  body.append("username", username);
  body.append("password", password);

  const res = await http.post("/auth/login", body, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  return res.data as {
    access_token: string;
    token_type: string;
  };
}
