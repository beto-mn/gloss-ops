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

### Requirement: Delete follows soft/hard pattern with Owner-only hard delete

`DELETE /customer-assets/:id` SHALL soft-delete by default. `?permanent=true` performs a hard delete and MUST be restricted to the `OWNER` role.

#### Scenario: Manager soft-deletes an asset

- **WHEN** a `MANAGER` calls `DELETE /customer-assets/:id` without `?permanent=true`
- **THEN** the asset's status becomes `DELETED` and the response is 204

#### Scenario: Manager attempts permanent delete

- **WHEN** a `MANAGER` calls `DELETE /customer-assets/:id?permanent=true`
- **THEN** the response is 403 `forbidden`
