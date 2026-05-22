# Design: Customer Assets Module

## Context

The `customer_asset` table existed in the schema but had no service, repository, or API layer. It was a prerequisite for the work-orders module, which requires a `customer_asset.id` reference. The table also had `asset_type` as a free `String`, making reporting unreliable, and had no soft-delete support, no `country` field, and no uniqueness constraints. Two real-world constraints shaped the design: a multi-tenant brand catalog (system-seeded brands are shared; org-private brands must not be visible cross-tenant) and cross-country plate collisions (Mexican and US plates can share characters but represent different vehicles).

## Goals

- `AssetType` closed enum with `OTHER` escape hatch for reporting reliability while absorbing rare asset types
- `(organizationId, country, identifier)` uniqueness enforced at the application layer, ACTIVE records only
- Brand validation allows system-seeded (`organizationId IS NULL`) and same-org brands; rejects foreign brands
- Split URL shape: create/list nested under the customer (`/customers/:customerId/assets`); read/update/delete flat (`/customer-assets/:id`)
- Soft delete by default; Owner-only hard delete via `?permanent=true` (mirrors customers module)
- `update` validates against merged state so a partial patch cannot leave a row in an invalid combination

## Non-Goals

- Per-`assetType` validation of `metadata` fields
- A restore endpoint for soft-deleted assets
- Org-wide asset search (not nested under a customer)
- A `brands` CRUD module — validation uses the existing `brand` table directly
- File uploads (photos) — deferred to the `asset_checkpoint` module
- A 30-day cleanup cron for soft-deleted assets

## Decisions

- **Two controllers, one service** — the URL shapes (`/customers/:customerId/assets` vs `/customer-assets/:id`) are semantically different; splitting into two controllers avoids awkward routing while sharing all business logic in a single service.
- **Tenant-validation helpers inside the repository** (`customerExistsInOrg`, `findBrandForOrg`) — keeps cross-module DI out of the equation at the cost of one extra query per validation; chosen over importing `CustomersService` or `BrandsService` to avoid circular dependency risk.
- **`findById` uses a relation filter on `customer.organizationId`** — enforces tenant scoping in a single round trip without requiring a separate customer lookup in every read path.
- **`OTHER` + `customAssetType` strict pairing** — both directions are validated (OTHER requires customAssetType; non-OTHER rejects it) rather than silently nulling the field, producing clearer error messages for callers.

## Risks / Trade-offs

- The `assertAssetTypeShape` logic must operate on merged state in `update` (current row + patch) — if a caller omits `assetType` while changing other fields, the current row's `assetType` is used for validation. This is correct but requires the service to always load the current row before updating.
- Identifier uniqueness is checked at the application layer, not the database, so concurrent creates with the same `(country, identifier)` can race past the check. Acceptable for MVP given the low concurrency of shop operations; a unique index can be added later without breaking the interface.
