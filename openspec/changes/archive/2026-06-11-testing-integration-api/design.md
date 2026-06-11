## Context

`apps/api` is a NestJS service with 16 domain modules backed by Prisma (PostgreSQL) and Redis (refresh token rotation). Unit tests use in-memory repositories and cover the service layer in isolation (596+ tests, all passing), but there is no real end-to-end coverage of the HTTP layer against a live database. The two existing `*.e2e-spec.ts` files (`app`, `auth`) require the developer to keep `apps/api/.env.test` in sync with a manually-started Postgres + Redis on `localhost`, which (a) fails in any clean environment such as CI or a teammate's first checkout and (b) does not catch drift between controller payloads and the `@glossops/shared` Zod schemas that `apps/web` relies on.

`@glossops/shared` already publishes Zod schemas for the 14 resource shapes (`Customer`, `WorkOrder`, `Invoice`, etc.) plus enums and pagination DTOs. These are the contract `apps/web` consumes via TanStack Query; right now nothing verifies that the API actually returns objects matching those schemas.

## Goals / Non-Goals

**Goals:**

- Boot a fresh PostgreSQL and Redis container from `globalSetup`, apply Prisma migrations, and tear them down in `globalTeardown` — zero manual setup beyond having Docker running.
- Delete `apps/api/.env.test` and `apps/api/test/setup.ts`; the test harness owns every env var it needs.
- Provide a single `createTestApp()` helper that boots `AppModule` with the same global pipes/filters as `main.ts` and returns `{ app, http }` (where `http` is a typed `supertest` agent).
- Provide a `seedTenant(http)` helper that registers a fresh Account + Org + Branch + OWNER via `/auth/register` and returns the access token plus IDs, so each suite gets isolation without resetting the database between tests.
- Provide a `parseWith(schema)(response)` helper that asserts `response.status` is 2xx and runs the body through a Zod schema, throwing a readable error on `ZodError`.
- Cover all 16 domain modules with at least the happy-path CRUD + main workflow per module (e.g., work-order status transitions, PO receive/cancel, WO completion → warranty generation).
- Validate **every successful response** (GET, POST, PATCH; DELETE responses too when they return a body) against the corresponding `@glossops/shared` schema, when one exists.
- `pnpm --filter api test:e2e` must pass in a clean environment whose only prerequisite is Docker.

**Non-Goals:**

- Performance/load testing of the API.
- Property-based or fuzz testing of controllers.
- Replacing the existing in-memory unit-test suite — those keep running unchanged via `pnpm --filter api test`.
- Adding new schemas to `@glossops/shared` (this change consumes whatever is already published; gaps are documented in `tasks.md` as follow-up).
- Modifying any controller, service, repository, or Prisma schema in `src/`.
- Wiring this into CI (deferred to feature `infrastructure_ci`).

## Decisions

### D1: Containers boot once per test run, not per suite

`globalSetup` starts one `PostgreSqlContainer` and one `RedisContainer`, runs `prisma migrate deploy` on the Postgres URL, and exports `DATABASE_URL` / `REDIS_URL` / `JWT_ACCESS_SECRET` on `process.env`. All suites share the containers; isolation is achieved by giving every suite its own fresh tenant via `seedTenant()` (every row gets a unique `organizationId`).

**Why not a container per suite?** Container boot is the slow part (~3–8 s). Booting it 16 times would balloon the e2e run from ~30 s to ~2 min and provide no extra correctness — the multi-tenant schema already isolates rows by `organizationId`.

**Why not reset the database between suites?** With per-tenant scoping there is no cross-suite interference. A `TRUNCATE` step would add latency without changing outcomes; if a future suite needs a pristine database it can call a helper instead of forcing it on everyone.

### D2: Reuse the real `AppModule` — no test-specific module wiring

`createTestApp()` calls `Test.createTestingModule({ imports: [AppModule] }).compile()` and applies the same global pipes, filters, and interceptors as `apps/api/src/main.ts`. No overrides, no mocks. This guarantees the test harness exercises the exact production pipeline (validation pipe, exception filter, response shape).

**Alternative considered**: a thinner "test app" that wires only the modules under test. Rejected — the controllers and guards already work; we want to catch wiring bugs, not avoid them.

### D3: Tenant seeding via the public `/auth/register` endpoint

`seedTenant()` calls `POST /auth/register` with random credentials and returns `{ accessToken, accountId, organizationId, branchId, userId }`. Subsequent calls in the suite attach `Authorization: Bearer <token>`.

**Why not seed via Prisma directly?** Doing so would bypass the very controller (`AuthController.register`) we want to validate, and would duplicate the password-hashing + token-issuing logic. Using the endpoint also keeps tests aligned with how a real client onboards.

**Why random credentials?** A unique `account.email` per suite avoids the unique-constraint collision that would happen if two suites ran with the same seed.

### D4: One Zod helper, used everywhere a response body is asserted

`parseWith(schema)(response)` returns `schema.parse(response.body)` (and throws on `ZodError` with a formatted message). Lists are validated with `z.array(schema)` or `PaginationSchema.extend({ data: z.array(schema) })` depending on the endpoint shape.

**Why centralize?** Inlining `schema.parse` per test scatters the formatting logic and produces ugly stack traces; a helper produces a single readable failure (`parseWith(CustomerSchema) failed: data.email — Expected string, received null`). It also gives one place to handle the GET-list-vs-GET-one distinction.

**Coverage rule**: every 2xx response that has a corresponding schema in `@glossops/shared` MUST be parsed through the helper. Endpoints without a published schema (e.g., DELETE with empty body, auth token pair) are asserted shape-only — this is documented per-test, not silently skipped.

### D5: Suite-per-module, file naming `<module>.e2e-spec.ts`

One file per `src/<module>/` directory, matching the existing Jest `testRegex: .e2e-spec.ts$`. Files live in `apps/api/test/` (flat) rather than mirroring `src/` — this keeps the existing `jest-e2e.json` config working unchanged and matches how `app.e2e-spec.ts` and `auth.e2e-spec.ts` are placed today.

### D6: `@testcontainers/postgresql` and `@testcontainers/redis`, not the generic `testcontainers` API

Both packages are thin wrappers that expose `getConnectionUri()` / `getConnectionUrl()` directly. Using them avoids reimplementing image/port/healthcheck boilerplate in `globalSetup` and pins us to known-good Postgres 16 / Redis 7 images by default. The umbrella `testcontainers` package is still pulled in transitively for the lifecycle types.

### D7: `JWT_ACCESS_SECRET` is generated, not hardcoded

`globalSetup` writes `process.env.JWT_ACCESS_SECRET = randomUUID()` so every run uses a unique secret. This catches any accidental "hardcoded test secret" assumption in the codebase and removes the last reason `.env.test` existed.

### D8: Prisma migrations via `prisma migrate deploy`, not `db push`

`globalSetup` shells out to `prisma migrate deploy --schema=../../packages/database/prisma/schema.prisma` with `DATABASE_URL` pointing at the freshly-booted container. This applies the same migrations that run in production — `db push` would diverge from the migration history and could mask migration-only bugs. Migration runtime is ~1–2 s once the container is up.

## Risks / Trade-offs

- **[Risk]** Docker not installed locally → tests fail with an unhelpful error. **Mitigation**: `global-setup.ts` catches the connection error and throws a clear "Docker is required to run e2e tests — please start Docker Desktop" message.
- **[Risk]** Slow first run on machines without the Postgres/Redis images cached. **Mitigation**: documented in `README` of `apps/api`; subsequent runs use the cached image (instant).
- **[Risk]** Migration runtime adds wall-clock to every CI run. **Mitigation**: ~2 s for the current schema; if it grows, we can switch to a snapshot-restore strategy without changing the test API surface.
- **[Risk]** Tests that don't clean up dangling tenants can leak across reruns inside the same containerized session. **Mitigation**: with `globalTeardown` killing the container, every run starts from a virgin database — leaks cannot survive a process boundary.
- **[Risk]** `@glossops/shared` may lack a schema for some response (e.g., auth token pair, `/health` endpoint). **Mitigation**: documented per-suite; the test asserts shape manually and a follow-up task is created to publish the missing schema (out of scope for this change).
- **[Trade-off]** Suite-shared containers vs per-suite isolation: chose shared for speed (~10x faster) at the cost of relying on the multi-tenant `organizationId` scoping for isolation. This is the same scoping the production code relies on, so a failure here would be a real bug.

## Migration Plan

1. Install new dev-deps: `pnpm --filter api add -D testcontainers @testcontainers/postgresql @testcontainers/redis`.
2. Create `apps/api/test/global-setup.ts` and `apps/api/test/global-teardown.ts`.
3. Create helpers under `apps/api/test/helpers/`: `test-app.ts`, `seed-tenant.ts`, `zod-response.ts`.
4. Update `apps/api/test/jest-e2e.json` to point at the new `globalSetup` / `globalTeardown`.
5. Delete `apps/api/.env.test` and `apps/api/test/setup.ts`.
6. Rewrite `app.e2e-spec.ts` and `auth.e2e-spec.ts` in the new format.
7. Add one `<module>.e2e-spec.ts` per remaining module (15 files).
8. Run `pnpm --filter api test:e2e` — must pass green from a clean Docker state.

**Rollback**: revert the git changes; restore `.env.test` and the original `setup.ts`. The new dependencies stay (harmless if unused).

## Open Questions

- None blocking. Modules whose response shapes lack a `@glossops/shared` schema (notably the auth token-pair and DELETE-with-empty-body endpoints) are flagged per-suite in `tasks.md` and validated structurally; publishing those schemas is a follow-up tracked outside this change.
