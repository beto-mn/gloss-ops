# Spec: inventory-module

## Purpose

Defines the requirements for the `inventory-module` capability in GlossOps.

## Requirements

### Requirement: Inventory Item CRUD

Inventory items SHALL be created, updated, and deleted scoped to the caller's branch. Delete MUST be blocked if the item has usages in non-terminal work orders.

#### Scenario: Create inventory item

- **WHEN** a user with OWNER or MANAGER role submits a valid `CreateInventoryItemDto`
- **THEN** an `InventoryItem` record is created with `type = ITEM`, scoped to the caller's `branchId`

#### Scenario: Delete blocked with active usages

- **WHEN** a user attempts to delete an inventory item that has `InventoryUsage` records linked to active (non-COMPLETED, non-CANCELLED) work orders
- **THEN** the request is rejected with HTTP 409 and error key `inventory_in_use`

### Requirement: Material Roll CRUD

Material rolls SHALL be created, updated, and deleted with the same scoping and deletion guard as inventory items.

#### Scenario: Create material roll

- **WHEN** a user with OWNER or MANAGER role submits a valid `CreateMaterialRollDto`
- **THEN** a `MaterialRoll` record is created with `type = ROLL`, scoped to the caller's `branchId`

### Requirement: Low Stock Filtering

The list endpoint MUST support a `lowStock` filter that returns only items where `stock <= lowStockAlert` for `ITEM` type inventory.

#### Scenario: Filter by low stock

- **WHEN** `GET /inventory?lowStock=true` is called
- **THEN** only items with `stock <= lowStockAlert` are returned

### Requirement: Inventory Usage Pre-Creation

When a `WorkOrderItem` is added, `InventoryService.maybeCreateUsage` SHALL be called. If the service has a `defaultInventoryId`, an `InventoryUsage` MUST be created with `costAtUsage` snapshot from the current `unitCost`.

#### Scenario: Usage created on work order item add

- **WHEN** a work order item is added and the linked service has a `defaultInventoryId`
- **THEN** an `InventoryUsage` is created with `inventoryId`, `quantityUsed = defaultQuantity ?? 1`, and `costAtUsage = inventory.unitCost`

#### Scenario: No usage created when service has no default inventory

- **WHEN** a work order item is added and the linked service has no `defaultInventoryId`
- **THEN** no `InventoryUsage` is created

### Requirement: Stock Commit on Work Order Completion

When a work order transitions to `COMPLETED`, `InventoryService.commitUsages` MUST decrement stock (ITEM) or remaining length (ROLL) for each usage in a single transaction. Warnings SHALL be returned for items with negative stock or stock at/below the low-stock alert threshold.

#### Scenario: Stock decremented on WO completion

- **WHEN** a work order transitions to `COMPLETED`
- **THEN** each linked `InventoryUsage` results in stock or remaining length being decremented by `quantityUsed`

#### Scenario: Warning returned for low stock post-commit

- **WHEN** stock drops to or below `lowStockAlert` after commit
- **THEN** a warning is included in the response but the transition still completes

### Requirement: Usage Cleanup on Cancellation

When a work order transitions to `CANCELLED`, `InventoryService.deleteUsagesByWorkOrder` SHALL remove all usages without touching stock.

#### Scenario: Usages deleted on WO cancellation

- **WHEN** a work order transitions to `CANCELLED`
- **THEN** all `InventoryUsage` records for that work order are deleted and stock is unchanged
