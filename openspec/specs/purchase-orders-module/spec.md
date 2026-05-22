# Spec: purchase-orders-module

## Purpose

Defines the requirements for the `purchase-orders-module` capability in GlossOps.

## Requirements

### Requirement: Purchase Order Creation

A purchase order SHALL be created in DRAFT status, scoped to the caller's branch, with at least one item specifying inventory, quantity, and unit cost.

#### Scenario: Create purchase order with items

- **WHEN** a user with OWNER or MANAGER role submits a valid `CreatePurchaseOrderDto`
- **THEN** a purchase order is persisted with status `DRAFT`, `branchId` from the JWT, and the provided items

### Requirement: Status Machine Enforcement

A purchase order MUST only transition through valid status paths: DRAFT → PARTIALLY_RECEIVED | RECEIVED | CANCELLED, and PARTIALLY_RECEIVED → RECEIVED | CANCELLED. RECEIVED and CANCELLED are terminal states.

#### Scenario: Reject edit on non-DRAFT order

- **WHEN** a user attempts to update or delete a purchase order that is not in DRAFT status
- **THEN** the request is rejected with HTTP 409 and error key `purchase_order_not_editable`

#### Scenario: Reject receive on terminal order

- **WHEN** a user attempts to receive items on a RECEIVED or CANCELLED purchase order
- **THEN** the request is rejected with HTTP 409 and error key `purchase_order_not_receivable`

### Requirement: Batch Receive Flow

The receive endpoint MUST validate all item IDs belong to the order, accumulate received quantities, determine new status, and call `InventoryService.applyReceive` for each received item.

#### Scenario: Partial receive updates status to PARTIALLY_RECEIVED

- **WHEN** a receive request does not fully satisfy all item quantities
- **THEN** the order status is updated to `PARTIALLY_RECEIVED` and `receivedAt` remains null

#### Scenario: Full receive updates status to RECEIVED

- **WHEN** a receive request causes all item quantities to be met or exceeded
- **THEN** the order status is updated to `RECEIVED` and `receivedAt` is set to the current timestamp

#### Scenario: Unknown item ID in receive payload

- **WHEN** a receive payload contains an `itemId` that does not belong to the current order
- **THEN** the request is rejected with HTTP 400 and error key `purchase_order_item_not_found`

### Requirement: Inventory Auto-Update on Receive

`InventoryService.applyReceive` SHALL be called for each item in the receive payload after the PO transaction commits, incrementing stock for ITEM type and remaining length for ROLL type and updating the unit cost.

#### Scenario: applyReceive increments stock for ITEM

- **WHEN** `applyReceive` is called with an inventory ID of type ITEM
- **THEN** `stock` is incremented by the received quantity and `unitCost` is updated

#### Scenario: applyReceive increments remainingLength for ROLL

- **WHEN** `applyReceive` is called with an inventory ID of type ROLL
- **THEN** `remainingLength` is incremented by the received quantity and `unitCost` is updated

### Requirement: Cancel Flow

A purchase order MUST be cancellable from DRAFT or PARTIALLY_RECEIVED status. RECEIVED and CANCELLED orders cannot be cancelled.

#### Scenario: Cancel DRAFT order

- **WHEN** a user cancels a DRAFT order
- **THEN** the order status is set to `CANCELLED`

#### Scenario: Reject cancel on terminal order

- **WHEN** a user attempts to cancel a RECEIVED or CANCELLED order
- **THEN** the request is rejected with HTTP 409 and error key `purchase_order_not_cancellable`

### Requirement: Branch Scoping

All purchase order queries MUST be scoped to the caller's `branchId` from the JWT. A request for an order belonging to another branch SHALL return 404.

#### Scenario: Cross-branch access denied

- **WHEN** a user requests a purchase order that belongs to a different branch
- **THEN** the response is HTTP 404 with error key `purchase_order_not_found`
