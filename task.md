# WellOps1 — Step-by-Step Improvements

## Step 1: Build Out TeamsPage & UsersPage
- [x] Research existing code (backend APIs, frontend patterns)
- [x] Write implementation plan
- [x] Get user approval
- [x] Enhance [teams.api.ts](file:///c:/dev/WellOps1/wellops-frontend/src/features/teams/teams.api.ts) — add `department`, `created_at`, [fetchTeamUsers](file:///c:/dev/WellOps1/wellops-frontend/src/features/teams/teams.api.ts#22-26)
- [x] Enhance [users.api.ts](file:///c:/dev/WellOps1/wellops-frontend/src/features/users/users.api.ts) — align [User](file:///c:/dev/WellOps1/backend/app/users/models.py#27-41) interface with backend response
- [x] Rebuild [TeamsListPage](file:///c:/dev/WellOps1/wellops-frontend/src/features/teams/TeamsListPage.tsx#49-123) — table with department, member count, expandable rows
- [x] Rebuild [UsersListPage](file:///c:/dev/WellOps1/wellops-frontend/src/features/users/UsersListPage.tsx#22-100) — table with role badges, team name, created date
- [x] Add CSS for tables and badges
- [x] Verify TypeScript build passes

## Step 2: Dashboard / Home Page
- [ ] Plan & implement

## Step 3: Ethics Module
- [ ] Plan & implement

## Step 4: Frontend Polish
- [ ] Plan & implement

## Step 5–10: Remaining items
- [ ] Audit Trail UI, Testing, README, Docker, RBAC, ML Integration
