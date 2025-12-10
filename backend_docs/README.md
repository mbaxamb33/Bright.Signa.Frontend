# BrightSigma API for Frontend Engineers

This document summarizes how to work with the BrightSigma backend during frontend development. The HTTP API is fully described in `api/openapi.yaml`. A browsable UI is served locally at `http://localhost:8080/docs/redoc.html` when the server runs.

## Quick Start

- Start local API against Supabase (recommended):
  - Ensure `.env` contains `SUPABASE_DB_URL` and `SUPABASE_JWT_SECRET`.
  - Run: `make server-supabase`
  - Open docs: `http://localhost:8080/docs/redoc.html`
- Or start against local Postgres:
  - `make postgres && make createdb && make migrateup-local`
  - `make server-local`

## Auth

- Use Supabase Auth from the frontend (supabase-js) to sign up / sign in and obtain a JWT access token.
- Send every API call with `Authorization: Bearer <access_token>`.
- The server verifies tokens with Supabase JWT secret.
- The token subject (`sub`) is the UUID used as `users.id` in our DB. The first time a new user calls the API, `/me/bootstrap` can create the `users` row with email/name (the middleware also attempts auto-provision from the token, but bootstrap is explicit).

## RBAC

- Shop-scoped roles via `shop_memberships`:
  - `owner`: full control
  - `manager`: manage shop config and team
  - `sales_junior`, `sales_senior`: can submit their own achievements
- Many endpoints require membership; some write operations require `owner`/`manager`.

## Errors & Pagination

- Errors are JSON: `{ "error": string, "code": string }`.
- Lists accept `?limit` (default 50, max 200) and `?offset`.

## Data Conventions

- Decimal values are encoded as strings with 2 decimals (e.g., `"1000.00"`).
- Dates use ISO format `YYYY-MM-DD`.
- Timestamps use ISO8601 in UTC.

## Useful Endpoints (by flow)

1) Identity
- `GET /me` → current user id
- `POST /me/bootstrap` → ensure `users` row exists (id = token sub)

2) Shops & Team
- `POST /api/v1/shops` (owner) → create shop & owner membership
- `GET /api/v1/shops` → list my shops
- `PATCH /api/v1/shops/{shop_id}` → update name/timezone/active
- `POST /api/v1/shops/{shop_id}/invitations` (owner/manager) → invite
- `GET /api/v1/shops/{shop_id}/invitations` (owner/manager) → pending invites
- `POST /api/v1/invitations/{token}/accept` → accept invite (email must match)

3) Categories
- `GET /api/v1/categories` → list (filter by `parent_id`)
- `POST /api/v1/categories` (owner/manager) → create
- `GET /api/v1/categories/{id}` → get
- `PATCH /api/v1/categories/{id}` (owner/manager) → update

4) Periods & Config
- `POST /api/v1/shops/{shop_id}/periods` (owner/manager) → create a month; weeks are sliced automatically
- `GET /api/v1/shops/{shop_id}/periods` → list periods
- `GET /api/v1/periods/{period_id}?include_weeks=true` → get + weeks
- `PUT /api/v1/periods/{period_id}/targets` (owner/manager) → upsert monthly targets
- `PUT /api/v1/periods/{period_id}/weekly-distribution` (owner/manager) → upsert weekly percentages
- `PUT /api/v1/periods/{period_id}/role-weights/{week}` (owner/manager) → upsert weekly role weights
- `PATCH /api/v1/periods/{period_id}/status` → change status (publish/lock checks exact 100% totals)
- `POST /api/v1/periods/{period_id}/recompute` (owner/manager) → materialize `user_week_targets`

5) Achievements & Leaderboard
- `POST /api/v1/shops/{shop_id}/achievements` (bulk) → sales roles write own, manager/owner can write for others
- `GET /api/v1/users/{user_id}/achievements?start=YYYY-MM-DD&end=YYYY-MM-DD` → list range
- `POST /api/v1/periods/{period_id}/leaderboard/snapshots` (owner/manager) → compute/refresh leaderboard
- `GET /api/v1/periods/{period_id}/leaderboard` → list snapshots
- `GET /api/v1/leaderboard/snapshots/{snapshot_id}` → rows

## Domain Cheat Sheet

- categories: global tree with acyclicity constraint; `unit` is `count|currency`.
- periods: monthly config per shop; drives weeks & targets.
- weekly_distribution: percent per week; must be exactly 100 at publish/lock.
- weekly_role_weights: percent of weekly target per role; must be exactly 100 per week at publish/lock.
- user_week_targets: derived targets, recomputed by API.
- user_daily_achievements: user-submitted totals per day/category; sources: manual/import/api.
- leaderboard: snapshots & rows computed from achievements vs targets.

## Dev Tips

- Use Supabase dashboard to create users and test tokens.
- Keep a `.env` with API server configs; `make server-supabase` or `make server-local`.
- Browse spec at `/openapi.yaml` and docs at `/docs/redoc.html` while developing.

