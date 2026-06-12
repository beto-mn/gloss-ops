## Why

`apps/api` has no real integration test coverage. The existing `test/` folder contains only `app.e2e-spec.ts` (smoke) and `auth.e2e-spec.ts`, both of which depend on a developer-maintained `.env.test` file that points at the local Postgres + Redis services. This means tests cannot run in a clean environment (CI, fresh checkout) without manual setup, and there is no contract validation between the controllers' JSON responses and the Zod schemas published by `@glossops/shared`. As a result, breaking changes to controller payloads can ship without any test catching the drift.

## What Changes

- **BREAKING (dev workflow)**: `apps/api/.env.test` is removed. `pnpm --filter api test:e2e` will require Docker (not Postgres/Redis services) to run.
- A `globalSetup` boots a `PostgreSqlContainer` and a `RedisContainer` via `@testcontainers/postgresql` and `@testcontainers/redis`, runs `prisma migrate deploy` against the fresh database, and exports `DATABASE_URL` / `REDIS_URL` / `JWT_ACCESS_SECRET` to the test process.
- A `globalTeardown` stops both containers after the run finishes.
- The existing `auth.e2e-spec.ts` and `app.e2e-spec.ts` are **replaced** with the new format that boots `AppModule` against the container-backed env and validates every successful response against its `@glossops/shared` Zod schema.
- New `*.e2e-spec.ts` integration suites are added for **all 16 domain modules**: `auth`, `organizations`, `customers`, `branches`, `customer-assets`, `services`, `suppliers`, `brands`, `work-orders`, `work-order-assignments`, `asset-checkpoints`, `activity-logs`, `inventory`, `purchase-orders`, `warranties`, `invoices`.
- Each suite seeds an isolated `Account + Organization + Branch + OWNER` tenant via the public `/auth/register` endpoint, then exercises CRUD + key flows for that module.
- A reusable helper (`test/helpers/zod-response.ts`) parses HTTP responses through the corresponding `@glossops/shared` schema and fails the test on a `ZodError`. **Every successful response** (GET, POST, PATCH, DELETE-with-body) is validated through this helper when a schema exists.
- A reusable `test/helpers/test-app.ts` builds the Nest `AppModule` once per suite, applies the same global pipes/filters as `main.ts`, and exposes the `INestApplication` plus a typed `supertest` agent.

## Capabilities

### New Capabilities

- `api-integration-testing`: Testcontainers-backed e2e harness for `apps/api` (Postgres + Redis lifecycle, AppModule bootstrap helper, Zod-validated response helper, per-tenant seed helper) plus integration suites covering all 16 domain modules with contract validation against `@glossops/shared` schemas.

### Modified Capabilities

<!-- None. No existing requirement-level capability is changing; the existing modules' specs continue to describe HTTP contracts unchanged. -->

## Impact

- **apps/api/test/**: new `global-setup.ts`, `global-teardown.ts`, `helpers/test-app.ts`, `helpers/zod-response.ts`, `helpers/seed-tenant.ts`, and one `<module>.e2e-spec.ts` per domain module. `app.e2e-spec.ts` and `auth.e2e-spec.ts` are rewritten in the new format.
- **apps/api/test/jest-e2e.json**: `globalSetup` switches from `./setup.ts` to `./global-setup.ts`; `globalTeardown` added.
- **apps/api/.env.test**: deleted; the file is no longer read by anything.
- **apps/api/test/setup.ts**: deleted (replaced by `global-setup.ts`).
- **New dev-dependencies (apps/api)**: `testcontainers`, `@testcontainers/postgresql`, `@testcontainers/redis`. `dotenv` import in tests is removed.
- **No changes to `src/`**: controllers, services, repositories, DTOs, and Prisma schema remain untouched.
- **No changes to `@glossops/shared`**: schemas are consumed as-is.
- **CI implication**: the testing job must have Docker available; runtime grows by the container boot time (~5–10 s per run, amortized across all suites since containers are shared via globalSetup).
