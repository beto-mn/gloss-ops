# Design: Branches Module

## Context

After removing `Branch.isMain`, branches became peers with no management API. The organization at registration has one auto-created branch and no way to add more. The invitation DTO already requires a `branchId`, so the frontend needs a branch list to populate that selector. Every `OrganizationMember` references a `branch.id`, and multiple dependent tables (`work_order`, `inventory`, `purchase_order`, `invoice`, `activity_log`) also FK-reference `branch.id`, so deletion must be handled carefully.

## Goals

- Full CRUD under `/branches` scoped to `organizationId` from the JWT
- Soft delete only via the API; hard delete runs via a nightly cron after a 30-day retention window
- Block soft-deleting the last ACTIVE branch (system invariant: every org must have at least one branch)
- Enforce unique branch names within an org at the application layer, scoped to ACTIVE branches only
- `BranchCleanupService` cron at 03:00 daily hard-deletes expired soft-deleted branches and cascades to `OrganizationMember` rows

## Non-Goals

- A restore endpoint for soft-deleted branches
- Hard delete via `?permanent=true` on the API
- Reassigning members across branches before delete
- Multi-instance cron coordination (advisory locks, external scheduler)
- Frontend integration of the branch selector

## Decisions

- **Soft-delete-only API, hard-delete via cron** — giving Owners a 30-day safety net while keeping the database clean over time without exposing a destructive endpoint.
- **`ON DELETE CASCADE` on `OrganizationMember.branch`** (Option A over a manual transaction in `hardDelete`) — minimal code, explicit at the schema level; other FK dependents (work orders, inventory) will throw on hard-delete until those modules ship, which is acceptable and desirable as an early warning.
- **App-layer name uniqueness scoped to ACTIVE** — matches the customer email/phone uniqueness pattern; a DELETED branch does not block name reuse, allowing cleanup without forcing a rename first.
- **`countActive` as a dedicated repository method** — lets the service enforce the last-branch guard with a single query without loading all branches.

## Risks / Trade-offs

- Soft-deleting a branch with active work orders or inventory will succeed at the API level; the cron hard-delete will then fail with FK violations until those modules add their own cascade or soft-delete strategy. This is intentional — it surfaces the problem rather than silently losing data.
- Single-instance cron with no distributed locking; acceptable for MVP but requires hardening before multi-instance deployment.
