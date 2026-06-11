## Context

A cross-module audit performed during the scoping of this change identified four modules with an identical bug pattern: a `prisma.X.delete(...)` call wrapped in `try { ... } catch { throw NotFoundException }`. The broad catch masks Postgres FK violations as 404s. The affected modules are:

| Module            | Service file:lines                                                                               | Hard-delete entry point                      |
| ----------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------- |
| `organizations`   | `organizations.service.ts:79-82`                                                                 | `DELETE /organizations/me?permanent=true`    |
| `customers`       | `customers.service.ts:119-122`                                                                   | `DELETE /customers/:id?permanent=true`       |
| `customer-assets` | `customer-assets.service.ts:175-178`                                                             | `DELETE /customer-assets/:id?permanent=true` |
| `services`        | `services.service.ts:82-83` (service-level), `prisma-service.repository.ts:138-148` (repo-level) | `DELETE /services/:id`                       |

The other 12 modules are clean: `auth` / `branches` / `activity-logs` have no hard-delete endpoint; `warranties` and `invoices` are themselves financial records (no delete by design); `inventory` looks like a swallowing catch but the agent's flag was a false positive — it pre-validates with `hasActiveUsages` and throws `ConflictException` explicitly; `suppliers`, `brands`, `work-orders`, `work-order-assignments`, `asset-checkpoints`, `purchase-orders` either have no children or validate before delete (DRAFT-only, etc.).

Two ways to close the bugs in the four affected modules:

- **A. Fix the pattern**: add Prisma cascade rules, replace each broad catch with a narrow P2003 catch, introduce a `countFinancialRecords` repository helper, return 409 with a specific error code when refused. Preserves API surface.
- **B. Remove the pattern**: delete the hard-delete code paths entirely. Soft-delete (`status=DELETED`, or `isActive=false` for services) is the only deletion semantics.

The user chose **B**. The rationale is product-driven, not technical:

- `Customer` and `CustomerAsset` are referenced by `Invoice` and `Warranty`, which carry legal weight (fiscal retention, warranty claims). Even with cascade rules, allowing the API to physically remove these references is risky for compliance. Soft-delete preserves the audit trail while satisfying every UI-level "hide this customer" requirement.
- `Service` already exposes explicit `POST /services/:id/activate` and `/deactivate`. The DELETE route is redundant — it does the same thing destructively. `WorkOrderItem` rows that reference deactivated services are exactly the kind of historical evidence the deactivate-vs-delete distinction was designed to preserve.
- `Organization`'s permanent-delete has no UI caller, no documented use case, and no e2e dependency (Testcontainers handles per-process cleanup). If a real "tenant decommissioning" requirement appears later (GDPR right-to-erasure, paid-tenant cancellation), it deserves a multi-step flow with retention windows and admin approval — not a query-param toggle.

## Goals / Non-Goals

**Goals:**

- The four affected services no longer call `prisma.X.delete(...)`.
- The `permanent` query parameter is removed from `organizations`, `customers`, and `customer-assets` DELETE endpoints.
- `DELETE /services/:id` is removed entirely; consumers migrate to `POST /services/:id/deactivate`.
- Each affected service's `remove*` method only soft-deletes (or, for services, no-ops in favor of deactivate).
- Each affected module's e2e suite asserts the soft-delete semantics and confirms `permanent=true` (if sent by an old client) has no destructive effect.
- The four service unit-test files drop the hard-delete tests; soft-delete tests are preserved.
- `pnpm --filter api test` and `test:e2e` pass; `./init.sh` is green.

**Non-Goals:**

- Adding Prisma cascade rules. The schema is untouched.
- Building a tenant-decommissioning or GDPR right-to-erasure flow. Those are future work with their own design.
- Adding a deprecation period or 410 Gone response. We delete the surface; no shim.
- Touching `apps/web`. No UI consumes these endpoints today.
- Renaming the existing DELETE soft-delete routes. They keep their shape: `DELETE /customers/:id` still soft-deletes, just without the `permanent` flag.
- Auditing `branches` and the modules currently classified as SOFT_ONLY for future hard-delete needs.

## Decisions

### D1: Remove, do not deprecate

For each of the four modules we delete the hard-delete code path rather than mark it deprecated and return 410 Gone. Reasons:

- `apps/web` does not call any of these endpoints. There is no client to migrate.
- The project is pre-production. Internal scripts that depend on `permanent=true` (if any) are easier to find by removing the surface than by silently warning.
- A deprecation shim adds maintenance cost for no real consumer.

If we later discover an internal script that relied on hard-delete, it's a one-line fix to use the soft-delete or the deactivate route.

### D2: `permanent` parameter handling

When `permanent=true` arrives on `DELETE /customers/:id`, `DELETE /customer-assets/:id`, or `DELETE /organizations/me` after this change:

- The controller signature drops the `permanent` query param.
- NestJS's `ValidationPipe({ whitelist: true })` strips unknown query keys silently — the request still reaches the controller with the validated subset, just without `permanent`.
- The service method's signature also drops the `permanent` argument.
- The soft-delete path runs as it always did.

**Alternative considered**: enable `forbidNonWhitelisted: true` so unknown query keys cause a 400. Rejected — it would be a behavior change beyond the scope of this feature, and it would surprise any consumer that includes other (harmless) query params. The silent-strip behavior is acceptable for a parameter that's being removed from the surface.

### D3: `DELETE /services/:id` removed, `/deactivate` is the replacement

Rather than aliasing DELETE to deactivate, we remove the DELETE route entirely. Reasons:

- The route is dangerous (hard-deletes a catalog entry that may have historical `WorkOrderItem` references).
- The deactivate endpoint already exists, is documented, and conveys the correct semantics (the service catalog entry persists; new work orders can't use it).
- Aliasing DELETE to deactivate creates confusion — "Why does DELETE not delete?" is a worse question than "Why does DELETE not exist?"

### D4: Repository `.delete(id, ...)` methods may stay or go, depending on use

For each module, search for callers of the repository's `.delete(...)` method beyond the service we're cleaning up. If nothing else calls it, remove the method from the interface and both `prisma-*.repository.ts` and `in-memory-*.repository.ts` implementations. If something else calls it (e.g., a test fixture), keep the method but ensure the only callers are internal.

The implementer is empowered to make this judgment per module during apply.

### D5: Spec deltas codify the new contract in 4 capabilities

Each affected module has its own capability spec under `openspec/specs/<capability>/spec.md`. The change publishes four spec deltas in `openspec/changes/hard-delete-audit-all-modules/specs/`:

- `organizations/spec.md` — ADDED: "Deletion is soft-delete only" requirement. REMOVED: any existing requirement that mentions `permanent=true` or hard-delete (use `**Reason**: Hard-delete capability removed for compliance — see hard-delete-audit-all-modules` and `**Migration**: Use the soft-delete path; see ...`).
- `customers-module/spec.md` — same shape.
- `customer-assets-module/spec.md` — same.
- `services-module/spec.md` — ADDED: "Service deletion is via deactivate, not DELETE" requirement. REMOVED: any requirement that mentions `DELETE /services/:id` as a delete operation.

If no existing requirement mentions hard-delete (i.e., the original spec was silent on the matter), the delta is ADDED-only — codifying soft-delete as the explicit contract going forward.

### D6: No Prisma migration

The schema is unchanged. Cascade rules don't matter because no code calls `prisma.X.delete()` on these entities anymore. Existing FK defaults (RESTRICT/NO ACTION) continue to prevent accidental deletes from any future caller — which is now the desired behavior.

### D7: E2E scenario replacement, not just deletion

Where an e2e suite previously asserted `permanent=true` did something (cascade success, or 404 lie), the new scenario:

- Sends the same DELETE request with `permanent=true` for backwards-compat coverage.
- Asserts the response is the same as DELETE without `permanent` (a successful soft-delete).
- Asserts the row is still in the database with `status=DELETED` (or `isActive=false`).
- Asserts that subsequent GET `/<entity>/:id` returns the entity in its soft-deleted state (or 404 depending on the existing semantics — keep what the module already does for soft-deleted reads).

This protects against accidental reintroduction of the hard-delete path.

## Risks / Trade-offs

- **[Risk]** An internal script or seed file relies on `permanent=true`. → **Mitigation:** grep `apps/api`, `scripts/`, `docs/`, and `progress/` for `permanent=true` references during apply. Any hit is fixed in the same change.
- **[Risk]** A future product requirement (GDPR, tenant cancellation) genuinely needs hard-delete. → **Mitigation:** when that requirement arrives, design a dedicated flow with retention windows, admin approval, and audit logs. The current code is not a useful starting point — it has a bug and no use case.
- **[Risk]** The `ValidationPipe`'s silent strip of `permanent` may hide client errors. → **Mitigation:** the e2e scenarios in D7 explicitly send `permanent=true` and assert no destructive effect, so any reintroduction of the hard-delete path is caught.
- **[Trade-off]** We're losing a capability rather than fixing it. For organizations, this means the hard-delete bug stays "fixed by removal" rather than "fixed by cascade". We accept that — the audit confirmed no caller depends on it.

## Migration Plan

1. Per module, edit the controller to drop the `permanent` query param (or the entire route, for services).
2. Per module, edit the service to drop the hard-delete branch and the broad try/catch.
3. Per module, search for callers of the repository `delete` method; if no external caller exists, remove it from the interface and both repository implementations.
4. Per module, drop hard-delete unit tests; expand soft-delete tests to cover the no-longer-permanent guarantee.
5. Per module, update the e2e suite: replace any hard-delete scenarios with soft-delete-with-permanent-flag scenarios per D7.
6. Per module, check `apps/api/src/<module>/dto/` for any `permanent` DTO fields; remove them.
7. Run verification gates: lint, unit tests, e2e tests, init.sh.
8. Sync each modified capability's main spec via `openspec archive` at close.

**Rollback**: revert the change. Soft-delete behavior was preserved end-to-end, so reverting brings back the buggy hard-delete; no data is at risk.

## Scope expansion (post-apply addendum, 2026-06-11)

The original Non-Goal "Touching `apps/web`. No UI consumes these endpoints today" turned out to be incorrect. During post-apply review, two frontend consumers were found: `useDeleteCustomer` in `apps/web/src/hooks/use-customers.ts` sent `?permanent=true` to `DELETE /customers/:id` (now silently stripped — behavior identical to `useArchiveCustomer`), and `useDeleteService` in `apps/web/src/hooks/use-services.ts` called `DELETE /services/:id` (route no longer exists).

The user authorized expanding the scope to eliminate this dead code in the same change. The follow-up cleanup pass:

- Deleted `useDeleteCustomer` and `useDeleteService` hooks entirely.
- Removed the "Eliminar" dropdown items + confirmation dialogs on `customers/page.tsx` (INACTIVE tab) and `services/page.tsx` (OWNER-only action).
- Replaced UX-lying "será eliminado permanentemente" wording with accurate archive language on the customer-asset detail and vehicle detail pages.
- Purged stale `?permanent=true` documentation in `docs/next-steps.md` and `docs/api/overview.md`.
- Verified `useDeleteCustomerAsset` does not exist (assets use `useDeleteAsset` which already sends plain DELETE — no flag to clean).

The expansion is captured in `tasks.md` Section 10 ("Frontend dead code cleanup") and reflected in this addendum so the design document remains an accurate record of what shipped.

## Open Questions

- None blocking. Whether to enable `forbidNonWhitelisted: true` at the validation pipe level is a separate concern (tracked implicitly via feat 35's Zod migration).
