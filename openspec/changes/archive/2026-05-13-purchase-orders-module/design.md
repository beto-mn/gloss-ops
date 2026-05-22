# Design: Purchase Orders Module

## Context

GlossOps shops need to track incoming inventory from suppliers. The `PurchaseOrder` entity is branch-scoped (using `branchId` from the JWT), while `Supplier` is org-scoped and validated to belong to `account.organizationId`. The `Inventory` table already existed; this module adds procurement flow on top of it. `PurchaseOrdersModule` imports `InventoryModule` to call `InventoryService.applyReceive()` during the receive flow.

## Goals

- Expose CRUD over purchase orders scoped to the caller's branch
- Add a batch-receive endpoint that increments inventory stock/length and updates unit costs
- Add a cancel endpoint supporting DRAFT and PARTIALLY_RECEIVED orders
- Extend `InventoryModule` with `incrementStock`, `incrementLength`, and `applyReceive`

## Non-Goals

- Purchase order approval workflow
- Email notifications to suppliers
- PDF generation for purchase orders
- Activity logging for purchase order events (deferred)

## Decisions

**Two separate repositories (`PurchaseOrderRepositoryInterface` + `PurchaseOrderItemRepositoryInterface`) over a single one:** Items are embedded in the order response via `include` in Prisma but have their own interface for the `findAllByOrder` query, keeping concerns clean.

**`InventoryModule` extended rather than duplicated:** `applyReceive` is added to `InventoryService` so stock increment logic lives in one place. The receive endpoint delegates to it after the PO transaction commits.

**Deferred transaction pattern for inventory updates:** The PO side (item quantities + status) runs in a `$transaction`. Inventory updates are sequential calls after the PO transaction commits — consistent with the project's deferred transaction pattern documented in `docs/decisions/deferred-transactions.md`.

## Risks / Trade-offs

**Sequential inventory updates after PO commit:** If an inventory update fails after the PO is already committed, the PO will show RECEIVED but stock will not be updated. This is acceptable given the deferred transaction pattern decision for the current client base size.

**No over-receive guard:** Received quantities can exceed ordered quantities — this is intentional to allow for supplier over-shipment without blocking the workflow.
