import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../app/providers/AuthProvider";

import UserFormModal from "./UserFormModal";
import {
  createUser,
  deleteUser,
  fetchTeams,
  fetchUsers,
  updateUser,
  type CreateUserPayload,
  type UpdateUserPayload,
  type UserItem,
} from "./users.api";

export default function UsersPage() {
  const queryClient = useQueryClient();
  const { role } = useAuth();

  const [createOpen, setCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);

  const {
    data: users = [],
    isLoading: usersLoading,
    isError: usersError,
  } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
  });

  const {
    data: teams = [],
    isLoading: teamsLoading,
  } = useQuery({
    queryKey: ["teams"],
    queryFn: fetchTeams,
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateUserPayload) => createUser(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setCreateOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ userId, payload }: { userId: string; payload: UpdateUserPayload }) =>
      updateUser(userId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setEditingUser(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const teamNameMap = useMemo(() => {
    return new Map(teams.map((team) => [team.id, team.name]));
  }, [teams]);

  const totalUsers = users.length;
  const totalAdmins = users.filter((user) => user.role === "ADMIN").length;
  const totalManagers = users.filter((user) => user.role === "MANAGER").length;
  const totalEmployees = users.filter((user) => user.role === "EMPLOYEE").length;

  if (usersLoading || teamsLoading) {
    return (
      <section className="wo-page-shell">
        <div className="wo-admin-users-header">
          <div>
            <p className="wo-admin-eyebrow">Administration</p>
            <h1>User Management</h1>
            <p className="wo-admin-subtitle">Loading users and teams...</p>
          </div>
        </div>
      </section>
    );
  }

  if (usersError) {
    return (
      <section className="wo-page-shell">
        <div className="wo-admin-users-header">
          <div>
            <p className="wo-admin-eyebrow">Administration</p>
            <h1>User Management</h1>
          </div>
        </div>

        <div className="wo-admin-alert wo-admin-alert--error">
          Failed to load users. Check the backend route and try again.
        </div>
      </section>
    );
  }

  return (
    <section className="wo-page-shell">
      <div className="wo-admin-users-header">
        <div>
          <p className="wo-admin-eyebrow">Administration</p>
          <h1>User Management</h1>
          <p className="wo-admin-subtitle">
            Create, update, and remove user accounts with role and team assignment.
          </p>
        </div>

        <div className="wo-page-actions">
          {role === "ADMIN" && (
            <button className="wo-btn-primary wo-btn-primary--auto" onClick={() => setCreateOpen(true)}>
              + Create User
            </button>
          )}
        </div>
      </div>

      <div className="wo-admin-stats-grid">
        <div className="wo-admin-stat-card">
          <span className="wo-admin-stat-label">Total Users</span>
          <strong className="wo-admin-stat-value">{totalUsers}</strong>
        </div>

        <div className="wo-admin-stat-card">
          <span className="wo-admin-stat-label">Admins</span>
          <strong className="wo-admin-stat-value">{totalAdmins}</strong>
        </div>

        <div className="wo-admin-stat-card">
          <span className="wo-admin-stat-label">Managers</span>
          <strong className="wo-admin-stat-value">{totalManagers}</strong>
        </div>

        <div className="wo-admin-stat-card">
          <span className="wo-admin-stat-label">Employees</span>
          <strong className="wo-admin-stat-value">{totalEmployees}</strong>
        </div>
      </div>

      <div className="wo-admin-table-card">
        <div className="wo-admin-table-topbar">
          <div>
            <h2>Directory</h2>
            <p>All active user accounts currently available in the system.</p>
          </div>
        </div>

        <div className="wo-admin-table-wrap">
          <table className="wo-table wo-admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Team</th>
                <th className="wo-admin-table-actions-col">Actions</th>
              </tr>
            </thead>

            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="wo-table-empty">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="wo-admin-user-cell">
                        <div className="wo-admin-user-avatar">
                          {user.email.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="wo-admin-user-email">{user.email}</div>
                          <div className="wo-admin-user-meta">User ID: {user.id.slice(0, 8)}...</div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className={`wo-badge wo-badge--${user.role.toLowerCase()}`}>
                        {user.role}
                      </span>
                    </td>

                    <td>
                      <span className="wo-admin-team-pill">
                        {user.team_id ? teamNameMap.get(user.team_id) ?? "Unknown Team" : "Unassigned"}
                      </span>
                    </td>

                    <td>
                      <div className="wo-table-actions">
                        <button
                          className="wo-btn-secondary"
                          onClick={() => setEditingUser(user)}
                        >
                          Edit
                        </button>

                        <button
                          className="wo-btn-danger"
                          onClick={() => {
                            const confirmed = window.confirm(
                              `Delete user ${user.email}? This cannot be undone.`
                            );
                            if (!confirmed) return;
                            deleteMutation.mutate(user.id);
                          }}
                          disabled={deleteMutation.isPending}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <UserFormModal
        open={createOpen}
        mode="create"
        teams={teams}
        isSubmitting={createMutation.isPending}
        onClose={() => setCreateOpen(false)}
        onSubmit={(payload) => createMutation.mutate(payload as CreateUserPayload)}
      />

      <UserFormModal
        open={!!editingUser}
        mode="edit"
        initialUser={editingUser}
        teams={teams}
        isSubmitting={updateMutation.isPending}
        onClose={() => setEditingUser(null)}
        onSubmit={(payload) => {
          if (!editingUser) return;
          updateMutation.mutate({
            userId: editingUser.id,
            payload: payload as UpdateUserPayload,
          });
        }}
      />
    </section>
  );
}