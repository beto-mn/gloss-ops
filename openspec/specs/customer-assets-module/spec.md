# Spec: Customer Assets Module

## Purpose

Defines the requirements for the `customer-assets-module` capability in GlossOps.

## Requirements

### Requirement: assetType enum with OTHER escape hatch

`assetType` SHALL be one of the closed enum values `VEHICLE | MOTORCYCLE | BOAT | JET_SKI | TRUCK | OTHER`. When `assetType === OTHER`, the `customAssetType` field MUST be provided. When `assetType !== OTHER`, `customAssetType` MUST NOT be provided.

#### Scenario: Create with OTHER requires customAssetType

- **WHEN** `POST /customers/:customerId/assets` is called with `assetType: "OTHER"` and no `customAssetType`
- **THEN** the response is 422 `custom_asset_type_required`

#### Scenario: Create with non-OTHER rejects customAssetType

- **WHEN** `POST /customers/:customerId/assets` is called with `assetType: "VEHICLE"` and a `customAssetType` value
- **THEN** the response is 422 `custom_asset_type_not_allowed`

### Requirement: Country-scoped identifier uniqueness

When both `country` and `identifier` are provided, the pair `(organizationId, country, identifier)` MUST be unique among ACTIVE assets in the organization. A DELETED asset SHALL NOT block reuse of the same pair.

#### Scenario: Duplicate identifier in same country

- **WHEN** an asset with `country: "MX"` and `identifier: "ABC-123"` already exists and a new asset is created with the same values
- **THEN** the response is 409 `identifier_already_exists`

#### Scenario: Same identifier in different country is allowed

- **WHEN** an asset with `country: "MX"` and `identifier: "ABC-123"` exists and a new asset is created with `country: "US"` and `identifier: "ABC-123"`
- **THEN** the asset is created successfully with 201

### Requirement: Brand validation is multi-tenant safe

When `brandId` is provided, the brand MUST either have `organizationId IS NULL` (system-seeded) or belong to the caller's organization. A brand belonging to another organization MUST return 404.

#### Scenario: System-seeded brand is accepted

- **WHEN** `brandId` references a brand with `organizationId IS NULL`
- **THEN** the asset is created with that brand

#### Scenario: Foreign org brand is rejected

- **WHEN** `brandId` references a brand belonging to a different organization
- **THEN** the response is 404 `brand_not_found`

### Requirement: Customer must exist and be active in the org

Every create and list-by-customer operation SHALL verify that the target customer exists and is ACTIVE in the caller's organization. A missing, DELETED, or foreign customer MUST return 404.

#### Scenario: Create asset for non-existent customer

- **WHEN** `POST /customers/:customerId/assets` is called with a `customerId` that does not exist in the org
- **THEN** the response is 404 `customer_not_found`

### Requirement: Update validates merged state

`PATCH /customer-assets/:id` SHALL re-run all validations against the merged state (current row values overridden by the patch). A partial update MUST NOT leave the row in an invalid combination.

#### Scenario: Patch switches assetType to OTHER without customAssetType

- **WHEN** `PATCH /customer-assets/:id` sets `assetType: "OTHER"` but omits `customAssetType` and the current row has no `customAssetType`
- **THEN** the response is 422 `custom_asset_type_required`

### Requirement: Vehicle table rows are navigable

In the customer detail page (`/customers/[id]`), each vehicle row in the assets table SHALL be clickable and navigate to `/customers/[id]/vehicles/[asset.id]`. The row SHALL display a pointer cursor on hover.

#### Scenario: Click on vehicle row navigates to detail

- **WHEN** the user clicks anywhere on a vehicle table row (excluding the actions dropdown trigger)
- **THEN** the browser navigates to `/customers/[id]/vehicles/[asset.id]`

#### Scenario: Click on dropdown does not navigate

- **WHEN** the user clicks the `MoreHorizontal` dropdown trigger in a vehicle row
- **THEN** the dropdown opens and navigation does NOT occur

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
