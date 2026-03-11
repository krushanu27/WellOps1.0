# Step 1: Enhance TeamsPage & UsersPage

The existing [TeamsListPage](file:///c:/dev/WellOps1/wellops-frontend/src/features/teams/TeamsListPage.tsx#6-53) and [UsersListPage](file:///c:/dev/WellOps1/wellops-frontend/src/features/users/UsersListPage.tsx#6-54) are minimal — they render basic lists with inline styles and have some interface mismatches with the backend. This plan upgrades them to polished, data-rich management pages that align with the backend API responses.

## Proposed Changes

### Teams Feature

#### [MODIFY] [teams.api.ts](file:///c:/dev/WellOps1/wellops-frontend/src/features/teams/teams.api.ts)
- Add `department` and `created_at` to the [Team](file:///c:/dev/WellOps1/backend/app/users/models.py#16-25) interface (backend returns these)
- Add `fetchTeamUsers(teamId: string)` function to call `GET /teams/{teamId}/users`
- Add `TeamUser` interface for the response shape

#### [MODIFY] [TeamsListPage.tsx](file:///c:/dev/WellOps1/wellops-frontend/src/features/teams/TeamsListPage.tsx)
- Replace the simple list with a styled **table** (Team Name, Department, Created, Actions)
- Add an **expandable row** — clicking a team fetches and shows its members via `fetchTeamUsers`
- Show a member count badge after loading
- Use CSS classes instead of inline styles

---

### Users Feature

#### [MODIFY] [users.api.ts](file:///c:/dev/WellOps1/wellops-frontend/src/features/users/users.api.ts)
- Remove `is_active` (backend doesn't return it); the backend response is `{ id, email, role, team_id, created_at }`
- Keep `full_name` (backend model has it, route just doesn't return it yet — but we'll handle the frontend gracefully for now)

#### [MODIFY] [UsersListPage.tsx](file:///c:/dev/WellOps1/wellops-frontend/src/features/users/UsersListPage.tsx)
- Replace the simple list with a styled **table** (Email, Role, Team, Joined)
- Add a **role badge** (colored pill: ADMIN = red, MANAGER = blue, EMPLOYEE = gray)
- Resolve `team_id` to team name by cross-referencing the teams query
- Use CSS classes instead of inline styles

---

### Shared Styles

#### [MODIFY] [index.css](file:///c:/dev/WellOps1/wellops-frontend/src/index.css)
- Add reusable CSS classes: `.wo-table`, `.wo-badge`, `.wo-badge--admin`, `.wo-badge--manager`, `.wo-badge--employee`, `.wo-expand-row`, etc.
- Keep existing base styles intact

---

### Backend — Users Route Fix

#### [MODIFY] [routes.py](file:///c:/dev/WellOps1/backend/app/users/routes.py)
- Add `full_name` to the [list_users](file:///c:/dev/WellOps1/backend/app/users/routes.py#18-31) response (backend model has this field but the route doesn't return it)

## Verification Plan

### Browser Verification
1. Start the backend: `cd c:\dev\WellOps1\backend && .venv\Scripts\activate && uvicorn app.main:app --reload`
2. Start the frontend: `cd c:\dev\WellOps1\wellops-frontend && npm run dev`
3. Log in as an ADMIN user
4. Navigate to `/app/teams` — verify table renders with department/created columns; click a row to expand and see team members
5. Navigate to `/app/users` — verify table renders with role badges, team names, and created dates
6. Verify sidebar links for Teams/Users still work correctly

> [!NOTE]
> This plan only touches **existing files** — no new files are created. The changes are purely UI enhancements + fixing the API interface alignment.
