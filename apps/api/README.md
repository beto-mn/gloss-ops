# GlossOps API

NestJS backend for the GlossOps platform — a multi-tenant SaaS for automotive wrap, detailing, and restyling shops.

## Tech Stack

- **NestJS** + TypeScript
- **PostgreSQL** via **Prisma ORM**
- **Redis** (refresh token store)
- **JWT** access tokens + Redis-backed refresh token rotation
- **RBAC** — four roles: `OWNER`, `MANAGER`, `TECHNICIAN`, `FRONT_DESK`

## Running Locally

```bash
# From the monorepo root — start PostgreSQL and Redis
docker compose up -d

# Install dependencies
pnpm install

# Apply migrations and generate Prisma client
pnpm --filter @glossops/database db:migrate
pnpm --filter @glossops/database build

# Start the API in watch mode
pnpm --filter api start:dev
```

The API runs at `http://localhost:4000`.  
Swagger UI is available at `http://localhost:4000/docs`.

## Tests

```bash
# From apps/api/
pnpm test          # all unit tests
pnpm test:cov      # with coverage report
```

**543 tests, 47 suites.** All repositories use in-memory implementations — no Prisma or Redis mocks.

## Modules

| Module                   | Controller prefix                           | Description                                 |
| ------------------------ | ------------------------------------------- | ------------------------------------------- |
| `auth`                   | `/auth`                                     | Register, login, refresh, logout            |
| `organizations`          | `/organizations`                            | Org CRUD, members, invitations              |
| `branches`               | `/branches`                                 | Branch CRUD (peer branches, no hierarchy)   |
| `customers`              | `/customers`                                | Customer CRUD with soft/hard delete         |
| `customer-assets`        | `/customers/:id/assets`, `/customer-assets` | Asset CRUD nested under customer            |
| `services`               | `/services`                                 | Service catalog with activate/deactivate    |
| `suppliers`              | `/suppliers`                                | Supplier CRUD                               |
| `brands`                 | `/brands`                                   | Brand catalog (seeded brands protected)     |
| `work-orders`            | `/work-orders`                              | Work order CRUD + status transitions        |
| `work-order-assignments` | `/work-orders/:id/assignments`              | Technician assignments (`LEAD`/`ASSISTANT`) |
| `asset-checkpoints`      | `/work-orders/:id/checkpoints`              | Reception/delivery checkpoints              |
| `activity-logs`          | `/activity-logs`                            | Append-only audit trail (read-only)         |
| `inventory`              | `/inventory`                                | Inventory list + usage history per item     |
| `purchase-orders`        | `/purchase-orders`                          | Purchase order CRUD + receive/cancel        |

## Architecture Patterns

**Repository pattern** — every domain module has:

```
<module>/
  interfaces/          ← repository contract + barrel
  infrastructure/      ← PrismaXxx + InMemoryXxx implementations
  <module>.tokens.ts   ← DI injection token symbols
  <module>.module.ts   ← binds tokens to implementations
  <module>.service.ts  ← depends on interfaces only
  <module>.controller.ts
```

`PrismaService` may only be injected inside `infrastructure/` classes.

**Multi-tenancy** — every query is scoped by `organizationId` (or `branchId → branch.organizationId`), extracted from the JWT via `@CurrentAccount()`. Never trust `organizationId` from the request body.

**Path aliases** — defined in `tsconfig.paths.json`, e.g. `@auth`, `@prisma`, `@work-orders`. See `CLAUDE.md` for the full tier-based import ordering rules.

## Environment Variables

Copy `.env.example` from the monorepo root and fill in:

| Variable                         | Description                       |
| -------------------------------- | --------------------------------- |
| `DATABASE_URL`                   | PostgreSQL connection string      |
| `REDIS_URL`                      | Redis connection string           |
| `JWT_ACCESS_SECRET`              | Secret for signing access tokens  |
| `JWT_REFRESH_SECRET`             | Secret for signing refresh tokens |
| `JWT_ACCESS_EXPIRES_IN_SECONDS`  | Access token TTL (seconds)        |
| `JWT_REFRESH_EXPIRES_IN_SECONDS` | Refresh token TTL (seconds)       |
