# GlossOps — Next Steps

> Last updated: April 2026

## Current State

| Layer | Status | Notes |
| ----- | ------ | ----- |
| Monorepo scaffold | ✅ Complete | pnpm workspaces, Husky, docker-compose |
| `packages/database` | ✅ Complete | Full Prisma schema, migrations, seed, tsconfig |
| `apps/api` — Config | ✅ Complete | Zod-validated env schema, barrel export |
| `apps/api` — Auth module | ✅ Complete | JWT + Redis refresh tokens, RBAC guards, repository pattern, 45 tests |
| `apps/api` — TS path aliases | ✅ Complete | `tsconfig.paths.json`, barrel exports, Jest mapper |
| `packages/shared` | ⏳ Pending | No source yet |
| `apps/api` — Domain modules | ⏳ Pending | organizations, customers, work-orders, etc. |
| `apps/web` | ⏳ Pending | Next.js default page only |
| Infrastructure | ⏳ Pending | Dockerfiles, GitHub Actions CI |

---

## ✅ Step 1 — Prisma Schema `packages/database` — DONE

Full schema implemented with all domain entities, migrations applied, and seed script ready.

Implemented models: `Account`, `Organization`, `OrganizationFiscalProfile`, `Branch`, `OrganizationMember`, `Customer`, `CustomerAsset`, `Service`, `Supplier`, `Brand`, `WorkOrder`, `WorkOrderItem`, `WorkOrderAssignment`, `Invoice`, `Warranty`, `Inventory`, `InventoryItem`, `MaterialRoll`, `InventoryUsage`, `PurchaseOrder`, `PurchaseOrderItem`, `AssetCheckpoint`, `ActivityLog`.

Key design decisions documented in [`docs/database-design.md`](database-design.md).

---

## ✅ Step 3 — API: Config + Auth Module `apps/api` — DONE

> Step 3 was implemented before Step 2 — the auth module is the foundation for all other API modules.

### Config (`src/config/`)

- Zod schema validates all env vars at startup with `safeParse` — fails fast with a clear error if any are missing or invalid
- `JWT_ACCESS_EXPIRES_IN_SECONDS` (number) eliminates the `as any` cast required by `JwtModule.register`
- Exported via `@config` path alias

### Auth module (`src/auth/`)

Endpoints:

| Method | Path | Description |
| ------ | ---- | ----------- |
| `POST` | `/auth/register` | Create account, return access + refresh token pair |
| `POST` | `/auth/login` | Validate credentials, return token pair |
| `POST` | `/auth/refresh` | Rotate refresh token, return new token pair |
| `POST` | `/auth/logout` | Revoke refresh token from Redis |

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

## ⏳ Step 4 — API: Domain Modules

Each module follows the pattern: `module / controller / service`, all scoped by `organizationId` extracted from the JWT via `@CurrentAccount()`.

**Priority order:**

| # | Module | Endpoints |
| - | ------ | --------- |
| 1 | `organizations` | `GET /organizations/me`, `PATCH /organizations/me`, `POST /organizations/members` |
| 2 | `customers` | CRUD `/customers` |
| 3 | `vehicles` | CRUD `/vehicles`, nested under customer |
| 4 | `work-orders` | CRUD `/work-orders`, status transitions |
| 5 | `services` | CRUD `/services` |
| 6 | `inventory` | CRUD `/inventory/items`, CRUD `/inventory/wraps` |
| 7 | `activity-log` | `GET /activity-log` (read-only) |

**Notes for implementation:**

- `organizationId` must always come from `request.user.organizationId` — never from the request body
- All Prisma queries must include tenant scope (`organizationId` or `branchId`) before executing
- The `register` endpoint should create an `Organization` + first `Branch` + `OrganizationMember` (role: `OWNER`) in a single transaction
- Each module must follow the repository pattern established in `auth/` — see `CLAUDE.md` for the required structure
- `PrismaService` may only be injected inside `infrastructure/` classes — never in services, guards, or controllers

---

## ⏳ Step 5 — Web: Auth + Layout `apps/web`

- Login page (`/login`) with React Hook Form + Zod
- Auth context / session management (JWT stored in httpOnly cookie via Next.js route handler)
- Root layout with sidebar navigation
- Dashboard home (`/`) — placeholder stats

---

## ⏳ Step 6 — Web: Core Pages

| Page | Route |
| ---- | ----- |
| Customers list + detail | `/customers`, `/customers/[id]` |
| Vehicles (nested in customer) | `/customers/[id]/vehicles/[vid]` |
| Work Orders list + detail | `/work-orders`, `/work-orders/[id]` |
| New Work Order wizard | `/work-orders/new` |
| Inventory | `/inventory` |
| Services catalog | `/services` |
| Activity Log | `/activity-log` |

---

## ⏳ Infrastructure (Parallel Track)

- `Dockerfile` for `apps/api` (multi-stage build)
- `Dockerfile` for `apps/web`
- Add `api` and `web` services to `docker-compose.yml`
- GitHub Actions CI: lint + typecheck on PR
