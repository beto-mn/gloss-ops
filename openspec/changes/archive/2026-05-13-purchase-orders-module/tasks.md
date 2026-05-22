# Tasks: Purchase Orders Module

## 1. Path Aliases

- [x] 1.1 Add `@purchase-orders` path aliases to `tsconfig.paths.json`
- [x] 1.2 Add jest `moduleNameMapper` entries to `package.json`
- [x] 1.3 Verify no tests broke

## 2. Extend Inventory Module

- [x] 2.1 Write failing tests for `applyReceive` in `inventory.service.spec.ts`
- [x] 2.2 Add `incrementStock` to `InventoryItemRepositoryInterface`
- [x] 2.3 Add `incrementLength` to `MaterialRollRepositoryInterface`
- [x] 2.4 Implement `incrementStock` in `InMemoryInventoryItemRepository`
- [x] 2.5 Implement `incrementLength` in `InMemoryMaterialRollRepository`
- [x] 2.6 Implement `incrementStock` in `PrismaInventoryItemRepository`
- [x] 2.7 Implement `incrementLength` in `PrismaMaterialRollRepository`
- [x] 2.8 Add `applyReceive` to `InventoryService`
- [x] 2.9 Run full test suite

## 3. DI Tokens + Repository Interfaces

- [x] 3.1 Create `purchase-orders.tokens.ts`
- [x] 3.2 Create `purchase-order.repository.interface.ts`
- [x] 3.3 Create `purchase-order-item.repository.interface.ts`
- [x] 3.4 Create `interfaces/index.ts`

## 4. DTOs

- [x] 4.1 Create `create-purchase-order.dto.ts`
- [x] 4.2 Create `update-purchase-order.dto.ts`
- [x] 4.3 Create `list-purchase-orders.dto.ts`
- [x] 4.4 Create `receive-purchase-order.dto.ts`
- [x] 4.5 Create `dto/index.ts`

## 5. In-Memory Repositories

- [x] 5.1 Create `in-memory-purchase-order.repository.ts`
- [x] 5.2 Create `in-memory-purchase-order-item.repository.ts`

## 6. PurchaseOrdersService — TDD

- [x] 6.1 Write the full test suite in `purchase-orders.service.spec.ts`
- [x] 6.2 Implement `purchase-orders.service.ts`
- [x] 6.3 Run all tests and verify they pass

## 7. Prisma Repositories

- [x] 7.1 Create `prisma-purchase-order.repository.ts`
- [x] 7.2 Create `prisma-purchase-order-item.repository.ts`

## 8. Controller, Module Wiring, and AppModule

- [x] 8.1 Create `purchase-orders.controller.ts`
- [x] 8.2 Create `purchase-orders.module.ts`
- [x] 8.3 Create `index.ts` barrel
- [x] 8.4 Add `PurchaseOrdersModule` to `app.module.ts`
- [x] 8.5 Run full test suite
