## Context

The customer API is complete (CRUD, search, pagination, soft/hard delete). The web app has no customer interface. This change builds the first operational web pages and makes three targeted API improvements: enum rename, sort support, and an active-order count field.

The `ResourceStatus` enum currently uses `DELETED` as the soft-delete value. This is semantically wrong — a soft-deleted record is not removed from the database, it is inactive. The rename touches every module that uses `ResourceStatus` but is a mechanical change with no behavior difference.

## Goals / Non-Goals

**Goals:**

- Ship `/customers` list and `/customers/[id]` detail pages end-to-end.
- Rename `ResourceStatus.DELETED → INACTIVE` across the full stack.
- Add configurable sort and `activeWorkOrderCount` to `GET /customers`.
- Provide a path from customer detail to work order creation via URL query params.

**Non-Goals:**

- Branch-level customer filtering — customers belong to the organization, not to a branch. This is a permanent architectural decision, not a deferred feature.
- CSV import/export.
- Inline editing (all edits go through the shared drawer).
- Work orders page itself — only the navigation handoff (`/work-orders/new?customerId=X&assetId=Y`) is in scope.

## Decisions

### 1. `ResourceStatus.DELETED → INACTIVE` — rename the enum value globally

**Decision**: Rename in Prisma schema, generate a migration that renames the enum label in PostgreSQL (`ALTER TYPE … RENAME VALUE`), and do a mechanical find-replace of `ResourceStatus.DELETED` across the codebase.

**Alternatives considered**:

- Add a separate `CustomerStatus` enum for customers only — rejected because it duplicates a nearly identical concept and leaves the original `DELETED` name in place for other entities.
- Keep `DELETED` as-is — rejected because it misleads developers; a soft-deleted row still exists in the database.

**Risk**: The rename touches every module that uses `ResourceStatus`. Scope is broad but each change is trivial. The in-memory repositories used by tests make the blast radius easy to verify.

### 2. `activeWorkOrderCount` — single JOIN in the repository, not N+1

**Decision**: Add a `_count` select on `workOrders` (filtered by `DRAFT | CONFIRMED | IN_PROGRESS`) directly inside `findAll`'s `prisma.customer.findMany`. Return `CustomerWithCount` (extends `Prisma.CustomerModel` with `activeWorkOrderCount: number`).

**Alternatives considered**:

- Separate endpoint / lazy load in the web — rejected because it causes N+1 requests for a table with 20+ rows and adds frontend complexity.
- Computed at the service layer with `Promise.all` — rejected because it still produces N queries; a single JOIN is strictly better.

### 3. Sort — extend `ListCustomersDto` and `CustomerQuery`

**Decision**: Add `sortBy: 'firstName' | 'lastName' | 'createdAt'` (default `createdAt`) and `sortOrder: 'asc' | 'desc'` (default `desc`) to the DTO. The Prisma repository builds the `orderBy` clause dynamically. The in-memory repository sorts the array before slicing.

### 4. Customer drawer — shared create/edit component

**Decision**: One `CustomerDrawer` component that receives an optional `customer` prop. When present, it operates in edit mode (pre-fills form, calls `PATCH`); when absent, it operates in create mode (calls `POST`). This avoids duplicating a 10-field form.

### 5. Vehicles — hard delete only from the web UI

**Decision**: The API supports both soft and hard delete for `CustomerAsset`. The web UI exposes only hard delete (no "archive vehicle" action). Rationale: a vehicle that no longer belongs to a customer should simply be removed — historical work orders already reference the asset by ID and are unaffected.

### 6. "Nueva orden de trabajo" — URL query params handoff

**Decision**: The button navigates to `/work-orders/new?customerId=X&assetId=Y`. The work orders page (future change) reads these params to pre-fill the form. This is a loose coupling — the customers page needs no knowledge of the work-order form structure.

When the button is clicked from the customer header (no vehicle selected), `assetId` is omitted and the work-order form will require the user to pick a vehicle.

### 7. Navigation — breadcrumbs only, no sidebar sub-menu

**Decision**: The sidebar `NavItem` for Clientes already highlights for any `/customers/*` path (via `pathname.startsWith`). A breadcrumb (`Clientes > [Nombre]`) in the page header is sufficient for the two-level hierarchy.

## Risks / Trade-offs

- **`ResourceStatus` rename scope** → The mechanical rename is large but low-risk. All affected code is caught at compile time by TypeScript. Run the full test suite after the migration.
- **`activeWorkOrderCount` stale on mutation** → TanStack Query cache invalidation on work-order create/update/delete must include the customers query key. This is a cross-module cache concern; document it in the hook.
- **`/work-orders/new` not yet built** → The "Nueva orden" button will navigate to a non-existent page until that feature ships. Acceptable for now — the link is correct, the destination page is pending.

## Migration Plan

1. Update `packages/database/prisma/schema.prisma` — rename enum value.
2. Run `prisma migrate dev --name rename-resource-status-deleted-to-inactive`.
3. Verify migration SQL uses `ALTER TYPE "ResourceStatus" RENAME VALUE 'DELETED' TO 'INACTIVE'`.
4. Find-replace `ResourceStatus.DELETED` → `ResourceStatus.INACTIVE` across `apps/api`.
5. Run `pnpm test` — all 596 tests must pass before proceeding to web work.
6. Implement API additions (sort, activeWorkOrderCount).
7. Build web pages.
