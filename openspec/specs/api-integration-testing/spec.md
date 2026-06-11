# api-integration-testing Specification

## Purpose

TBD - created by archiving change testing-integration-api. Update Purpose after archive.

## Requirements

### Requirement: Testcontainers-backed e2e bootstrap

`apps/api/test/global-setup.ts` SHALL boot a PostgreSQL container and a Redis container, apply Prisma migrations against the Postgres container, and export `DATABASE_URL`, `REDIS_URL`, and `JWT_ACCESS_SECRET` on `process.env` before any test file runs. `apps/api/test/global-teardown.ts` SHALL stop both containers after the test run.

#### Scenario: containers boot and env vars are exported

- **WHEN** `pnpm --filter api test:e2e` is executed with Docker running
- **THEN** `globalSetup` starts a `PostgreSqlContainer` and a `RedisContainer`, runs `prisma migrate deploy`, and sets `process.env.DATABASE_URL`, `process.env.REDIS_URL`, and `process.env.JWT_ACCESS_SECRET` to non-empty values

#### Scenario: containers stop after the run

- **WHEN** the Jest run finishes (pass or fail)
- **THEN** `globalTeardown` stops both containers and the underlying Docker resources are released

#### Scenario: clear error when Docker is unavailable

- **WHEN** `globalSetup` cannot connect to Docker
- **THEN** the run fails with a message that explicitly states Docker is required and how to start it (no raw socket/connection error)

---

### Requirement: No .env.test dependency

`apps/api` SHALL NOT require an `.env.test` file to run e2e tests. The legacy `apps/api/.env.test` and `apps/api/test/setup.ts` files SHALL be removed and replaced by `globalSetup`.

#### Scenario: e2e suite runs in a clean checkout

- **WHEN** a fresh clone of the repo is executed with only Docker installed (no manual env-var setup)
- **THEN** `pnpm --filter api test:e2e` passes without any user-supplied `.env.test`

#### Scenario: no test reads .env.test

- **WHEN** the repository is grepped for references to `.env.test` in `apps/api/`
- **THEN** no source file under `apps/api/test/` or `apps/api/src/` references it

---

### Requirement: createTestApp helper boots real AppModule

`apps/api/test/helpers/test-app.ts` SHALL expose a `createTestApp()` function that compiles the real `AppModule`, applies the same global pipes/filters/interceptors as `apps/api/src/main.ts`, initializes the Nest application, and returns `{ app, http }` where `http` is a `supertest` agent bound to the running app.

#### Scenario: test app exposes the production HTTP pipeline

- **WHEN** `createTestApp()` is called inside an integration suite
- **THEN** it returns an initialized `INestApplication` and a `supertest` agent that exercises the same global validation pipe and exception filter used in production

#### Scenario: the test app is closed after each suite

- **WHEN** an integration suite finishes
- **THEN** `app.close()` SHALL be called in `afterAll` so Prisma/Redis connections are released

---

### Requirement: seedTenant helper creates an isolated tenant

`apps/api/test/helpers/seed-tenant.ts` SHALL expose a `seedTenant(http)` function that calls `POST /auth/register` with randomized credentials and returns `{ accessToken, refreshToken, accountId, organizationId, branchId, userId }`. Subsequent requests in the suite SHALL use the returned `accessToken` in the `Authorization` header.

#### Scenario: seedTenant returns usable credentials

- **WHEN** `seedTenant(http)` is invoked inside a suite
- **THEN** the returned `accessToken` authorizes subsequent requests to authenticated endpoints in that suite

#### Scenario: seedTenant produces unique tenants across suites

- **WHEN** two suites each call `seedTenant(http)`
- **THEN** the returned `organizationId` values differ and the underlying `account.email` values do not collide

---

### Requirement: Zod response validation helper

`apps/api/test/helpers/zod-response.ts` SHALL expose a `parseWith(schema)` helper that, given a `supertest.Response`, asserts the HTTP status is 2xx and parses `response.body` through the provided Zod schema. A `ZodError` SHALL surface as a readable assertion failure that names the failing field(s).

#### Scenario: successful response is parsed and returned

- **WHEN** `parseWith(CustomerSchema)(response)` is called and `response.body` conforms to `CustomerSchema`
- **THEN** the helper returns the typed parsed value

#### Scenario: invalid response fails the test

- **WHEN** `response.body` does not conform to the provided schema
- **THEN** the helper throws a Jest-visible error whose message contains the offending field path and reason

#### Scenario: list endpoints validated as arrays

- **WHEN** an endpoint returns a JSON array
- **THEN** the suite SHALL validate it via `z.array(itemSchema)` (or the project's pagination wrapper when applicable)

---

### Requirement: Integration suite coverage for all domain modules

`apps/api/test/` SHALL contain one `<module>.e2e-spec.ts` file per domain module in `apps/api/src/`: `auth`, `organizations`, `customers`, `branches`, `customer-assets`, `services`, `suppliers`, `brands`, `work-orders`, `work-order-assignments`, `asset-checkpoints`, `activity-logs`, `inventory`, `purchase-orders`, `warranties`, `invoices`. Each suite SHALL cover the module's primary HTTP flows.

#### Scenario: every domain module has an e2e suite

- **WHEN** the contents of `apps/api/test/` are inspected
- **THEN** a `<module>.e2e-spec.ts` file exists for each of the 16 domain modules listed above

#### Scenario: each suite covers CRUD plus module-specific flows

- **WHEN** an integration suite runs
- **THEN** it exercises the module's create, read (list + detail), update, and delete endpoints (where they exist), plus any module-specific transition endpoints (e.g., work-order status transitions, PO receive/cancel, service activate/deactivate)

---

### Requirement: Every 2xx response is schema-validated when a schema exists

When a `@glossops/shared` Zod schema exists for a resource, every 2xx response that returns that resource (or a list of it) SHALL be validated via the `parseWith(schema)` helper. Endpoints whose response has no published schema SHALL assert the response shape inline and document the gap in the suite.

#### Scenario: GET detail validated against the resource schema

- **WHEN** a suite calls `GET /<module>/:id`
- **THEN** the response body is parsed through the corresponding `@glossops/shared` schema

#### Scenario: POST and PATCH responses are also validated

- **WHEN** a suite calls `POST /<module>` or `PATCH /<module>/:id` and the API returns the created/updated resource
- **THEN** the response body is parsed through the same `@glossops/shared` schema

#### Scenario: list endpoints validated through array/pagination wrapper

- **WHEN** a suite calls `GET /<module>` and the API returns a list (with or without pagination metadata)
- **THEN** the response is validated through `z.array(schema)` or the pagination wrapper, whichever matches the endpoint contract

---

### Requirement: pnpm --filter api test:e2e passes with only Docker

`pnpm --filter api test:e2e` SHALL exit with status 0 in an environment whose only prerequisite is a running Docker daemon. No manual database setup, no `.env.test`, no pre-seeded data is required.

#### Scenario: clean-environment run

- **WHEN** the command is invoked on a machine that has never run the e2e suite before but has Docker running
- **THEN** the run completes successfully and all integration suites pass

#### Scenario: repeat runs do not leak state

- **WHEN** the command is invoked twice in a row
- **THEN** the second run produces the same result as the first (containers are fresh; no state carries over between runs)
