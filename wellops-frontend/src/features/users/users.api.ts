import { http } from "../../shared/api/http";

export interface User {
  id: string;
  email: string;
  full_name?: string;
  role: string;
  team_id?: string;
  created_at?: string;
}

export async function fetchUsers(): Promise<User[]> {
  const res = await http.get("/users");
  return res.data;
}
