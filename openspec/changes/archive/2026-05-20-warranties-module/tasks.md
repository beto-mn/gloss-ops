# Tasks: Warranties Module

## 1. Foundation — interface, in-memory repository, DTO, tokens

- [x] 1.1 Create `interfaces/warranty.repository.interface.ts` with `WarrantyRecord`, `WarrantyWithAsset`, `ItemForGeneration`, `CreateWarrantyData`, and `WarrantyRepositoryInterface`
- [x] 1.2 Create `interfaces/index.ts` barrel sorted by line length
- [x] 1.3 Create `infrastructure/in-memory-warranty.repository.ts` with `seedItemContext` and `seedItemsForGeneration` helpers
- [x] 1.4 Create `dto/void-warranty.dto.ts` and `dto/index.ts`
- [x] 1.5 Create `warranties.tokens.ts` with `WARRANTY_REPOSITORY` symbol
- [x] 1.6 Commit foundation files

## 2. WarrantyService — tests first, then implementation

- [x] 2.1 Add `@warranties`, `@warranties/dto`, and `@warranties/interfaces` path aliases to `tsconfig.paths.json` and `jest.moduleNameMapper`
- [x] 2.2 Write full service spec covering `generateForWorkOrder` (5 cases), `validateClaim` (5 cases), `findOne` (2 cases), `findByWorkOrder`, `findByAsset`, and `void` (4 cases)
- [x] 2.3 Run tests to confirm they fail before implementation
- [x] 2.4 Create `warranties.service.ts` with all six methods
- [x] 2.5 Run tests to confirm all pass
- [x] 2.6 Commit service, spec, and alias changes

## 3. Controllers — tests first, then implementations

- [x] 3.1 Write failing specs for `WarrantiesController`, `WorkOrderWarrantiesController`, and `AssetWarrantiesController`
- [x] 3.2 Run specs to confirm they fail
- [x] 3.3 Implement `warranties.controller.ts` with `GET :id` and `POST :id/void`
- [x] 3.4 Implement `work-order-warranties.controller.ts` with `GET /work-orders/:workOrderId/warranties`
- [x] 3.5 Implement `asset-warranties.controller.ts` with `GET /customer-assets/:assetId/warranties`
- [x] 3.6 Run specs to confirm all pass
- [x] 3.7 Commit all three controllers and specs

## 4. Prisma repository implementation

- [x] 4.1 Create `infrastructure/prisma-warranty.repository.ts` with all interface methods and org-scoping joins
- [x] 4.2 Run all warranty tests to confirm no regressions
- [x] 4.3 Commit Prisma repository

## 5. Module wiring and AppModule registration

- [x] 5.1 Create `warranties.module.ts` importing `PrismaModule` and `ActivityLogsModule`, registering all three controllers, and exporting `WarrantyService`
- [x] 5.2 Create `index.ts` barrel
- [x] 5.3 Register `WarrantiesModule` in `apps/api/src/app.module.ts`
- [x] 5.4 Run all warranty tests to confirm they pass
- [x] 5.5 Commit module, barrel, and AppModule changes

## 6. WorkOrders integration — inject WarrantyService and add tests

- [x] 6.1 Add `WarrantyService` mock to `work-orders.service.spec.ts` and write new test cases for completion and WARRANTY_CLAIM creation
- [x] 6.2 Run existing work-orders spec to confirm new tests fail
- [x] 6.3 Inject `WarrantyService` into `work-orders.service.ts` and add two call sites
- [x] 6.4 Add `WarrantiesModule` to `work-orders.module.ts` imports
- [x] 6.5 Run work-orders service spec to confirm all tests pass
- [x] 6.6 Run full test suite to confirm no regressions
- [x] 6.7 Commit all WorkOrders integration changes
