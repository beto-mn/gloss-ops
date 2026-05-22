# Proposal: Asset Checkpoints Module

## Why

Shops needed to formally record vehicle condition at two key moments — reception (when the vehicle arrives) and delivery (when it is returned to the customer) — including mileage, fuel level, general condition, photos, and an optional customer signature. Without this, shops had no structured way to document pre- and post-service vehicle state for dispute resolution.

## What Changes

- Added `AssetCheckpointsModule` with CRUD for asset checkpoints nested under work orders
- Added status-based creation guards: blocked on CANCELLED orders, RECEPTION blocked on COMPLETED orders, and duplicate type prevention per work order
- Added `WorkOrdersModule` export of `WorkOrdersService` so `AssetCheckpointsModule` can validate ownership
- Added path aliases `@asset-checkpoints`, `@asset-checkpoints/dto`, `@asset-checkpoints/interfaces`
- Registered `AssetCheckpointsModule` in `AppModule`

## Capabilities

- `asset-checkpoints-module`: CRUD for vehicle reception and delivery checkpoints scoped to a work order, with status-based creation guards

## Impact

- `apps/api/src/asset-checkpoints/` — new module (interfaces, infrastructure, dto, service, controller, module, barrel)
- `apps/api/src/work-orders/work-orders.module.ts` — added `exports: [WorkOrdersService]`
- `apps/api/tsconfig.paths.json` — new path aliases
- `apps/api/package.json` — new jest moduleNameMapper entries
- `apps/api/src/app.module.ts` — registered `AssetCheckpointsModule`
