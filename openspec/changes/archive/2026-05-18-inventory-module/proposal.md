# Proposal: Inventory Module

## Why

Shops were unable to track stock of consumable items and vinyl/PPF roll materials within GlossOps. Without inventory management, technicians had no visibility into available materials and stock levels were not automatically reduced when work orders were completed.

## What Changes

- Added `InventoryModule` with CRUD for `InventoryItem` (discrete/measurable stock) and `MaterialRoll` (vinyl/PPF/film rolls)
- Added `InventoryUsage` lifecycle: pre-creation on work order item add, technician adjustment, stock commit on WO completion, and deletion on WO cancellation
- Added schema migration to add `defaultInventoryId` and `defaultQuantity` fields to the `Service` model
- Added `WorkOrderUsagesController` nested under `WorkOrdersModule` for `PATCH /work-orders/:id/usages/:usageId`
- Integrated `InventoryService` into `WorkOrdersService` for usage lifecycle management
- Added path aliases `@inventory`, `@inventory/dto`, `@inventory/interfaces`
- Registered `InventoryModule` in `AppModule`

## Capabilities

- `inventory-module`: Full CRUD for inventory items and material rolls with automatic stock management on work order completion

## Impact

- `apps/api/src/inventory/` — new module (interfaces, infrastructure, dto, service, controllers, module, barrel)
- `apps/api/src/work-orders/` — integrated `InventoryService`, added `WorkOrderUsagesController`
- `packages/database/prisma/schema.prisma` — added `defaultInventoryId`, `defaultQuantity` to `Service`; added `services` back-relation to `Inventory`
- `apps/api/tsconfig.paths.json` — new path aliases
- `apps/api/package.json` — new jest moduleNameMapper entries
- `apps/api/src/app.module.ts` — registered `InventoryModule`
