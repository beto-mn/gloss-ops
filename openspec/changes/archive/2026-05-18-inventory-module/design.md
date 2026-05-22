# Design: Inventory Module

## Context

GlossOps shops manage two types of inventory: discrete/measurable items (`InventoryItem`) and rolls of vinyl/PPF/film (`MaterialRoll`). Both share a common `Inventory` base table via class table inheritance (1-to-1 FK on `id`). `InventoryUsage` links directly to `WorkOrder` (not to `WorkOrderItem`) and tracks material consumption at the order level. The schema already contained all models; this module exposes them as a first-class NestJS module and integrates stock management into the work order lifecycle.

## Goals

- CRUD for `InventoryItem` and `MaterialRoll`, branch-scoped via JWT
- `InventoryUsage` lifecycle: pre-create on item add, tech adjustment via PATCH, stock commit on WO completion, delete on WO cancellation
- Low-stock filtering and warning system
- Schema migration to add `defaultInventoryId` and `defaultQuantity` to `Service`

## Non-Goals

- `PurchaseOrder` and `PurchaseOrderItem` (handled in the purchase-orders module)
- Push notifications for low stock alerts
- `ActivityLog` entries for inventory events
- Invoicing and billing

## Decisions

**Four repository interfaces (Inventory, InventoryItem, MaterialRoll, InventoryUsage) plus a ServiceDefaults repository:** The `ServiceDefaults` repository isolates the read of `service.defaultInventoryId` and `service.defaultQuantity` from the Service module, avoiding a circular dependency.

**`decrementStock` / `decrementLength` accept a transaction client:** These methods are called inside `commitUsages` which runs in a `$transaction`, so the repository methods must accept the Prisma transaction client. In-memory implementations ignore this parameter.

**`WorkOrderUsagesController` lives in `WorkOrdersModule`:** The `PATCH /work-orders/:id/usages/:usageId` endpoint is scoped to work orders, so it fits naturally in `WorkOrdersModule` rather than `InventoryModule`. `WorkOrdersModule` imports `InventoryModule` to access `InventoryService`.

**Three controllers for `/inventory`:** `InventoryController` (GET list + GET usages), `InventoryItemsController` (POST/PATCH/DELETE items), `MaterialRollsController` (POST/PATCH/DELETE rolls) — separates read from write concerns and keeps route handlers focused.

## Risks / Trade-offs

**`commitUsages` runs in a `$transaction` for decrement but inventory updates after PO receive are sequential:** Consistent with the deferred transaction pattern — stock decrements on completion are transactional (all-or-nothing), but receive-flow increments are sequential to avoid nested transactions.

**Warning system for low stock does not block the transition:** The work order completes even if stock goes negative. This was chosen to avoid blocking technicians; the shop owner can review warnings in the response.
