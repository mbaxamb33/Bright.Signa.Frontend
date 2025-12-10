# Authorization (RBAC)

RBAC is shop‑scoped via `shop_memberships`. A user can have different roles across different shops.

## Roles

- owner: Full control over the shop, members, configuration and data.
- manager: Manage team and period configuration; cannot transfer ownership.
- sales_junior, sales_senior: Submit their own achievements; view limited data.

## Permission Matrix (summary)

- Shops
  - Create shop: owner only (by definition, creator becomes owner)
  - Update shop (name/timezone/active): owner, manager
  - Get shop: any active member
  - List my shops: authenticated user (derived from memberships)
- Invitations
  - Create/list/revoke: owner, manager
  - Accept: authenticated user whose email matches invited_email
- Categories (global)
  - Create/update: owner or manager in any shop
  - List/get: authenticated user
- Periods & Weeks
  - Create period: owner, manager
  - List/get periods: any member
  - Update status (publish/lock): owner, manager
  - List weeks: any member
- Targets
  - Upsert monthly targets: owner, manager
  - Upsert weekly distribution: owner, manager
  - Upsert weekly role weights: owner, manager
  - List targets/distribution/weights: any member
  - Recompute user week targets: owner, manager
- Achievements
  - Upsert (bulk): sales roles can only write their own; owner/manager can write for any user in the shop
  - List by user/range: user themself; OR owner/manager if they share a shop with the target user
- Leaderboard
  - Compute snapshot: owner, manager
  - List snapshots/rows: any member of the period's shop

Enforcement is in API middleware (`requireMembership`, `requireAnyRole`) backed by sqlc queries. Some actions (e.g., invite acceptance) have additional checks (email equality).

