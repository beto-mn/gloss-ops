## 1. Audit references to `permanent` and hard-delete paths

- [x] 1.1 Grep `apps/api/src/` for `permanent` to confirm the only consumers are in `organizations`, `customers`, `customer-assets` (controllers + DTOs + services). Report any unexpected hit
- [x] 1.2 Grep `apps/api/src/` for `prisma.X.delete` (not `deleteMany`, not `delete` in `Map`/`Set`) to confirm hard-delete call sites match the audit. Report any new finding
- [x] 1.3 Grep `apps/web/src/` and `scripts/` for `permanent=true` to confirm zero frontend callers
- [x] 1.4 Grep `@glossops/shared` for any DTO field named `permanent`; flag and plan removal

## 2. Organizations module (remove permanent path)

- [x] 2.1 Edit `apps/api/src/organizations/organizations.controller.ts`: remove the `permanent` query parameter from the `DELETE /organizations/me` handler
- [x] 2.2 Edit `apps/api/src/organizations/organizations.service.ts`: drop the `permanent` parameter from `removeOrganization`; remove the `if (permanent) { try { ... } catch { throw NotFoundException } }` block entirely; keep only the soft-delete path (`findById` + `softDelete`)
- [x] 2.3 Edit `apps/api/src/organizations/dto/`: remove `permanent` field from any DTO if present
- [x] 2.4 Edit `apps/api/src/organizations/interfaces/organization.repository.interface.ts`: remove the `delete(id)` method declaration if the hard-delete path was its only consumer
- [x] 2.5 Edit `apps/api/src/organizations/infrastructure/prisma-organization.repository.ts` and `in-memory-organization.repository.ts`: remove the `delete(id)` implementation if 2.4 removed the interface method
- [x] 2.6 Edit `apps/api/src/organizations/organizations.service.spec.ts`: drop hard-delete unit tests; keep soft-delete tests; expand soft-delete test to verify `permanent` arg is no longer accepted (or removed at the type level)

## 3. Customers module (remove permanent path)

- [x] 3.1 Edit `apps/api/src/customers/customers.controller.ts`: remove the `permanent` query parameter from the `DELETE /customers/:id` handler
- [x] 3.2 Edit `apps/api/src/customers/customers.service.ts`: drop the `permanent` parameter from `removeCustomer`; remove the swallowing try/catch block (lines 119-122); keep only soft-delete
- [x] 3.3 Edit `apps/api/src/customers/dto/`: remove `permanent` from any DTO if present
- [x] 3.4 Inspect `apps/api/src/customers/interfaces/customer.repository.interface.ts` and both repository implementations: remove the `delete(id, organizationId)` method if hard-delete was its only consumer
- [x] 3.5 Edit `apps/api/src/customers/customers.service.spec.ts`: drop hard-delete tests; keep soft-delete tests

## 4. Customer-assets module (remove permanent path)

- [x] 4.1 Edit `apps/api/src/customer-assets/customer-assets.controller.ts`: remove the `permanent` query parameter from the `DELETE /customer-assets/:id` handler
- [x] 4.2 Edit `apps/api/src/customer-assets/customer-assets.service.ts`: drop the `permanent` parameter from `removeCustomerAsset`; remove the swallowing try/catch (lines 175-178); keep only soft-delete
- [x] 4.3 Edit `apps/api/src/customer-assets/dto/`: remove `permanent` from any DTO if present
- [x] 4.4 Inspect `apps/api/src/customer-assets/interfaces/` and both repos: remove `delete(id, organizationId)` if hard-delete was its only consumer
- [x] 4.5 Edit `apps/api/src/customer-assets/customer-assets.service.spec.ts`: drop hard-delete tests; keep soft-delete tests
- [x] 4.6 Remove the previously required "OWNER-only hard delete" guard if it lives in a separate decorator/guard — there is no hard delete to gate

## 5. Services module (remove DELETE entirely)

- [x] 5.1 Edit `apps/api/src/services/services.controller.ts`: remove the `DELETE /services/:id` route handler entirely
- [x] 5.2 Edit `apps/api/src/services/services.service.ts`: remove the `removeService` (or equivalent) method; preserve `activate`/`deactivate` methods unchanged
- [x] 5.3 Inspect `apps/api/src/services/interfaces/` and both repos: remove the `delete(id, organizationId)` method (including the FK-aware try/catch at `prisma-service.repository.ts:138-148`) if the only caller was the controller
- [x] 5.4 Edit `apps/api/src/services/services.service.spec.ts`: drop delete-related unit tests; keep activate/deactivate tests
- [x] 5.5 Remove the previously required `service_has_references` 409 + OWNER-only DELETE RBAC test (the route no longer exists)

## 6. E2E suite updates

- [x] 6.1 `apps/api/test/organizations.e2e-spec.ts`: remove or repurpose any scenario that sent `permanent=true`. Add (or keep) a soft-delete-with-permanent-flag scenario asserting the flag is silently ignored and the org ends in `status=DELETED`
- [x] 6.2 `apps/api/test/customers.e2e-spec.ts`: same shape — remove hard-delete-asserting scenarios; add a permanent-flag-no-op scenario
- [x] 6.3 `apps/api/test/customer-assets.e2e-spec.ts`: same
- [x] 6.4 `apps/api/test/services.e2e-spec.ts`: remove any `DELETE /services/:id` scenarios; add a scenario asserting the route returns `404`
- [x] 6.5 Update `seedTenant` or any test helper if it relied on hard-delete during teardown (unlikely; `globalTeardown` destroys the Postgres container)

## 7. Cross-cutting checks

- [x] 7.1 `grep -rn "permanent" apps/api/src/` → zero references to a `permanent` parameter in controllers, services, or DTOs (matches to the word `permanent` in comments/docs are acceptable)
- [x] 7.2 `grep -rn "prisma\.\(organization\|customer\|customerAsset\|service\)\.delete\b" apps/api/src/` → zero matches in the four affected modules
- [x] 7.3 `grep -rn "try\s*{[^}]*delete[^}]*}\s*catch[^{]*{\s*throw\s\+new\s\+NotFoundException" apps/api/src/` → zero matches anywhere (and confirm none exist that we missed)
- [x] 7.4 `apps/web` / `scripts/` / `docs/` grep for `permanent=true` → zero matches (or document each)

## 8. Verification gates

- [x] 8.1 `pnpm --filter api lint` → 0 errors, 0 warnings
- [x] 8.2 `pnpm --filter api test` → 601 tests (or current count minus the dropped hard-delete tests) all green
- [x] 8.3 `pnpm --filter api test:e2e` → 94+ tests (some renamed) all green
- [x] 8.4 `pnpm --filter web lint` → 0 errors
- [x] 8.5 `./init.sh` → green

## 9. Session close

- [ ] 9.1 Update `progress/current.md` with the final summary
- [ ] 9.2 Move the summary to `progress/history.md` and reset `current.md` to the template
- [ ] 9.3 Mark feat 34 `done` in `feature_list.json`

## 10. Frontend dead code cleanup (scope expansion)

The proposal's original non-goal "Touching apps/web. No UI consumes these endpoints today" turned out to be stale: `apps/web` does call the hard-delete endpoints. This section eliminates the dead client-side code surfaced by the API removal.

- [x] 10.1 Delete `useDeleteCustomer` from `apps/web/src/hooks/use-customers.ts` (it is semantically identical to `useArchiveCustomer` after the API change; the `?permanent=true` query param is silently stripped server-side)
- [x] 10.2 Delete `useDeleteService` from `apps/web/src/hooks/use-services.ts` (the `DELETE /services/:id` route no longer exists; consumers use `useDeactivateService`)
- [x] 10.3 Update `apps/web/src/app/(dashboard)/customers/page.tsx`: drop the "Eliminar" action on the INACTIVE tab (it was a UX lie — the row is already inactive; soft-delete is a no-op). Keep "Desactivar" on the ACTIVE tab and "Reactivar" on the INACTIVE tab. Remove the now-unused delete confirmation dialog, `deleteTarget` state, `confirmDelete` handler, and `useDeleteCustomer` import. Drop the unused `Trash2` icon import if no longer referenced
- [x] 10.4 Update `apps/web/src/app/(dashboard)/services/page.tsx`: drop the "Eliminar" action and its confirmation dialog (only OWNER could trigger it, and the route is gone). Keep activate/deactivate. Remove `useDeleteService` import, `deleteTarget` and `deleteError` state, `handleDelete`, the OWNER `canDelete` check, the `Trash2` icon import, and the delete dialog
- [x] 10.5 Grep `apps/web/src/` for `permanent=true` → zero matches
- [x] 10.6 Grep `apps/web/src/` for `useDeleteCustomer|useDeleteService` → zero matches
- [x] 10.7 `pnpm --filter web lint` → 0 errors
- [x] 10.8 `pnpm --filter web test` → green (counts may drop if any tests referenced the removed hooks; in practice none did)
- [x] 10.9 `pnpm --filter web exec tsc --noEmit` → no new errors beyond the 3 pre-existing in `api-client.test.ts`
