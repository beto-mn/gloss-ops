## REMOVED Requirements

### Requirement: Delete follows soft/hard pattern with Owner-only hard delete

**Reason**: Hard-delete capability removed. Customer assets are referenced by work orders, warranties, and invoices — all of which carry legal weight (fiscal retention, warranty claims). Soft-delete preserves the audit trail while satisfying every UI-level "hide this asset" requirement.

**Migration**: Callers MUST use `DELETE /customer-assets/:id` without the `permanent` flag. The endpoint always soft-deletes (`status=DELETED`). For physical deletion needs (e.g., GDPR), file a new feature with a dedicated, audited workflow — not a query-param toggle.

## ADDED Requirements

### Requirement: Customer asset deletion is soft-delete only

`DELETE /customer-assets/:id` SHALL only soft-delete the asset (`status=DELETED`). The `permanent` query parameter — if present in a request — has no effect and is silently stripped by the validation pipe. Customer assets are referenced by `WorkOrder`, `Warranty`, and (transitively) `Invoice` rows; allowing permanent deletion would break warranty and fiscal audit trails.

The `removeCustomerAsset` service method SHALL NOT call `prisma.customerAsset.delete(...)`.

#### Scenario: Soft-delete returns 204 and marks the asset

- **WHEN** an `OWNER` or `MANAGER` calls `DELETE /customer-assets/:id` against an existing active asset
- **THEN** the asset's `status` is set to `DELETED` and the response is `204`

#### Scenario: `permanent=true` is silently ignored

- **WHEN** an authorized caller calls `DELETE /customer-assets/:id?permanent=true`
- **THEN** the response is identical to the request without the flag — the asset is soft-deleted, NOT hard-deleted, and no related work orders, warranties, or invoices are removed

#### Scenario: Manager-level role is sufficient for soft-delete

- **WHEN** a `MANAGER` calls `DELETE /customer-assets/:id` (with or without `permanent=true`)
- **THEN** the request succeeds (soft-delete). The previous "OWNER-only hard delete" gating no longer applies because there is no hard delete.

#### Scenario: Genuine not-found returns 404

- **WHEN** `DELETE /customer-assets/:id` is invoked with an id that does not exist in the caller's org
- **THEN** the response is `404 Not Found` with `{ error: 'customer_asset_not_found' }`

#### Scenario: removeCustomerAsset never calls prisma.customerAsset.delete

- **WHEN** the service-layer code is inspected
- **THEN** no code path in `CustomerAssetsService.removeCustomerAsset` calls `prisma.customerAsset.delete(...)` — only the soft-delete repository method is used
