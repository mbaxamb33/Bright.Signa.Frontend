## Common Flows (Step-by-step)

### 1) Onboarding: Create Shop and Invite Team

1. User signs up with Supabase, gets a JWT access token.
2. Frontend calls `POST /me/bootstrap` to ensure a `users` row exists.
3. Create shop as the owner:
   - `POST /api/v1/shops` with `{ name, timezone }`.
4. Invite teammates:
   - `POST /api/v1/shops/{shop_id}/invitations` for each email + role.
5. Teammates sign up in Supabase, obtain tokens, then accept:
   - `POST /api/v1/invitations/{token}/accept` (ensures email matches).

### 2) Configure a Tracking Period

1. Create period.
   - `POST /api/v1/shops/{shop_id}/periods` with `{ year, month }`.
2. Define monthly targets.
   - `PUT /api/v1/periods/{period_id}/targets` with list of `{ category_id, target_value }`.
3. Define weekly distribution.
   - `PUT /api/v1/periods/{period_id}/weekly-distribution` with list of `{ week_index, percentage }`.
4. Define weekly role weights for each week.
   - `PUT /api/v1/periods/{period_id}/role-weights/{week_index}` with list of `{ role, weight_percentage }`.
5. Recompute user week targets.
   - `POST /api/v1/periods/{period_id}/recompute`.
6. Optionally publish or lock the period (validates sums to exactly 100%).
   - `PATCH /api/v1/periods/{period_id}/status` `{ status: "published" | "locked" }`.

### 3) Daily Operation: Submit Achievements & View Leaderboard

1. Sales reps submit daily achievements.
   - `POST /api/v1/shops/{shop_id}/achievements` (bulk array; sales roles can only write their own rows).
2. Managers/owners can view any user's daily achievements.
   - `GET /api/v1/users/{user_id}/achievements?start=YYYY-MM-DD&end=YYYY-MM-DD`.
3. Compute or refresh leaderboard snapshot for the period.
   - `POST /api/v1/periods/{period_id}/leaderboard/snapshots`.
4. View leaderboard.
   - `GET /api/v1/periods/{period_id}/leaderboard` (snapshots).
   - `GET /api/v1/leaderboard/snapshots/{snapshot_id}` (rows).

### 4) Categories

- Create top-level categories (e.g., `revenue`) with `unit`:
  - `POST /api/v1/categories` with `{ name, unit: "currency" }`.
- Optional: create child categories by providing `parent_id`.
- Update name/unit/weight/sort.

### 5) Error Handling & Pagination

- Errors return `{ error, code }`; use the `code` to branch UI logic.
- Lists support `?limit` and `?offset`.

### 6) Developer Sandbox

- Use Supabase dashboard to create test users.
- Connect Postman to `/openapi.yaml` to import routes.
- Spin up local API with `make server-supabase` or `make server-local`.
- Browse the docs at `http://localhost:8080/docs/redoc.html`.

