# Proposal: Customer Assets Module

## Why

Work orders require a reference to a physical asset (vehicle, boat, etc.), but no API existed to register or manage customer assets. Without this module, the work-orders module could not be built, blocking the entire downstream workflow.

## What Changes

- Added `AssetType` enum (`VEHICLE | MOTORCYCLE | BOAT | JET_SKI | TRUCK | OTHER`) to the Prisma schema
- Migrated `customer_asset.asset_type` from a free `String` to the new enum
- Added `customAssetType`, `country`, `status`, and `deletedAt` columns to `CustomerAsset`
- Created the full `customer-assets/` module with the standard repository pattern
- Added 5 endpoints across two controllers: `POST/GET /customers/:customerId/assets` (nested) and `GET/PATCH/DELETE /customer-assets/:id` (flat)
- Enforced 5 cross-cutting validations: customer-in-org, brand-in-org, `OTHER`/`customAssetType` pairing, `(country, identifier)` uniqueness, and status filtering
- Soft delete by default; Owner-only hard delete via `?permanent=true`
- Added TS path aliases `@customer-assets`, `@customer-assets/dto`, `@customer-assets/interfaces`
- Registered `CustomerAssetsModule` in `AppModule`

## Capabilities

- `customer-assets-module`: Full CRUD for customer assets with closed enum asset types, country-scoped identifier uniqueness, multi-tenant brand validation, and soft/hard delete

## Impact

- `packages/database/prisma/schema.prisma`
- `packages/database/prisma/migrations/`
- `apps/api/tsconfig.paths.json`
- `apps/api/package.json` (jest moduleNameMapper)
- `apps/api/src/app.module.ts`
- `apps/api/src/customer-assets/` (all files — new module)
