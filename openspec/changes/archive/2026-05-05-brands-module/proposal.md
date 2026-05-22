# Proposal: Brands Module

## Why

Automotive shops needed a managed catalog of brands (vinyl manufacturers, PPF producers, vehicle makes, etc.) so that inventory items and customer assets could reference a brand from a controlled source rather than free-text fields.

## What Changes

- Added a `BrandsModule` with full CRUD at `/brands`
- Implemented two-tier brand catalog: global seeded brands (system-wide, read-only) and org-specific brands (created by each organization)
- Read endpoints return both tiers merged; write endpoints only operate on org-specific brands
- Seeded brands are protected from mutation via `isSeeded` guard returning 403
- Hard delete blocked when brand has `CustomerAsset` or `Inventory` references
- TS path aliases and Jest mapper entries added for `@brands`, `@brands/dto`, `@brands/interfaces`
- `BrandsService` exported so `InventoryModule` can inject it for brand-existence validation

## Capabilities

- `brands-module`: CRUD catalog for managing brands with global seeded tier and org-specific tier, enforcing slug uniqueness, FK protection on delete, and RBAC per endpoint

## Impact

- `apps/api/src/brands/` — new module (brands.module.ts, brands.tokens.ts, brands.controller.ts, brands.service.ts, index.ts, dto/, interfaces/, infrastructure/)
- `apps/api/tsconfig.paths.json` — added `@brands`, `@brands/dto`, `@brands/interfaces`
- `apps/api/package.json` — added jest moduleNameMapper entries
- `apps/api/src/app.module.ts` — registered `BrandsModule`
