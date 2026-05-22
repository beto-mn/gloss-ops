# Tasks: Inventory Module

## 1. Schema Migration

- [x] 1.1 Add `defaultInventoryId` and `defaultQuantity` fields to `Service` model in `schema.prisma`
- [x] 1.2 Add `services` back-relation to `Inventory` model
- [x] 1.3 Run migration `add_service_default_inventory`

## 2. Path Aliases

- [x] 2.1 Add `@inventory` entries to `tsconfig.paths.json`
- [x] 2.2 Add `@inventory` entries to jest `moduleNameMapper` in `package.json`

## 3. DI Tokens + Repository Interfaces

- [x] 3.1 Create `inventory.tokens.ts` with 5 DI tokens
- [x] 3.2 Create `inventory.repository.interface.ts`
- [x] 3.3 Create `inventory-item.repository.interface.ts`
- [x] 3.4 Create `material-roll.repository.interface.ts`
- [x] 3.5 Create `inventory-usage.repository.interface.ts`
- [x] 3.6 Create `service-defaults.repository.interface.ts`
- [x] 3.7 Create `interfaces/index.ts`

## 4. DTOs

- [x] 4.1 Create `create-inventory-item.dto.ts`
- [x] 4.2 Create `update-inventory-item.dto.ts`
- [x] 4.3 Create `create-material-roll.dto.ts`
- [x] 4.4 Create `update-material-roll.dto.ts`
- [x] 4.5 Create `list-inventory.dto.ts`
- [x] 4.6 Create `update-inventory-usage.dto.ts`
- [x] 4.7 Create `dto/index.ts`

## 5. In-Memory Repositories

- [x] 5.1 Create `in-memory-inventory.repository.ts`
- [x] 5.2 Create `in-memory-inventory-item.repository.ts`
- [x] 5.3 Create `in-memory-material-roll.repository.ts`
- [x] 5.4 Create `in-memory-inventory-usage.repository.ts`
- [x] 5.5 Create `in-memory-service-defaults.repository.ts`

## 6. InventoryService — TDD

- [x] 6.1 Write the failing spec covering items, rolls, and inventory usage lifecycle
- [x] 6.2 Implement `inventory.service.ts`
- [x] 6.3 Run the spec and verify all tests pass

## 7. Prisma Repositories

- [x] 7.1 Create `prisma-inventory.repository.ts`
- [x] 7.2 Create `prisma-inventory-item.repository.ts`
- [x] 7.3 Create `prisma-material-roll.repository.ts`
- [x] 7.4 Create `prisma-inventory-usage.repository.ts`
- [x] 7.5 Create `prisma-service-defaults.repository.ts`

## 8. Controllers + Specs

- [x] 8.1 Create `inventory.controller.ts` (GET /inventory, GET /inventory/:id/usages)
- [x] 8.2 Create `inventory.controller.spec.ts`
- [x] 8.3 Create `inventory-items.controller.ts` (POST/PATCH/DELETE items)
- [x] 8.4 Create `inventory-items.controller.spec.ts`
- [x] 8.5 Create `material-rolls.controller.ts` (POST/PATCH/DELETE rolls)
- [x] 8.6 Create `material-rolls.controller.spec.ts`
- [x] 8.7 Run all controller specs

## 9. Inventory Module Wiring + AppModule

- [x] 9.1 Create `inventory.module.ts`
- [x] 9.2 Create `inventory/index.ts` barrel
- [x] 9.3 Add `InventoryModule` to `app.module.ts`

## 10. WorkOrders Integration

- [x] 10.1 Add inventory integration tests to `work-orders.service.spec.ts`
- [x] 10.2 Update `work-orders.service.ts` to inject `InventoryService` and call usage lifecycle methods
- [x] 10.3 Create `work-order-usages.controller.ts`
- [x] 10.4 Create `work-order-usages.controller.spec.ts`
- [x] 10.5 Update `work-orders.module.ts` to import `InventoryModule` and register `WorkOrderUsagesController`
