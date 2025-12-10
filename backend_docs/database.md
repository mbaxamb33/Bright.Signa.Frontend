# Database Schema

This document explains the schema, relationships, constraints, and integrity rules.

## Entities & Relationships (ERD — textual)

- users (id PK uuid)
  - Global identity across shops.
- shops (id PK uuid)
  - A business unit; has name, timezone, active flag.
- shop_memberships (id PK uuid)
  - (shop_id FK → shops.id, user_id FK → users.id)
  - role (enum: owner, manager, sales_junior, sales_senior), active bool
  - Unique constraint on (shop_id, user_id)
- invitations (id PK uuid)
  - (shop_id FK → shops.id, invited_by_user_id FK → users.id)
  - invited_email, role (enum), token unique, status (pending|accepted|revoked|expired)
  - expires_at, accepted_at, revoked_at
- categories (id PK varchar)
  - name, unit (enum: count|currency), parent_id (FK → categories.id, nullable), weight numeric string, sort_order
  - Tree (acyclic enforced by trigger)
- periods (id PK uuid)
  - (shop_id FK → shops.id), year, month, start_date, end_date, status (draft|published|locked|archived), locked_at
  - Unique constraint (shop_id, year, month)
- period_weeks (id PK uuid)
  - (period_id FK → periods.id), week_index, start_date, end_date, day_count
  - Unique constraint (period_id, week_index)
- shop_month_targets (id PK uuid)
  - (period_id FK → periods.id), (category_id FK → categories.id), target_value (decimal string)
  - Unique constraint (period_id, category_id)
- weekly_distribution (id PK uuid)
  - (period_id FK → periods.id), week_index, percentage (decimal string)
  - Unique constraint (period_id, week_index)
- weekly_role_weights (id PK uuid)
  - (period_id FK → periods.id), week_index, role (enum), weight_percentage
  - Unique constraint (period_id, week_index, role)
- user_week_targets (id PK uuid)
  - (period_id FK → periods.id), week_index, (user_id FK → users.id), (category_id FK → categories.id), target_value
  - Unique constraint (period_id, week_index, user_id, category_id)
- user_daily_achievements (id PK uuid)
  - (shop_id FK → shops.id), (user_id FK → users.id), (category_id FK → categories.id)
  - occurred_on (date, in shop local convention), achieved_value, source (enum)
  - Unique constraint (shop_id, user_id, category_id, occurred_on)
- sales_entries (id PK uuid)
  - Raw transaction log: (shop_id, user_id, category_id), occurred_at timestamptz, amount, source, external_ref
  - Indexed by occurred_at; used to compute aggregates (optionally)
- leaderboard_snapshots (id PK uuid)
  - (period_id FK → periods.id), computed_at, rules_version
  - Unique constraint (period_id, rules_version)
- leaderboard_rows (id PK uuid)
  - (snapshot_id FK → leaderboard_snapshots.id), (user_id FK → users.id)
  - rank, score (decimal string), achievement_pct (decimal string), trend (enum), streak_days
  - Unique constraint (snapshot_id, user_id)
- imports (id PK uuid)
  - (shop_id FK → shops.id), (period_id FK → periods.id, nullable), type (targets|achievements), file_name, status, log jsonb, created_by, updated_by

## Integrity Rules & Triggers

- Weekly distribution sum per period
  - IMMEDIATE constraint trigger ensures sum(percentage) ≤ 100 on each statement.
  - BEFORE UPDATE OF status ON periods: require exactly 100 when publishing/locking.
- Weekly role weights per (period, week)
  - IMMEDIATE constraint trigger ensures sum(weight_percentage) ≤ 100 per edit.
  - BEFORE UPDATE OF status ON periods: require exactly 100 per week when publishing/locking.
- Categories acyclicity
  - Constraint trigger rejects updates/insertions that would create a cycle.
- Recalc flags
  - `period_recalc_flags(period_id PK)` marks periods needing recomputation; triggers on targets/distribution/weights create/update this row.
  - Recompute clears the flag.

## Timezone Considerations

- Shop has a `timezone` string (IANA timezone name).
- `user_daily_achievements.occurred_on` is a date; client or ingestion layer must ensure it reflects the shop's local day.
- A view `v_user_daily_aggregates` converts `sales_entries.occurred_at` to local dates via `(occurred_at AT TIME ZONE shops.timezone)::date`.

## Indexes (selected)

- shop_memberships: (shop_id, role, active, user_id), (user_id, active, shop_id)
- invitations: (shop_id, invited_email, status)
- categories: (parent_id, sort_order)
- periods: (shop_id, status)
- user_week_targets: (period_id, user_id), (user_id, period_id, week_index)
- user_daily_achievements: (shop_id, occurred_on), (user_id, occurred_on), (user_id, category_id, occurred_on)
- sales_entries: (shop_id, occurred_at), (user_id, occurred_at), (shop_id, user_id, category_id, occurred_at)
- leaderboard_snapshots: (period_id), leaderboard_rows: (snapshot_id, rank)
- imports: (shop_id, period_id, type), (status)

