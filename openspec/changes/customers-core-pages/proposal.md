## Why

GlossOps has a complete customer API but no web interface for it — shop staff can't manage customers, view their vehicles, or launch work orders from the browser. This is the first core operational page of the web app.

## What Changes

- **BREAKING** — Rename `ResourceStatus.DELETED → INACTIVE` across the entire codebase (Prisma schema, migration, all repositories, services, and tests that reference `ResourceStatus.DELETED`).
- Extend `GET /customers` to accept `sortBy` (`firstName` | `lastName` | `createdAt`) and `sortOrder` (`asc` | `desc`) query params. Default: `createdAt desc`.
- Extend `GET /customers` response to include `activeWorkOrderCount` per customer (count of work orders with status `DRAFT`, `CONFIRMED`, or `IN_PROGRESS`).
- New page `/customers` — paginated table with search, sort, tabs (Activos / Archivados), create/edit drawer, archive and hard-delete actions.
- New page `/customers/[id]` — customer detail with editable info, vehicles table (add/edit/hard-delete), and a "Nueva orden de trabajo" button that navigates to `/work-orders/new?customerId=X&assetId=Y`.

## Capabilities

### New Capabilities

- `customers-list-page`: Web page `/customers` — table, search, sort, tabs, create/edit drawer, archive/delete actions.
- `customer-detail-page`: Web page `/customers/[id]` — customer info, vehicles table, new-work-order navigation.

### Modified Capabilities

- `customers-module`: Add `sortBy`/`sortOrder` query params and `activeWorkOrderCount` field to list response.
- `customer-assets-module`: Vehicles are hard-deleted only from the web UI (no soft delete for assets).
- `soft-delete`: Rename `ResourceStatus.DELETED → INACTIVE` globally; update all specs and code referencing the old value.

## Impact

- **`packages/database`** — Prisma schema enum value rename, new migration required.
- **`apps/api/src/customers`** — `ListCustomersDto`, `CustomerQuery`, `CustomerRepositoryInterface`, `PrismaCustomerRepository`, `InMemoryCustomerRepository`, service, controller, tests.
- **All other API modules** that reference `ResourceStatus.DELETED` — mechanical rename only, no behavior change.
- **`apps/web`** — two new route pages plus shared components: `CustomerDrawer`, `CustomerTable`, `VehicleDrawer`, `VehicleTable`, `Breadcrumb`.
- No new dependencies required — Radix/shadcn primitives already installed.
