# Design: Services Module

## Context

`Service` is the catalog entry that work orders reference for line items. The `service` table already existed in the schema with all required fields including warranty configuration columns. One schema change was required: adding `@@unique([organizationId, name])` to reject duplicate service names at the database level.

The module is org-scoped (shared across all branches of an organization). Because past work orders snapshot pricing and warranty data from the service at order time, the records must persist even when a service is no longer offered — hence the `isActive` flag instead of soft-delete.

## Goals

- Expose 7 endpoints at `/services`: CRUD plus dedicated `/activate` and `/deactivate`
- Default `GET /services` to active services only; support `?includeInactive=true`
- `GET /services/:id` returns any service (active or inactive) for editing
- Enforce `(organizationId, name)` uniqueness; catch P2002 → 409
- Block hard deletion of services referenced by WorkOrderItem or Warranty; catch P2003 → 409
- Guard idempotency: 409 when activating an already-active service or deactivating an already-inactive one
- Validate CFDI fields (`claveProdServ`, `claveUnidad`) by format regex only
- Export `ServicesService` for use by `WorkOrdersModule`

## Non-Goals

- Per-service pricing tiers or branch-level price overrides
- Service categories or grouping
- SAT catalog validation for `claveProdServ`/`claveUnidad` — deferred to InvoicesModule
- `GET /services/catalog` non-paginated endpoint
- A cleanup cron for unreferenced inactive services

## Decisions

**Dedicated activate/deactivate endpoints instead of PATCH isActive.** Keeping `isActive` out of `UpdateServiceDto` makes intent explicit and prevents accidentally toggling state through a bulk update. The two endpoints return the updated service with clear 409 semantics for already-active/inactive guards.

**`(organizationId, name)` uniqueness at DB level.** A single constraint replaces a pre-write existence check — the repository catches P2002 and rethrows as `ConflictException`. This is the same pattern as `BrandsModule`.

**`findOne` is the single 404 source of truth.** All mutating methods call `findOne` first, so 404 behavior stays uniform regardless of which downstream operation fails.

## Risks / Trade-offs

- An inactive service is still readable via `GET /services/:id` — callers can detect that a service was once offered. This is intentional; hiding inactive services from reads would break admin UIs that need to edit them.
- Name uniqueness is enforced per org, not per branch — two branches in the same org cannot have services with the same name. This is acceptable given the org-scoped catalog design.
