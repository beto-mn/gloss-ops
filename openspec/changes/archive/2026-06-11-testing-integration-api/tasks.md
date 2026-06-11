## 1. Dependencies and config

- [x] 1.1 Add `testcontainers`, `@testcontainers/postgresql`, `@testcontainers/redis` to `apps/api/devDependencies` via `pnpm --filter api add -D ...`
- [x] 1.2 Update `apps/api/test/jest-e2e.json`: replace `"globalSetup": "./setup.ts"` with `"globalSetup": "./global-setup.ts"` and add `"globalTeardown": "./global-teardown.ts"`
- [x] 1.3 Delete `apps/api/.env.test`
- [x] 1.4 Delete `apps/api/test/setup.ts`

## 2. Container lifecycle (globalSetup / globalTeardown)

- [x] 2.1 Create `apps/api/test/global-setup.ts` that starts a `PostgreSqlContainer` and a `RedisContainer`, runs `prisma migrate deploy` against the Postgres URL, sets `process.env.DATABASE_URL`, `process.env.REDIS_URL`, `process.env.JWT_ACCESS_SECRET` (random UUID), and stashes the container handles on `(globalThis as any).__GLOSSOPS_TC__` for teardown access
- [x] 2.2 Create `apps/api/test/global-teardown.ts` that reads the stashed handles and calls `.stop()` on both containers
- [x] 2.3 Add a clear Docker-unavailable error message in `global-setup.ts`: catch Docker connection errors and throw `Error('Docker is required to run e2e tests — please start Docker Desktop or your Docker daemon')`

## 3. Test helpers

- [x] 3.1 Create `apps/api/test/helpers/test-app.ts` exporting `createTestApp()` that compiles `AppModule`, applies the global `ValidationPipe`, exception filter, and any interceptors from `main.ts`, calls `app.init()`, and returns `{ app, http }` where `http = supertest(app.getHttpServer())`
- [x] 3.2 Create `apps/api/test/helpers/seed-tenant.ts` exporting `seedTenant(http)` that POSTs `/auth/register` with randomized credentials (random email + strong password + random org name) and returns `{ accessToken, refreshToken, accountId, organizationId, branchId, userId }`
- [x] 3.3 Create `apps/api/test/helpers/zod-response.ts` exporting `parseWith(schema)` — returns a function `(response: Response) => z.infer<typeof schema>` that asserts `response.status` is 2xx and runs `schema.parse(response.body)`; on `ZodError` it formats the issues into a readable message and throws
- [x] 3.4 Create `apps/api/test/helpers/index.ts` barrel exporting the three helpers (sorted longest → shortest per project conventions)

## 4. Rewrite existing suites in the new format

- [x] 4.1 Rewrite `apps/api/test/app.e2e-spec.ts` using `createTestApp()` (no env-var imports, no `.env.test` reads); keep the smoke assertion on `/` if it exists today
- [x] 4.2 Rewrite `apps/api/test/auth.e2e-spec.ts` using `createTestApp()` + `seedTenant()`; cover register (creates Account + Org + Branch + OWNER), login, refresh (rotation), and logout (revocation); validate any response that has a `@glossops/shared` schema via `parseWith`

## 5. Integration suites — tenancy & catalog

- [x] 5.1 Create `apps/api/test/organizations.e2e-spec.ts` — list, detail, update, invitation flow with explicit `branchId`, soft delete (status), hard delete (`permanent=true`); validate detail/list with `OrganizationSchema`
- [x] 5.2 Create `apps/api/test/branches.e2e-spec.ts` — CRUD; peer-branches semantics (no `isMain`); validate with `BranchSchema`
- [x] 5.3 Create `apps/api/test/customers.e2e-spec.ts` — CRUD, status filter, soft delete; validate with `CustomerSchema` / `CustomerListItemSchema`
- [x] 5.4 Create `apps/api/test/customer-assets.e2e-spec.ts` — nested POST under customer, flat GET/PATCH/DELETE; validate with `CustomerAssetSchema`
- [x] 5.5 Create `apps/api/test/suppliers.e2e-spec.ts` — CRUD; validate with `SupplierSchema`
- [x] 5.6 Create `apps/api/test/brands.e2e-spec.ts` — CRUD; assert seeded brands cannot be deleted; validate with `BrandSchema`
- [x] 5.7 Create `apps/api/test/services.e2e-spec.ts` — CRUD plus `POST /services/:id/activate` and `/deactivate`; validate with `ServiceSchema`

## 6. Integration suites — work orders & operations

- [x] 6.1 Create `apps/api/test/work-orders.e2e-spec.ts` — CRUD, status transitions via `PATCH /work-orders/:id/status`, completion auto-generates warranties when items have `warrantyDays > 0`; validate with `WorkOrderSchema`
- [x] 6.2 Create `apps/api/test/work-order-assignments.e2e-spec.ts` — assign LEAD/ASSISTANT technician, unassign; assert authorization rules
- [x] 6.3 Create `apps/api/test/asset-checkpoints.e2e-spec.ts` — CRUD under work order; validate with `AssetCheckpointSchema`
- [x] 6.4 Create `apps/api/test/activity-logs.e2e-spec.ts` — list endpoint pagination; validate with `ActivityLogSchema`

## 7. Integration suites — inventory, purchasing & billing

- [x] 7.1 Create `apps/api/test/inventory.e2e-spec.ts` — `GET /inventory` listing of items + rolls; `GET /inventory/:id/usages`; validate with `InventoryItemSchema` (or whichever shapes `@glossops/shared/inventory` exports)
- [x] 7.2 Create `apps/api/test/purchase-orders.e2e-spec.ts` — CRUD, `POST /purchase-orders/:id/receive`, `POST /purchase-orders/:id/cancel`; validate with `PurchaseOrderSchema`
- [x] 7.3 Create `apps/api/test/warranties.e2e-spec.ts` — list, detail; validate with `WarrantySchema`
- [x] 7.4 Create `apps/api/test/invoices.e2e-spec.ts` — CRUD and any status flows the controller exposes; validate with `InvoiceSchema`

## 8. Cross-cutting checks

- [x] 8.1 Confirm there are NO references to `.env.test` or `dotenv` remaining anywhere under `apps/api/test/` or `apps/api/src/` (grep check)
- [x] 8.2 Confirm every 2xx response in every new suite either runs through `parseWith(schema)` or has an inline `expect.objectContaining(...)` shape assertion plus a `// no shared schema yet` comment naming the gap
- [x] 8.3 Confirm container handles are properly stopped on teardown — no zombie containers after a successful run (manual `docker ps` check)

## 9. Verification

- [x] 9.1 Run `pnpm --filter api test:e2e` from a clean state (no Postgres/Redis on localhost) — all 16 suites pass
- [x] 9.2 Run `pnpm --filter api test:e2e` twice in a row — both runs pass with the same outcome
- [x] 9.3 Run `./init.sh` — full harness still green (unit tests + SDD completeness + e2e)
- [x] 9.4 Update `progress/current.md` with the final summary, then move it to `progress/history.md` and clear `current.md`
