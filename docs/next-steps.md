# GlossOps — Next Steps

> Last updated: 2026-05-21

## Current State

| Layer                           | Status      | Notes                                                                   |
| ------------------------------- | ----------- | ----------------------------------------------------------------------- |
| Monorepo scaffold               | ✅ Complete | pnpm workspaces, Husky, docker-compose                                  |
| `packages/database`             | ✅ Complete | Full Prisma schema, migrations, seed, `AssignmentRole` enum added       |
| `apps/api` — Config             | ✅ Complete | Zod-validated env schema, barrel export                                 |
| `apps/api` — Auth module        | ✅ Complete | JWT + Redis refresh tokens, RBAC guards, repository pattern             |
| `apps/api` — Organizations      | ✅ Complete | CRUD, invitations require `branchId`, soft/hard delete, member listing  |
| `apps/api` — Customers          | ✅ Complete | CRUD, soft/hard delete, status filters                                  |
| `apps/api` — Branches           | ✅ Complete | CRUD, peer branches, no `isMain`                                        |
| `apps/api` — Customer Assets    | ✅ Complete | CRUD nested under customer + flat read/update/delete                    |
| `apps/api` — Services           | ✅ Complete | CRUD with activate/deactivate                                           |
| `apps/api` — Suppliers          | ✅ Complete | CRUD                                                                    |
| `apps/api` — Brands             | ✅ Complete | CRUD with seeded-brand protection                                       |
| `apps/api` — Work Orders        | ✅ Complete | CRUD, status transitions, warranty generation on COMPLETED              |
| `apps/api` — Work Order Assign. | ✅ Complete | Assign/unassign technicians with `LEAD`/`ASSISTANT` role                |
| `apps/api` — Asset Checkpoints  | ✅ Complete | Reception/delivery checkpoints per work order                           |
| `apps/api` — Activity Logs      | ✅ Complete | Append-only audit trail, read-only list endpoint                        |
| `apps/api` — Inventory          | ✅ Complete | List inventory, usage history per item                                  |
| `apps/api` — Purchase Orders    | ✅ Complete | CRUD, receive/cancel flow                                               |
| `apps/api` — Warranties         | ✅ Complete | Auto-generated on WO completion, validate/void, find by asset/WO        |
| `apps/api` — Invoices           | ✅ Complete | CRUD, per-branch folio `INV-YYYY-NNNN`, DRAFT→ISSUED→PAID transitions   |
| `apps/api` — Swagger UI         | ✅ Complete | OpenAPI decorators, neon dark theme at `/docs`                          |
| `apps/api` — TS path aliases    | ✅ Complete | `tsconfig.paths.json`, barrel exports, Jest mapper                      |
| `apps/api` — Tests              | ✅ Complete | 596 tests across 54 suites — repos use in-memory, no Prisma/Redis mocks |
| `packages/shared`               | ⏳ Pending  | No source yet                                                           |
| `apps/web`                      | ⏳ Pending  | Next.js default page only                                               |
| Infrastructure                  | ⏳ Pending  | Dockerfiles, GitHub Actions CI                                          |

---

## ✅ Step 1 — Prisma Schema `packages/database` — DONE

Full schema implemented with all domain entities, migrations applied, and seed script ready.

Implemented models: `Account`, `Organization`, `OrganizationFiscalProfile`, `Branch`, `OrganizationMember`, `Customer`, `CustomerAsset`, `Service`, `Supplier`, `Brand`, `WorkOrder`, `WorkOrderItem`, `WorkOrderAssignment`, `Invoice`, `Warranty`, `Inventory`, `InventoryItem`, `MaterialRoll`, `InventoryUsage`, `PurchaseOrder`, `PurchaseOrderItem`, `AssetCheckpoint`, `ActivityLog`.

Key design decisions documented in [`docs/database/design.md`](database/design.md).

---

## ✅ Step 3 — API: Config + Auth Module `apps/api` — DONE

> Step 3 was implemented before Step 2 — the auth module is the foundation for all other API modules.

### Config (`src/config/`)

- Zod schema validates all env vars at startup with `safeParse` — fails fast with a clear error if any are missing or invalid
- `JWT_ACCESS_EXPIRES_IN_SECONDS` (number) eliminates the `as any` cast required by `JwtModule.register`
- Exported via `@config` path alias

### Auth module (`src/auth/`)

Endpoints:

| Method | Path             | Description                                        |
| ------ | ---------------- | -------------------------------------------------- |
| `POST` | `/auth/register` | Create account, return access + refresh token pair |
| `POST` | `/auth/login`    | Validate credentials, return token pair            |
| `POST` | `/auth/refresh`  | Rotate refresh token, return new token pair        |
| `POST` | `/auth/logout`   | Revoke refresh token from Redis                    |

Infrastructure:

- `AuthGuard` — verifies JWT, loads account + membership via `AccountRepositoryInterface`, attaches `AuthContext` to request
- `RolesGuard` — RBAC check against `OrganizationMember.role` (`OWNER`, `MANAGER`, `TECHNICIAN`, `FRONT_DESK`)
- `@Public()` decorator — opts a route out of the auth guard
- `@Roles(...roles)` decorator — restricts a route to specific roles
- `@CurrentAccount()` param decorator — extracts typed `AuthContext` from request
- `AuthContext` interface — `{ sub, memberId, email, branchId, organizationId, role }`
- **45 unit tests** — all passing

Repository pattern:

- `AccountRepositoryInterface` + `TokenStoreInterface` — contracts in `interfaces/`
- `auth.tokens.ts` — DI injection symbols (`ACCOUNT_REPOSITORY`, `TOKEN_STORE`)
- `infrastructure/prisma-account.repository.ts` — Prisma implementation (production)
- `infrastructure/redis-token.store.ts` — Redis implementation (production)
- `infrastructure/in-memory-account.repository.ts` — sync in-memory implementation (tests)
- `infrastructure/in-memory-token.store.ts` — sync in-memory implementation (tests)
- `AuthModule` binds tokens to implementations — services and guards depend only on interfaces
- Tests use `{ provide: TOKEN, useClass: InMemoryX }` — no Prisma or Redis mocks

TypeScript infrastructure:

- `tsconfig.paths.json` with 7 path aliases (`@auth`, `@auth/decorators`, `@auth/dto`, `@auth/guards`, `@auth/interfaces`, `@config`, `@prisma`)
- Barrel `index.ts` exports for each aliased module, sorted longest → shortest
- Jest `moduleNameMapper` configured to match path aliases in tests

---

## ⏳ Step 2 — Shared Package `packages/shared`

Create `src/index.ts` and export:

- Zod schemas for each domain entity (used for validation in both API and web)
- TypeScript types derived from Zod (`z.infer<>`)
- Enums: `Role`, `WorkOrderStatus`, `ActivityAction`
- Common DTOs: `PaginationDto`, `IdParamDto`

---

## ✅ Step 4a — API: Organizations module — DONE

Endpoints:

| Method   | Path                                | Description                                         |
| -------- | ----------------------------------- | --------------------------------------------------- |
| `GET`    | `/organizations/me`                 | Return the current organization                     |
| `GET`    | `/organizations`                    | List orgs the current account belongs to            |
| `PATCH`  | `/organizations/me`                 | Update current organization                         |
| `DELETE` | `/organizations/me`                 | Soft delete (Owner) — `?permanent=true` hard delete |
| `GET`    | `/organizations/members`            | List members of the current organization            |
| `POST`   | `/organizations/invitations`        | Create invitation — requires `branchId`             |
| `POST`   | `/organizations/invitations/accept` | Accept invitation, create account if needed         |

Highlights:

- `register` creates `Account` + `Organization` + first `Branch` (with org name) + `OrganizationMember(OWNER)` (deferred transaction — see `docs/decisions/deferred-transactions.md`)
- Branches are peers — no `isMain` flag. Inviter must explicitly choose `branchId` when sending an invitation
- Invitation payload stored in Redis with TTL; `acceptInvitation` validates token, optionally creates the account, and adds `OrganizationMember` anchored to the chosen branch
- Membership cap of 5 organizations per account enforced on accept
- Repository pattern with `PrismaOrganizationRepository`, `RedisInvitationStore`, and in-memory variants for tests

---

## ✅ Step 4b — API: Customers module — DONE

CRUD `/customers` with soft delete (`status = DELETED`) and Owner-only hard delete via `?permanent=true`. Status filters on list endpoint. Repository pattern with Prisma + in-memory variants.

---

## ✅ Step 4c — API: Branches CRUD — DONE

| Method   | Path            | Description                         |
| -------- | --------------- | ----------------------------------- |
| `GET`    | `/branches`     | List branches of current org        |
| `POST`   | `/branches`     | Create a new branch (Owner/Manager) |
| `GET`    | `/branches/:id` | Read a single branch                |
| `PATCH`  | `/branches/:id` | Update a branch                     |
| `DELETE` | `/branches/:id` | Delete a branch (Owner only)        |

---

## ✅ Step 4d — Remaining Domain Modules — DONE

All domain modules are implemented following the repository pattern established in `auth/`.

### Customer Assets (`src/customer-assets/`)

| Method   | Path                            | Description                 |
| -------- | ------------------------------- | --------------------------- |
| `POST`   | `/customers/:customerId/assets` | Create asset under customer |
| `GET`    | `/customers/:customerId/assets` | List assets for a customer  |
| `GET`    | `/customer-assets/:id`          | Get a single asset          |
| `PATCH`  | `/customer-assets/:id`          | Update an asset             |
| `DELETE` | `/customer-assets/:id`          | Delete an asset             |

### Services (`src/services/`)

| Method   | Path                       | Description          |
| -------- | -------------------------- | -------------------- |
| `POST`   | `/services`                | Create a service     |
| `GET`    | `/services`                | List services        |
| `GET`    | `/services/:id`            | Get a single service |
| `PATCH`  | `/services/:id`            | Update a service     |
| `DELETE` | `/services/:id`            | Delete a service     |
| `POST`   | `/services/:id/activate`   | Activate a service   |
| `POST`   | `/services/:id/deactivate` | Deactivate a service |

### Suppliers (`src/suppliers/`)

Standard CRUD at `/suppliers` (POST, GET, GET /:id, PATCH /:id, DELETE /:id).

### Brands (`src/brands/`)

Standard CRUD at `/brands` (POST, GET, GET /:id, PATCH /:id, DELETE /:id). Seeded brands cannot be deleted.

### Work Orders (`src/work-orders/`)

| Method   | Path                      | Description                  |
| -------- | ------------------------- | ---------------------------- |
| `POST`   | `/work-orders`            | Create a work order          |
| `GET`    | `/work-orders`            | List work orders             |
| `GET`    | `/work-orders/:id`        | Get a single work order      |
| `PATCH`  | `/work-orders/:id`        | Update a work order          |
| `PATCH`  | `/work-orders/:id/status` | Transition work order status |
| `DELETE` | `/work-orders/:id`        | Delete a work order          |

### Work Order Assignments (`src/work-order-assignments/`)

| Method   | Path                                        | Description                           |
| -------- | ------------------------------------------- | ------------------------------------- |
| `POST`   | `/work-orders/:workOrderId/assignments`     | Assign a technician (Owner/Manager)   |
| `GET`    | `/work-orders/:workOrderId/assignments`     | List assignments for a work order     |
| `DELETE` | `/work-orders/:workOrderId/assignments/:id` | Unassign a technician (Owner/Manager) |

Assignment roles: `LEAD`, `ASSISTANT`.

### Asset Checkpoints (`src/asset-checkpoints/`)

| Method   | Path                                        | Description                         |
| -------- | ------------------------------------------- | ----------------------------------- |
| `POST`   | `/work-orders/:workOrderId/checkpoints`     | Create a checkpoint (Owner/Manager) |
| `GET`    | `/work-orders/:workOrderId/checkpoints`     | List checkpoints for a work order   |
| `GET`    | `/work-orders/:workOrderId/checkpoints/:id` | Get a single checkpoint             |
| `PATCH`  | `/work-orders/:workOrderId/checkpoints/:id` | Update a checkpoint (Owner/Manager) |
| `DELETE` | `/work-orders/:workOrderId/checkpoints/:id` | Delete a checkpoint (Owner/Manager) |

### Activity Logs (`src/activity-logs/`)

| Method | Path             | Description                           |
| ------ | ---------------- | ------------------------------------- |
| `GET`  | `/activity-logs` | List activity log entries (read-only) |

### Inventory (`src/inventory/`)

| Method | Path                    | Description                              |
| ------ | ----------------------- | ---------------------------------------- |
| `GET`  | `/inventory`            | List inventory items and rolls           |
| `GET`  | `/inventory/:id/usages` | List usage history for an inventory item |

### Purchase Orders (`src/purchase-orders/`)

| Method   | Path                           | Description                     |
| -------- | ------------------------------ | ------------------------------- |
| `POST`   | `/purchase-orders`             | Create a purchase order         |
| `GET`    | `/purchase-orders`             | List purchase orders            |
| `GET`    | `/purchase-orders/:id`         | Get a single purchase order     |
| `PATCH`  | `/purchase-orders/:id`         | Update a purchase order         |
| `DELETE` | `/purchase-orders/:id`         | Delete a purchase order         |
| `POST`   | `/purchase-orders/:id/receive` | Receive items (full or partial) |
| `POST`   | `/purchase-orders/:id/cancel`  | Cancel a purchase order         |

---

## ✅ Step 4e — API: Warranties + Invoices — DONE

### Warranties (`src/warranties/`)

Auto-generated when a work order transitions to `COMPLETED`. Each `WorkOrderItem` linked to a `Service` with `warrantyDays > 0` produces a `Warranty` record scoped to the branch.

| Method  | Path                                   | Description                      |
| ------- | -------------------------------------- | -------------------------------- |
| `GET`   | `/work-orders/:workOrderId/warranties` | List warranties for a work order |
| `GET`   | `/customer-assets/:assetId/warranties` | List warranties for an asset     |
| `GET`   | `/warranties/:id`                      | Get a single warranty            |
| `PATCH` | `/warranties/:id/void`                 | Void a warranty (Owner/Manager)  |

Also exposes `WarrantyService.validateClaim()` — used internally by `WorkOrdersService` when creating a `WARRANTY_CLAIM` type work order.

### Invoices (`src/invoices/`)

Per-branch folio generation via `InvoiceCounter` table. Folio format: `INV-{YYYY}-{NNNN}`, monotonic counter per branch. CFDI fields stored but timbrado is a future PAC integration.

| Method  | Path                                | Description                                 |
| ------- | ----------------------------------- | ------------------------------------------- |
| `POST`  | `/invoices`                         | Create invoice for a completed WO           |
| `GET`   | `/invoices`                         | List invoices (paginated, filter by status) |
| `GET`   | `/invoices/:id`                     | Get invoice detail                          |
| `PATCH` | `/invoices/:id`                     | Update fiscal data (DRAFT only)             |
| `PATCH` | `/invoices/:id/status`              | Transition status                           |
| `GET`   | `/work-orders/:workOrderId/invoice` | Get the invoice for a work order            |

Status machine: `DRAFT → ISSUED → PAID`, any → `CANCELLED`. `DRAFT → ISSUED` requires the work order to be `COMPLETED`.

Pending for a future iteration: CFDI timbrado (PAC integration), PDF generation, email delivery, `OrganizationFiscalProfile` endpoints.

---

## ⏳ Step 5 — Web: Auth + Layout `apps/web`

- Login page (`/login`) with React Hook Form + Zod
- Auth context / session management (JWT stored in httpOnly cookie via Next.js route handler)
- Root layout with sidebar navigation
- Dashboard home (`/`) — placeholder stats

---

## ⏳ Step 6 — Web: Core Pages

| Page                          | Route                               |
| ----------------------------- | ----------------------------------- |
| Customers list + detail       | `/customers`, `/customers/[id]`     |
| Vehicles (nested in customer) | `/customers/[id]/vehicles/[vid]`    |
| Work Orders list + detail     | `/work-orders`, `/work-orders/[id]` |
| New Work Order wizard         | `/work-orders/new`                  |
| Inventory                     | `/inventory`                        |
| Services catalog              | `/services`                         |
| Activity Log                  | `/activity-log`                     |

---

## ⏳ Infrastructure (Parallel Track)

- `Dockerfile` for `apps/api` (multi-stage build)
- `Dockerfile` for `apps/web`
- Add `api` and `web` services to `docker-compose.yml`
- GitHub Actions CI: lint + typecheck on PR
