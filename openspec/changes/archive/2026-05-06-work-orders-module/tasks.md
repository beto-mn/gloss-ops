# Tasks: Work Orders Module

## 1. DI Tokens, Repository Interfaces, and Shared Types

- [x] 1.1 Create `work-orders.tokens.ts` with `WORK_ORDER_REPOSITORY`, `WORK_ORDER_ITEM_REPOSITORY`, `WORK_ORDER_ASSIGNMENT_REPOSITORY`, and `ASSET_CHECKPOINT_REPOSITORY` symbols
- [x] 1.2 Create `interfaces/work-order.repository.interface.ts` with all data types and interface including `WorkOrderWithDetails`
- [x] 1.3 Create `interfaces/work-order-item.repository.interface.ts`
- [x] 1.4 Create `interfaces/work-order-assignment.repository.interface.ts` with `isMemberInOrg` method
- [x] 1.5 Create `interfaces/asset-checkpoint.repository.interface.ts` with `addPhoto`, `removePhoto`, and `setSignature` methods
- [x] 1.6 Create `interfaces/index.ts` barrel

## 2. DTOs

- [x] 2.1 Create `dto/create-work-order.dto.ts` without `branchId`
- [x] 2.2 Create `dto/update-work-order.dto.ts` with nullable `scheduledAt` and `note`
- [x] 2.3 Create `dto/list-work-orders.dto.ts` with optional `status` enum and `assetId`
- [x] 2.4 Create `dto/transition-status.dto.ts`
- [x] 2.5 Create `dto/create-work-order-item.dto.ts`
- [x] 2.6 Create `dto/update-work-order-item.dto.ts`
- [x] 2.7 Create `dto/assign-member.dto.ts`
- [x] 2.8 Create `dto/create-checkpoint.dto.ts`
- [x] 2.9 Create `dto/update-checkpoint.dto.ts`
- [x] 2.10 Create `dto/presign-upload.dto.ts`
- [x] 2.11 Create `dto/remove-photo.dto.ts`
- [x] 2.12 Create `dto/index.ts` barrel

## 3. In-Memory Repositories

- [x] 3.1 Create `infrastructure/in-memory-work-order.repository.ts` with branch seeding and items getter callback
- [x] 3.2 Create `infrastructure/in-memory-work-order-item.repository.ts` with subtotal computation
- [x] 3.3 Create `infrastructure/in-memory-work-order-assignment.repository.ts` with member org seeding
- [x] 3.4 Create `infrastructure/in-memory-asset-checkpoint.repository.ts` with photo array manipulation

## 4. WorkOrdersService — TDD

- [x] 4.1 Write failing `work-orders.service.spec.ts` covering work orders, items, assignments, checkpoints, and S3
- [x] 4.2 Confirm spec fails before implementation
- [x] 4.3 Implement `work-orders.service.ts` with `VALID_TRANSITIONS` map and `syncTotal` private method
- [x] 4.4 Confirm all service specs pass

## 5. WorkOrdersController — TDD

- [x] 5.1 Write failing `work-orders.controller.spec.ts`
- [x] 5.2 Implement `work-orders.controller.ts` with RBAC decorators for all 6 handlers
- [x] 5.3 Confirm all controller specs pass

## 6. WorkOrderItemsController — TDD

- [x] 6.1 Write failing `work-order-items.controller.spec.ts`
- [x] 6.2 Implement `work-order-items.controller.ts` at `/work-orders/:workOrderId/items`
- [x] 6.3 Confirm all controller specs pass

## 7. WorkOrderAssignmentsController — TDD

- [x] 7.1 Write failing `work-order-assignments.controller.spec.ts`
- [x] 7.2 Implement `work-order-assignments.controller.ts` at `/work-orders/:workOrderId/assignments`
- [x] 7.3 Confirm all controller specs pass

## 8. WorkOrderCheckpointsController — TDD

- [x] 8.1 Write failing `work-order-checkpoints.controller.spec.ts`
- [x] 8.2 Implement `work-order-checkpoints.controller.ts` with presign endpoints
- [x] 8.3 Confirm all controller specs pass

## 9. Prisma Repositories

- [x] 9.1 Create `infrastructure/prisma-work-order.repository.ts` with `branch: { organizationId }` scoping and `$transaction` for findAll
- [x] 9.2 Create `infrastructure/prisma-work-order-item.repository.ts` with subtotal computation and `$transaction` for update
- [x] 9.3 Create `infrastructure/prisma-work-order-assignment.repository.ts` with P2002 for duplicate assignment
- [x] 9.4 Create `infrastructure/prisma-asset-checkpoint.repository.ts` with Json array manipulation for photos

## 10. S3 Service

- [x] 10.1 Create `s3.service.ts` with `generatePresignedUrl` using `@aws-sdk/s3-request-presigner`
- [x] 10.2 Add AWS env vars to `apps/api/src/config/envs.ts` schema

## 11. Module Wiring and Registration

- [x] 11.1 Create `work-orders.module.ts` with all four repository bindings and all four controllers
- [x] 11.2 Create `index.ts` barrel
- [x] 11.3 Add `@work-orders`, `@work-orders/dto`, `@work-orders/interfaces` to `tsconfig.paths.json`
- [x] 11.4 Mirror aliases in `jest.moduleNameMapper` in `apps/api/package.json`
- [x] 11.5 Register `WorkOrdersModule` in `apps/api/src/app.module.ts`

## 12. Verification

- [x] 12.1 Run all work-orders tests and confirm they pass
- [x] 12.2 Run `pnpm lint` with no errors
- [x] 12.3 Run `pnpm build` with no TypeScript errors
