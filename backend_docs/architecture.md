# Architecture Overview

This document explains the system components and how they interact at a high level.

## Components

- Go API server
  - Exposes REST endpoints (see `/openapi.yaml`).
  - Verifies Supabase JWTs (HS256) and enforces shop‑scoped RBAC.
  - Applies business logic for shops, invitations, categories, periods, targets, achievements, and leaderboards.
  - Hosts live API docs: `/docs/redoc.html` and `/docs/swagger.html`.
- Database (Postgres)
  - Hosted on Supabase (recommended for production) or locally via Docker during development.
  - Schema includes users, shops, memberships, invitations, categories, periods (+weeks), monthly targets, weekly distribution, weekly role weights, user week targets, daily achievements, leaderboard snapshots/rows, and imports.
  - Integrity enforced by triggers and FKs (see `docs/database.md`).
- Supabase Auth
  - Handles signup/login/password reset/magic links/OAuth.
  - Issues JWT access tokens used by the API (`Authorization: Bearer <jwt>`).

## High‑Level Data Flows

- Identity & Auth: FE uses Supabase to authenticate → receives access token → calls API with Bearer JWT → API verifies + provisions `users` row if needed.
- Shops & Access: Owners/managers invite users; accept invite creates a `shop_memberships` row mapping user to role.
- Period Configuration: Owner/manager configures monthly targets, weekly distribution, and role weights; API sets `period_recalc_flags` on edits and enforces sum constraints.
- Recompute Targets: Owner/manager calls recompute; API materializes `user_week_targets` from configs; flag cleared.
- Daily Work: Sales reps submit daily achievements; managers can review team progress.
- Leaderboard: Owner/manager computes snapshot; API aggregates achievements vs targets to produce ranked rows.

## Deployment Topology (suggested)

- Supabase (cloud): Postgres + Auth + Storage.
- Managed app host (Render/Railway/Fly/VM/Docker): Runs Go API with env vars:
  - `DB_SOURCE` (Supabase Postgres DSN)
  - `SUPABASE_JWT_SECRET` (Auth verification)
  - `PORT` (defaults 8080)

## API Docs & Clients

- Redoc UI: `/docs/redoc.html`
- Swagger UI: `/docs/swagger.html`
- OpenAPI: `/openapi.yaml`
- TypeScript client generation: `make openapi-client-ts` -> `clients/ts`

