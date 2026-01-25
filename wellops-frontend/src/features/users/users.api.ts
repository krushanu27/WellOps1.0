import { http } from "../../shared/api/http";

export interface User {
  id: string;
  email: string;
  full_name?: string;
  is_active?: boolean;
}

export async function fetchUsers(): Promise<User[]> {
  const res = await http.get("/users");
  return res.data;
}
