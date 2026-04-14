# GlossOps — Next Steps

## Current State

The monorepo scaffold is complete:
- `apps/web` — Next.js (default page, no real content)
- `apps/api` — NestJS (empty AppModule)
- `packages/database` — Prisma installed, schema empty
- `packages/shared` — Package defined, no source code yet
- `docker-compose.yml` — PostgreSQL + Redis ready
- Husky hooks configured

---

## Step 1 — Prisma Schema `packages/database`

Define all domain entities. Everything else depends on this.

**Models to create:**

| Model | Key Fields |
|---|---|
| `Organization` | `id`, `name`, `slug`, `createdAt` |
| `User` | `id`, `email`, `passwordHash`, `createdAt` |
| `OrganizationMember` | `userId`, `organizationId`, `role` (Owner / Manager / Technician / FrontDesk) |
| `Customer` | `organizationId`, `name`, `phone`, `email` |
| `Vehicle` | `customerId`, `organizationId`, `make`, `model`, `year`, `plate`, `vin`, `color` |
| `WorkOrder` | `organizationId`, `vehicleId`, `customerId`, `status`, `totalAmount` |
| `WorkOrderItem` | `workOrderId`, `serviceId`, `quantity`, `unitPrice` |
| `Service` | `organizationId`, `name`, `description`, `basePrice` |
| `Supplier` | `organizationId`, `name`, `contactName`, `phone` |
| `InventoryItem` | `organizationId`, `supplierId`, `name`, `sku`, `stock`, `unitCost` |
| `WrapRoll` | `organizationId`, `supplierId`, `brand`, `series`, `finish`, `width`, `remainingLength`, `lotNumber` |
| `InventoryUsage` | `workOrderId`, `inventoryItemId?`, `wrapRollId?`, `quantityUsed` |
| `ActivityLog` | `organizationId`, `userId`, `action`, `entity`, `entityId`, `metadata` |

**Rules:**
- Every resource scoped by `organizationId`
- `ActivityLog` is append-only
- `InventoryUsage` references either `InventoryItem` or `WrapRoll` (not both)

**Deliverable:** Working migration via `pnpm --filter @glossops/database db:migrate`

---

## Step 2 — Shared Package `packages/shared`

Create `src/index.ts` and export:
- Zod schemas for each domain entity (used for validation in both API and web)
- TypeScript types derived from Zod (`z.infer<>`)
- Enums: `Role`, `WorkOrderStatus`, `ActivityAction`
- Common DTOs: `PaginationDto`, `IdParamDto`

---

## Step 3 — API: Config + Auth Module `apps/api`

**Config (`src/config/envs.ts`):**
- Parse and validate env vars with Zod: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `PORT`

**Auth module (`src/auth/`):**
- `POST /auth/register` — create user + organization in one transaction
- `POST /auth/login` — return JWT
- `JwtStrategy` + `JwtAuthGuard`
- `RolesGuard` + `@Roles()` decorator — reads role from `OrganizationMember`
- Inject `PrismaService` from `@glossops/database`

---

## Step 4 — API: Domain Modules

Each module follows the pattern: `module / controller / service`, all scoped by `organizationId` extracted from the JWT.

| Module | Endpoints |
|---|---|
| `organizations` | `GET /organizations/me`, `PATCH /organizations/me`, `POST /organizations/members` |
| `customers` | CRUD `/customers` |
| `vehicles` | CRUD `/vehicles`, nested under customer |
| `work-orders` | CRUD `/work-orders`, status transitions |
| `services` | CRUD `/services` |
| `inventory` | CRUD `/inventory/items`, CRUD `/inventory/wraps` |
| `activity-log` | `GET /activity-log` (read-only) |

---

## Step 5 — Web: Auth + Layout `apps/web`

- Login page (`/login`) with React Hook Form + Zod
- Auth context / session management (JWT stored in httpOnly cookie via Next.js route handler)
- Root layout with sidebar navigation
- Dashboard home (`/`) — placeholder stats

---

## Step 6 — Web: Core Pages

| Page | Route |
|---|---|
| Customers list + detail | `/customers`, `/customers/[id]` |
| Vehicles (nested in customer) | `/customers/[id]/vehicles/[vid]` |
| Work Orders list + detail | `/work-orders`, `/work-orders/[id]` |
| New Work Order wizard | `/work-orders/new` |
| Inventory | `/inventory` |
| Services catalog | `/services` |
| Activity Log | `/activity-log` |

---

## Infrastructure (Parallel Track)

- `Dockerfile` for `apps/api` (multi-stage build)
- `Dockerfile` for `apps/web`
- Add `api` and `web` services to `docker-compose.yml`
- GitHub Actions CI: lint + typecheck on PR
