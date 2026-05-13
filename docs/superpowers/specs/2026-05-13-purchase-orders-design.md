# Purchase Orders Module — Design Spec

**Status:** Approved  
**Date:** 2026-05-13  
**Branch:** feat/purchase-orders

---

## Goal

Expose CRUD over purchase orders scoped to the caller's branch, plus a batch-receive endpoint that increments inventory stock/length and updates unit costs automatically.

---

## Architecture

Repository pattern — two repositories, one service, one controller. `PurchaseOrdersModule` imports `InventoryModule` to call `InventoryService.applyReceive()` during the receive flow.

**Scope:** `PurchaseOrder` is branch-scoped (`branchId` from JWT). `Supplier` is org-scoped — validated by the service to belong to `account.organizationId`.

---

## File Structure

```
apps/api/src/purchase-orders/
  interfaces/
    purchase-order.repository.interface.ts      ← PurchaseOrderRepositoryInterface
    purchase-order-item.repository.interface.ts ← PurchaseOrderItemRepositoryInterface
    index.ts
  infrastructure/
    prisma-purchase-order.repository.ts
    prisma-purchase-order-item.repository.ts
    in-memory-purchase-order.repository.ts
    in-memory-purchase-order-item.repository.ts
  dto/
    create-purchase-order.dto.ts
    update-purchase-order.dto.ts
    list-purchase-orders.dto.ts
    receive-purchase-order.dto.ts
    index.ts
  purchase-orders.tokens.ts
  purchase-orders.service.ts
  purchase-orders.service.spec.ts
  purchase-orders.controller.ts
  purchase-orders.module.ts
  index.ts
```

**Inventory module changes:**

- `interfaces/inventory-item.repository.interface.ts` — add `incrementStock(id, qty, unitCost)`
- `interfaces/material-roll.repository.interface.ts` — add `incrementLength(id, qty, unitCost)`
- `infrastructure/prisma-inventory-item.repository.ts` — implement `incrementStock`
- `infrastructure/prisma-material-roll.repository.ts` — implement `incrementLength`
- `infrastructure/in-memory-inventory-item.repository.ts` — implement `incrementStock`
- `infrastructure/in-memory-material-roll.repository.ts` — implement `incrementLength`
- `inventory.service.ts` — add `applyReceive(inventoryId, quantity, unitCost)`

---

## Endpoints

| Method   | Path                           | Description                                                  | Roles          |
| -------- | ------------------------------ | ------------------------------------------------------------ | -------------- |
| `GET`    | `/purchase-orders`             | List (branch-scoped), filter by status/supplierId, paginated | ALL            |
| `POST`   | `/purchase-orders`             | Create order with items array                                | OWNER, MANAGER |
| `GET`    | `/purchase-orders/:id`         | Read single order with items                                 | ALL            |
| `PATCH`  | `/purchase-orders/:id`         | Update header (DRAFT only)                                   | OWNER, MANAGER |
| `DELETE` | `/purchase-orders/:id`         | Delete (DRAFT only)                                          | OWNER, MANAGER |
| `POST`   | `/purchase-orders/:id/receive` | Batch receive items                                          | OWNER, MANAGER |
| `POST`   | `/purchase-orders/:id/cancel`  | Cancel (DRAFT or PARTIALLY_RECEIVED)                         | OWNER, MANAGER |

---

## Status Machine

Only a subset of the existing `PurchaseOrderStatus` enum is used. No schema migration required.

```
DRAFT ──► PARTIALLY_RECEIVED ──► RECEIVED
  │               │
  └───────────────┴──► CANCELLED
```

**Valid transitions:**

- `DRAFT` → `PARTIALLY_RECEIVED` | `RECEIVED` | `CANCELLED`
- `PARTIALLY_RECEIVED` → `PARTIALLY_RECEIVED` | `RECEIVED` | `CANCELLED`
- `RECEIVED` — terminal, no transitions allowed
- `CANCELLED` — terminal, no transitions allowed

---

## Data Shapes

### `PurchaseOrderWithItems`

```typescript
interface PurchaseOrderWithItems {
  id: string
  branchId: string
  supplierId: string
  status: PurchaseOrderStatus
  expectedAt: Date | null
  receivedAt: Date | null
  note: string | null
  createdAt: Date
  updatedAt: Date
  items: PurchaseOrderItemRecord[]
}

interface PurchaseOrderItemRecord {
  id: string
  purchaseOrderId: string
  inventoryId: string
  quantity: Prisma.Decimal
  receivedQuantity: Prisma.Decimal
  unitCost: Prisma.Decimal
  note: string | null
  createdAt: Date
}
```

### DTOs

**`CreatePurchaseOrderDto`**

```typescript
{
  supplierId: string          // UUID, required
  expectedAt?: string         // ISO date, optional
  note?: string               // optional
  items: CreatePurchaseOrderItemDto[]  // min 1 item
}

// CreatePurchaseOrderItemDto
{
  inventoryId: string         // UUID, required
  quantity: number            // @Min(0.001)
  unitCost: number            // @Min(0)
  note?: string
}
```

**`UpdatePurchaseOrderDto`** (all optional, DRAFT only)

```typescript
{
  supplierId?: string
  expectedAt?: string | null
  note?: string | null
}
```

**`ListPurchaseOrdersDto`**

```typescript
{
  status?: PurchaseOrderStatus
  supplierId?: string
  page?: number               // default 1
  limit?: number              // default 20
}
```

**`ReceivePurchaseOrderDto`**

```typescript
{
  items: ReceiveItemDto[]     // min 1
}

// ReceiveItemDto
{
  itemId: string              // UUID — must belong to this PO
  receivedQuantity: number    // @Min(0.001)
}
```

---

## Receive Flow

`POST /purchase-orders/:id/receive` with `{ items: [{ itemId, receivedQuantity }] }`:

1. Validate PO exists for caller's `branchId` → 404 if not found
2. Validate status is `DRAFT` or `PARTIALLY_RECEIVED` → 409 if terminal
3. Validate all `itemId`s belong to this PO → 400 if any unknown
4. For each item: `newReceivedQty = current.receivedQuantity + receivedQuantity`
5. Calculate new status:
   - All items have `newReceivedQty >= quantity` → `RECEIVED`, set `receivedAt = now()`
   - Otherwise → `PARTIALLY_RECEIVED`
6. Persist PO status + item `receivedQuantity` updates in a single `$transaction`
7. For each received item: call `InventoryService.applyReceive(inventoryId, receivedQuantity, unitCost)`

**`InventoryService.applyReceive(inventoryId, quantity, unitCost)`:**

- Looks up inventory by `findByIdDirect` (branch scope not re-checked — trusted from PO context)
- If `ITEM`: calls `inventoryItemRepo.incrementStock(id, qty, unitCost)`
- If `ROLL`: calls `materialRollRepo.incrementLength(id, qty, unitCost)`

**Atomicity note:** The PO side (item quantities + status) runs in a `$transaction`. Inventory updates are sequential calls after the PO transaction commits — consistent with the deferred transaction pattern documented in `docs/decisions/deferred-transactions.md`.

---

## Repository Interfaces

### `PurchaseOrderRepositoryInterface`

```typescript
interface PurchaseOrderRepositoryInterface {
  create(data: CreatePurchaseOrderData): Promise<PurchaseOrderWithItems>
  findById(id: string, branchId: string): Promise<PurchaseOrderWithItems | null>
  findAll(
    branchId: string,
    query: PurchaseOrderQuery
  ): Promise<PurchaseOrderPage>
  update(
    id: string,
    branchId: string,
    data: UpdatePurchaseOrderData
  ): Promise<PurchaseOrderWithItems>
  delete(id: string, branchId: string): Promise<void>
  updateStatusAndItems(
    id: string,
    status: PurchaseOrderStatus,
    receivedAt: Date | null,
    items: ReceiveItemUpdate[]
  ): Promise<PurchaseOrderWithItems>
}
```

### `PurchaseOrderItemRepositoryInterface`

```typescript
interface PurchaseOrderItemRepositoryInterface {
  findAllByOrder(purchaseOrderId: string): Promise<PurchaseOrderItemRecord[]>
}
```

### `ReceiveItemUpdate` (used in `updateStatusAndItems`)

```typescript
interface ReceiveItemUpdate {
  itemId: string
  newReceivedQuantity: Prisma.Decimal
}
```

---

## Error Handling

| Condition                         | Code | Error key                        |
| --------------------------------- | ---- | -------------------------------- |
| PO not found for branchId         | 404  | `purchase_order_not_found`       |
| Edit/delete on non-DRAFT          | 409  | `purchase_order_not_editable`    |
| Receive on RECEIVED or CANCELLED  | 409  | `purchase_order_not_receivable`  |
| Cancel on RECEIVED or CANCELLED   | 409  | `purchase_order_not_cancellable` |
| Unknown itemId in receive payload | 400  | `purchase_order_item_not_found`  |

---

## Testing Strategy

`PurchaseOrdersService` spec uses `InMemoryPurchaseOrderRepository` and `InMemoryPurchaseOrderItemRepository`. `InventoryService` is a jest mock.

**Test cases:**

- `create` — creates order with items, returns `PurchaseOrderWithItems`
- `findOne` — 404 if not found
- `update` — updates header fields; 409 if not DRAFT
- `remove` — deletes; 409 if not DRAFT
- `receive` — partial receive → `PARTIALLY_RECEIVED`; full receive → `RECEIVED` + `receivedAt` set; calls `applyReceive` for each item; 409 if terminal
- `cancel` — sets `CANCELLED`; 409 if already terminal

---

## Module Wiring

```typescript
@Module({
  imports: [PrismaModule, InventoryModule],
  controllers: [PurchaseOrdersController],
  providers: [
    {
      provide: PURCHASE_ORDER_REPOSITORY,
      useClass: PrismaPurchaseOrderRepository,
    },
    {
      provide: PURCHASE_ORDER_ITEM_REPOSITORY,
      useClass: PrismaPurchaseOrderItemRepository,
    },
    PurchaseOrdersService,
  ],
})
export class PurchaseOrdersModule {}
```

`AppModule` adds `PurchaseOrdersModule` to imports after `InventoryModule`.

Path aliases added to `tsconfig.paths.json` and Jest `moduleNameMapper`:

- `@purchase-orders`
- `@purchase-orders/dto`
- `@purchase-orders/interfaces`
