# Proposal: Purchase Orders Module

## Why

Shops needed a way to track incoming inventory from suppliers — manually recording received stock without a formal purchase order process caused discrepancies between expected and actual inventory levels. This module brings structured procurement flow into GlossOps.

## What Changes

- Added `PurchaseOrdersModule` with full CRUD over purchase orders scoped to the caller's branch
- Added batch-receive endpoint that increments inventory stock/length and updates unit costs automatically
- Added cancel endpoint supporting DRAFT and PARTIALLY_RECEIVED orders
- Extended `InventoryModule` with `incrementStock`, `incrementLength`, and `applyReceive` methods used by the receive flow
- Added path aliases `@purchase-orders`, `@purchase-orders/dto`, `@purchase-orders/interfaces`
- Registered `PurchaseOrdersModule` in `AppModule` after `InventoryModule`

## Capabilities

- `purchase-orders-module`: CRUD + batch-receive + cancel for purchase orders, with automatic inventory stock updates on receive

## Impact

- `apps/api/src/purchase-orders/` — new module (interfaces, infrastructure, dto, service, controller, module, barrel)
- `apps/api/src/inventory/` — extended with `incrementStock`, `incrementLength`, `applyReceive`
- `apps/api/tsconfig.paths.json` — new path aliases
- `apps/api/package.json` — new jest moduleNameMapper entries
- `apps/api/src/app.module.ts` — registered `PurchaseOrdersModule`
