# Session History

## 2026-06-11 — hard_delete_audit_all_modules

**Status:** done
**Spec:** `openspec/changes/archive/2026-06-11-hard-delete-audit-all-modules/`
**Agent:** leader + Explore + implementer + reviewer + implementer (cleanup pass)

### Summary

- Original feat 34 was scoped to "fix Organization hard-delete bug" (cascade + 409 + narrow catch). User asked the deeper question — "do these hard-deletes need to exist?" — which reframed the change.
- Cross-module audit (Explore subagent) confirmed 4 modules with the same LIKE_ORG_BUG pattern (`organizations`, `customers`, `customer-assets`, `services`). The other 12 modules classified CASCADE_SAFE, SOFT_ONLY, or FINANCIAL.
- User picked "remove the 4 hard-deletes" over "fix them". Rationale: Customer/CustomerAsset are referenced by Invoice/Warranty with legal retention requirements; Service already exposes activate/deactivate (DELETE is redundant); Organization permanent-delete has no UI caller and no documented use case.
- Feat 34 renamed `organizations_hard_delete_fix` → `hard_delete_audit_all_modules`. Old feat 36 (cross-module audit follow-up) subsumed and deleted. Openspec folder renamed accordingly.
- All 4 artifacts rewritten for removal scope: `permanent` query param removed from organizations/customers/customer-assets; `DELETE /services/:id` route removed entirely; broad swallowing try/catch blocks deleted; repo `.delete()` methods removed where they had no other callers. No Prisma migration needed (schema untouched).
- 4 spec deltas published (`organizations`, `customers-module`, `customer-assets-module`, `services-module`) — `ADDED` "deletion is soft-delete only" requirements; `REMOVED` "Delete follows soft/hard pattern" and "FK protection on service deletion"; `MODIFIED` services RBAC scenario to drop the OWNER-only hard-delete gate.
- E2E gained 3 new "permanent=true silently ignored" scenarios + 1 "DELETE /services returns 404" scenario; lost ~17 hard-delete unit tests.
- Post-apply scope expansion: reviewer flagged `useDeleteCustomer` in `apps/web/src/hooks/use-customers.ts` (sent `?permanent=true`) and `useDeleteService` (called the removed route). User authorized cleanup pass — deleted both hooks, removed their UI callers (dropdown items + AlertDialogs on `customers/page.tsx` INACTIVE tab and `services/page.tsx`), fixed UX-lying "será eliminado permanentemente" wording on 2 customer-asset pages, purged stale `?permanent=true` docs in `docs/next-steps.md` and `docs/api/overview.md`. Addendum added to `design.md`.
- Verification (re-run by reviewer + cleanup pass): `pnpm --filter api lint` 0/0; `pnpm --filter web lint` 0/0; `pnpm --filter api test` 54 suites / 579 tests; `pnpm --filter api test:e2e` 17 suites / 97 tests; `pnpm --filter web test` 20 files / 79 tests; `pnpm --filter web typecheck` no new errors (3 baselines pre-existing); `./init.sh` green.
- 2 surviving `permanent` references in `work-orders/page.tsx` are out of scope — they refer to legitimate DRAFT-only hard-delete paths classified as CASCADE_SAFE by the audit.
- Follow-up surfaced: consider `forbidNonWhitelisted: true` on the global validation pipe so future stray query params surface as 400 (tracked implicitly via feat 35 Zod migration).

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

## 2026-07-04 — shared_request_schemas_zod_migration (feat 35)

**Agent:** leader + implementer (×6) + reviewer
**Summary:** Migrated API request validation from class-validator to Zod via nestjs-zod. Published pure-Zod request schemas for all 16 modules in `@glossops/shared/request-schemas` (single source of truth); collapsed 49 DTOs to one-line `createZodDto` wrappers; global bare `ZodValidationPipe` + `ZodValidationExceptionFilter` + `cleanupOpenApiDoc`; web forms consume shared schemas via composition; removed class-validator/class-transformer. Reconciled web invoice form to the CFDI-based `CreateInvoiceSchema` (dropped dead manual-totals UX). Reviewer APPROVE WITH NOTES (0 CRITICAL/MAJOR); closed M1 (datetime date-only rejection tests).
**Result:** done (archived 2026-07-04-shared-request-schemas-zod-migration; API 70/692 unit, 17/97 e2e, web 81; init.sh exit 0)
**Notes:** zod bumped ^3.24.2→^3.25.76 in api+shared. `pnpm install` needs `--registry=https://registry.npmjs.org/` (CodeArtifact token expired). Pre-existing unrelated: `/work-orders/new` next-build suspense error; 3 api-client.test.ts tsc `unknown` errors.
