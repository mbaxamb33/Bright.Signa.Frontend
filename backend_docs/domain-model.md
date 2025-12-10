# Domain Model

This document explains the core business concepts and how they relate.

## Users and Shops

- `users`: Global identities across multiple shops.
- `shops`: A business unit with its own timezone and team.
- `shop_memberships`: Assigns a user a role in a shop (owner, manager, sales_*). Memberships are active/inactive.

## Invitations

- Owners/managers invite by email and desired role. An invitation contains a unique token.
- Accepting an invite (authenticated) validates that the caller’s email matches the invited email.
- Accepting creates/updates a `shop_memberships` row for the caller.

## Categories

- A hierarchical (acyclic) global catalog of metrics tracked by the app.
- `unit` defines how numbers are interpreted: `count` or `currency` (decimal string).
- Examples: `revenue` (currency), `units_sold` (count).

## Periods and Weeks

- A Period represents a calendar month for a specific shop.
- Weeks are sliced inside the month in 7-day chunks (last week may be shorter), with `day_count` tracked.
- Periods have a lifecycle status: `draft` → `published` → `locked` (or `archived`).

## Targets & Distribution

- Monthly targets per category are set at the period level (`shop_month_targets`).
- Weekly distribution defines the fraction of the monthly target assigned to each week (must total 100% at publish/lock).
- Weekly role weights split each week’s target across roles (per week sum must be 100% at publish/lock).
- `user_week_targets` are derived from these inputs by distributing each role’s weekly target evenly across active members in that role (with deterministic remainder distribution).

## Achievements

- `user_daily_achievements` tracks actuals per user/category/day.
- Sources: `manual` (user input), `import` (CSV), `api` (integrations).
- The view `v_user_daily_aggregates` can aggregate from raw `sales_entries` by shop timezone if you integrate a POS/CRM.

## Leaderboard

- A snapshot captures a ranked list of users’ performance for a period at a specific time and `rules_version`.
- Score is typically computed as `achieved / target * 100` (percent). Trends compare to previous values and can be extended.
- Rows are stored in `leaderboard_rows` for fast retrieval.

