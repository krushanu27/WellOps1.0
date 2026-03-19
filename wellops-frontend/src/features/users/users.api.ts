import { http } from "../../shared/api/http";

export type UserRole = "ADMIN" | "MANAGER" | "EMPLOYEE";

export interface UserItem {
  id: string;
  email: string;
  role: UserRole;
  team_id: string | null;
}

export interface TeamOption {
  id: string;
  name: string;
}

export interface CreateUserPayload {
  email: string;
  password: string;
  role: UserRole;
  team_id: string | null;
}

export interface UpdateUserPayload {
  email?: string;
  password?: string;
  role?: UserRole;
  team_id?: string | null;
}

export async function fetchUsers(): Promise<UserItem[]> {
  const { data } = await http.get("/users");
  return data;
}

export async function createUser(payload: CreateUserPayload): Promise<UserItem> {
  const { data } = await http.post("/users", payload);
  return data;
}

export async function updateUser(userId: string, payload: UpdateUserPayload): Promise<UserItem> {
  const { data } = await http.put(`/users/${userId}`, payload);
  return data;
}

export async function deleteUser(userId: string): Promise<void> {
  await http.delete(`/users/${userId}`);
}

/**
 * Reuse your existing teams endpoint if already present.
 * Adjust this path only if your backend route differs.
 */
export async function fetchTeams(): Promise<TeamOption[]> {
  const { data } = await http.get("/teams");
  return data;
}