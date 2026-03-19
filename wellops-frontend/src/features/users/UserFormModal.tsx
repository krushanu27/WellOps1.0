import { useEffect, useState } from "react";
import type {
    CreateUserPayload,
    TeamOption,
    UpdateUserPayload,
    UserItem,
    UserRole,
} from "./users.api";

type Mode = "create" | "edit";

interface UserFormModalProps {
    open: boolean;
    mode: Mode;
    teams: TeamOption[];
    initialUser?: UserItem | null;
    isSubmitting?: boolean;
    onClose: () => void;
    onSubmit: (payload: CreateUserPayload | UpdateUserPayload) => void;
}

const roleOptions: UserRole[] = ["ADMIN", "MANAGER", "EMPLOYEE"];

export default function UserFormModal({
    open,
    mode,
    teams,
    initialUser,
    isSubmitting = false,
    onClose,
    onSubmit,
}: UserFormModalProps) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState<UserRole>("EMPLOYEE");
    const [teamId, setTeamId] = useState<string>("");

    useEffect(() => {
        if (!open) return;

        if (mode === "edit" && initialUser) {
            setEmail(initialUser.email);
            setPassword("");
            setRole(initialUser.role);
            setTeamId(initialUser.team_id ?? "");
        } else {
            setEmail("");
            setPassword("");
            setRole("EMPLOYEE");
            setTeamId("");
        }
    }, [open, mode, initialUser]);

    if (!open) return null;

    const submit = (e: React.FormEvent) => {
        e.preventDefault();

        const normalizedTeamId = role === "ADMIN" ? null : teamId || null;

        if (mode === "create") {
            onSubmit({
                email: email.trim(),
                password,
                role,
                team_id: normalizedTeamId,
            });
            return;
        }

        const payload: UpdateUserPayload = {
            email: email.trim(),
            role,
            team_id: normalizedTeamId,
        };

        if (password.trim()) {
            payload.password = password.trim();
        }

        onSubmit(payload);
    };

    return (
        <div className="wo-modal-backdrop">
            <div className="wo-modal-card">
                <div className="wo-modal-header">
                    <div>
                        <h3>{mode === "create" ? "Create User" : "Edit User"}</h3>
                        <p className="wo-modal-subtitle">
                            {mode === "create"
                                ? "Add a new account with role and optional team assignment."
                                : "Update account details, role, team, or password."}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="wo-modal-close"
                    >
                        ✕
                    </button>
                </div>

                <div className="wo-modal-body">
                    <form onSubmit={submit} className="wo-modal-form">
                        <label className="wo-field">
                            <span className="wo-field-label">Email</span>
                            <input
                                className="wo-input"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="employee@company.com"
                                required
                            />
                        </label>

                        <label className="wo-field">
                            <span className="wo-field-label">
                                Password {mode === "edit" ? "(leave blank to keep unchanged)" : ""}
                            </span>
                            <input
                                className="wo-input"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required={mode === "create"}
                                minLength={8}
                                placeholder={mode === "create" ? "Minimum 8 characters" : "Optional"}
                            />
                        </label>

                        <label className="wo-field">
                            <span className="wo-field-label">Role</span>
                            <select
                                className="wo-select"
                                value={role}
                                onChange={(e) => setRole(e.target.value as UserRole)}
                            >
                                {roleOptions.map((value) => (
                                    <option key={value} value={value}>
                                        {value}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="wo-field">
                            <span className="wo-field-label">Team</span>
                            <select
                                className="wo-select"
                                value={role === "ADMIN" ? "" : teamId}
                                onChange={(e) => setTeamId(e.target.value)}
                                disabled={role === "ADMIN"}
                            >
                                <option value="">Unassigned</option>
                                {teams.map((team) => (
                                    <option key={team.id} value={team.id}>
                                        {team.name}
                                    </option>
                                ))}
                            </select>
                            <span className="wo-helper-text">
                                ADMIN users remain unassigned to teams.
                            </span>
                        </label>

                        <div className="wo-modal-actions">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isSubmitting}
                                className="wo-btn-secondary"
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="wo-btn-primary wo-btn-primary--auto"
                            >
                                {isSubmitting ? "Saving..." : mode === "create" ? "Create User" : "Save Changes"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}