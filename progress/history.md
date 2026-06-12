# Session History

## 2026-06-11 — shared_schemas_align_with_api

**Status:** done
**Spec:** `openspec/changes/archive/2026-06-11-shared-schemas-align-with-api/`
**Agent:** leader + implementer + reviewer

### Summary

- Closed every drift point between `@glossops/shared` Zod schemas and the actual `apps/api` response payloads, without touching `apps/api/src/` (per D1 "API is the source of truth").
- New shared schemas published: `auth.ts` (`AuthTokensSchema`), `pagination.ts` (TWO factories — `createPageSchema` for the meta-shape used by most modules, `createFlatPageSchema` for the flat shape used by Invoice/ActivityLog; emergent from D1 — real API uses both), `inventory-usage.ts`, `work-order-assignment.ts`.
- Existing schemas corrected in-place: `asset-checkpoint` (`photo` → `z.array(z.string())`), `work-order` (dropped non-existent `folio`), `customer` (`activeWorkOrderCount` only on list variant), `inventory` (replaced discriminated union with real `{ items, materialRolls }` payload), `invoice` (added `folio`/`taxRate`/`taxAmount` + `z.coerce.number()` on Decimal fields), `purchase-order` (added `items` array with `unitCost`/`quantity` matching Prisma), `organization` (added `OrganizationWithRole` + `MemberWithAccount` + `InvitationCreated`), `activity-log` (page wrapper).
- Decimal contract codified (D2): every Prisma `Decimal` uses `z.coerce.number()` — accepts string or number on the wire, hands `number` to TypeScript. D7 runtime asserts (`typeof === 'number'` after parse) added in invoices/purchase-orders/inventory e2e.
- Migrated 12 e2e suites to `parseWith(<published schema>)`. Zero `// no shared schema yet` comments remain, zero local `interface ...Response` declarations remain (D6 grep gates green).
- Verification re-run by reviewer: `pnpm --filter shared build` PASS; `api lint` 0 errors; `web lint` 0 errors; `api test` 54/601; `api test:e2e` 17/94; `web typecheck` no new errors (3 pre-existing in `api-client.test.ts` from `93ad18a` baseline); `./init.sh` green.
- New capability requirements added to `openspec/specs/shared-schemas/spec.md`: Decimal coercion, generic page schema factory, schema variants per endpoint shape, no-source-of-truth-drift rule. Main spec also restructured with `## Purpose` + `## Requirements` headers (was using delta-only format leftover from `packages_shared` archive — fixed during this archive).
- Decisions surfaced and accepted under D1: schema must follow actual API output, not the planned design — hence two pagination factories instead of one, `CustomerCreateResponseSchema` as alias of `CustomerSchema`, `WorkOrderAssignmentResponseSchema` mirroring the nested `WorkOrderAssignmentSchema` because the controller emits both flat + nested fields on every record.
- Follow-ups surfaced (not blocking): `apps/web/src/lib/api-client.test.ts` TS18046 baseline noise (catch-clause `unknown`); optional publish of list helpers `InventoryUsageListSchema`/etc. if more suites need them.

## 2026-06-11 — testing_integration_api

**Status:** done
**Spec:** `openspec/changes/archive/2026-06-11-testing-integration-api/`
**Agent:** leader + implementer + reviewer

### Summary

- Testcontainers harness (`@testcontainers/postgresql` + `@testcontainers/redis`) replaces `.env.test`. `global-setup.ts` boots both containers, runs `prisma migrate deploy`, exports `DATABASE_URL` / `REDIS_URL` / `JWT_ACCESS_SECRET`; `global-teardown.ts` stops them.
- `.env.test` and `test/setup.ts` deleted; `jest-e2e.json` switched to new lifecycle + 60s timeout + moduleNameMapper for `@<module>` aliases.
- Three helpers added under `apps/api/test/helpers/`: `createTestApp()` boots the real `AppModule` with `main.ts` global pipes; `seedTenant(http)` registers a fresh Account+Org+Branch+OWNER via `/auth/register`; `parseWith(schema)` Zod-validates 2xx responses with readable error messages.
- 16 integration suites cover every domain module (auth, organizations, branches, customers, customer-assets, suppliers, brands, services, work-orders, work-order-assignments, asset-checkpoints, activity-logs, inventory, purchase-orders, warranties, invoices) plus the rewritten `app.e2e-spec.ts`. Every 2xx response either runs through `parseWith` or has an inline shape assertion with a `// no shared schema yet` comment naming the gap.
- Verification (re-run by reviewer): `pnpm --filter api test:e2e` → 17 suites / 94 tests / 12.3 s; `pnpm --filter api test` → 54 suites / 601 tests unchanged; `./init.sh` → green.
- New capability `api-integration-testing` (8 requirements) synced into `openspec/specs/`. Change archived as `2026-06-11-testing-integration-api`.
- Two follow-ups filed in `feature_list.json` (out of this change's scope):
  - feat 33 `shared_schemas_align_with_api` — fix drift between `@glossops/shared` Zod schemas and actual API payloads (AssetCheckpoint.photo, WorkOrder.folio, Customer.activeWorkOrderCount, InvoiceSchema fiscal fields, etc.) and publish missing schemas (AuthTokens, OrganizationWithRole, MemberWithAccount, InvitationCreated, ActivityLogPage, InventoryUsage).
  - feat 34 `organizations_hard_delete_fix` — fix FK Branch→Organization cascade and stop swallowing FK errors as 404 in `OrganizationsService.removeOrganization`; re-add the dropped hard-delete scenario.

## 2026-06-09 — testing_unit_frontend

**Status:** done  
**Spec:** `openspec/changes/archive/2026-06-09-testing-unit-frontend/`

### Summary

- Vitest `unit` project (happy-dom) added to `apps/web/vitest.config.ts`
- `test` script added to `apps/web/package.json`
- 20 unit test files created: 11 hooks, 7 schemas, `api-client`, `utils` — 79 tests passing
- `api-client.test.ts` covers 401+refresh, 401+no-refresh, refresh failure, network error paths
- `service-drawer.stories.tsx` and `work-order-edit-drawer.stories.tsx` created with 4 story variants each
- Existing stories (customer-drawer, vehicle-drawer, login-form, register-form) upgraded with ValidationError/ServerError variants
- 51 Storybook play() tests passing in Chromium (headless)
- Fixes: `@storybook/test` import, `viteFinal` for `@glossops/shared` ESM, `findBy` async queries, `form.novalidate` for browser HTML5 constraint bypass

## <!-- Sessions are appended here when closed. Format:

## YYYY-MM-DD — <feature-name>

**Agent:** <leader|implementer|reviewer>
**Summary:** <one-line summary>
**Result:** done | blocked | in_progress
-->

## 2026-06-08 — packages_shared

**Agent:** leader + implementer + reviewer
**Summary:** Created `packages/shared` entity Zod schemas (14 entities), consolidated all domain enums, wired `@glossops/shared` in both apps, migrated inline `z.enum([...])` in `apps/web` to shared imports.
**Result:** done
