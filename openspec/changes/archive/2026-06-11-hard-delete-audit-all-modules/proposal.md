## Why

`testing-integration-api` surfaced that `OrganizationsService.removeOrganization(orgId, permanent=true)` masks Postgres FK errors as `404 Not Found`. A cross-module audit (read-only Explore subagent) confirmed the same pattern in three more modules: `customers`, `customer-assets`, and `services`. All four wrap `prisma.X.delete(...)` in a broad `try { ... } catch { throw NotFoundException }`. None of them declare `onDelete: Cascade` on their non-financial children.

Two ways to close the issue:

1. **Fix the pattern**: add cascade rules in Prisma, replace each broad catch with a narrow `P2003` catch, add a `countFinancialRecords` repository helper, return `409 Conflict` when refused. Preserves the existing API surface.
2. **Remove the pattern**: delete the hard-delete code paths entirely. Soft-delete (`status=DELETED` for entities; `isActive=false` for services) becomes the single deletion semantics.

After examining the actual product context, every one of the four endpoints is either dangerous, redundant, or unused:

- **`DELETE /customers/:id?permanent=true`** — customer records are referenced by invoices, which most fiscal jurisdictions require to be retained for 5+ years. Hard-deleting a customer with surviving invoices breaks audit trail.
- **`DELETE /customer-assets/:id?permanent=true`** — assets are referenced by work orders, warranties, and invoices. Same retention concern.
- **`DELETE /services/:id`** — the services module already exposes explicit `POST /services/:id/activate` and `/deactivate`. The DELETE route is redundant and dangerous (hard-deletes a service catalog entry that may be referenced by historical `WorkOrderItem` rows).
- **`DELETE /organizations/me?permanent=true`** — no UI caller. `apps/web` does not expose this. The e2e suites don't need it because Testcontainers destroys the Postgres container at `globalTeardown`. Any real "tenant decommissioning" use case (GDPR right-to-erasure, cancelled tenant cleanup) deserves a dedicated, audited flow — not a query-param toggle.

This change picks option 2 — **remove the hard-delete capability** — and standardizes on soft-delete as the only deletion mechanism. The bug surface disappears with the code paths.

## What Changes

- **`permanent` query parameter is removed** from `DELETE` endpoints in `organizations`, `customers`, and `customer-assets`. The controllers no longer accept the flag. The corresponding service methods (`removeOrganization`, `removeCustomer`, `removeCustomerAsset`) drop the hard-delete branch entirely — they only soft-delete (set `status=DELETED`).
- **`DELETE /services/:id` is removed entirely**. Consumers wanting to retire a service catalog entry use the existing `POST /services/:id/deactivate`. The controller route, the service method, and the corresponding repository `delete` method (if not used elsewhere) are removed.
- **Repository `.delete(id, organizationId)` methods** in the 4 affected modules are inspected: kept only if still used by another internal caller (e.g., by test fixtures); otherwise removed.
- **DTOs and query schemas** that contain `permanent: boolean` (e.g., `DeleteCustomerDto`, `DeleteCustomerAssetDto`, or query DTOs) are simplified to remove the field. If `permanent=true` arrives in a request, the existing `ValidationPipe({ whitelist: true })` strips it silently; assertions in e2e confirm it has no effect.
- **The four `*.service.ts` files** drop the broad `try { delete } catch { throw NotFoundException }` blocks. The remaining soft-delete path uses `findById` + `softDelete` and throws `NotFoundException` only when `findById` returns null.
- **The four e2e suites** lose any "permanent=true" scenarios that may still reference the parameter. New assertions confirm DELETE still soft-deletes and that the API treats a `permanent` query flag as a no-op (or rejected if `forbidNonWhitelisted` is enabled).
- **The four service unit-test files** lose the hard-delete tests; the soft-delete tests are preserved and possibly expanded to cover the "no longer permanent" guarantee.
- **No Prisma migration** is required. The schema is unchanged. Cascade rules don't matter because no code calls `prisma.X.delete()` for these entities anymore.
- **No changes to `apps/web`**. The frontend doesn't expose any of these flows today; nothing breaks.

## Capabilities

### New Capabilities

<!-- None. -->

### Modified Capabilities

- `organizations`: codify soft-delete as the only deletion semantics; remove or replace any existing requirement that mentions `permanent=true` or hard-delete.
- `customers-module`: same — soft-delete only.
- `customer-assets-module`: same — soft-delete only.
- `services-module`: `DELETE /services/:id` does not exist; deletion semantics live in `POST /services/:id/deactivate`.

## Impact

- **`apps/api/src/organizations/`**: controller + service + DTO trimmed. Repository `delete` method removed if unused.
- **`apps/api/src/customers/`**: same shape of changes.
- **`apps/api/src/customer-assets/`**: same.
- **`apps/api/src/services/`**: `DELETE` controller route removed; service method removed; repository `delete` method removed if unused; the existing `activate`/`deactivate` endpoints are untouched.
- **`apps/api/src/<module>/<module>.service.spec.ts`** (4 files): drop hard-delete tests; keep soft-delete tests.
- **`apps/api/test/<module>.e2e-spec.ts`** (4 files): drop or repurpose any scenarios that exercised `permanent=true` or `DELETE /services/:id` against a hard-delete expectation.
- **`packages/database/prisma/schema.prisma`**: unchanged.
- **No migration** generated.
- **`@glossops/shared`**: any request DTO that exposes a `permanent` flag is updated to drop the field (likely none today, but the proposal owns the check).
- **`apps/web`**: unchanged.
- **Verification gates**: `pnpm --filter api test` still passes (601 tests); `pnpm --filter api test:e2e` still passes (94 tests, some scenarios renamed); `pnpm --filter api lint` clean; `./init.sh` green.
- **Future flows out of scope**: GDPR right-to-erasure, tenant-decommission workflows, scheduled-purge jobs. If any of these become real product requirements, they get their own design and their own change.
