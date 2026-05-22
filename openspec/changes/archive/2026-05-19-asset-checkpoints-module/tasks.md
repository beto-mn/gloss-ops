# Tasks: Asset Checkpoints Module

## 1. Path Aliases + WorkOrdersModule Export

- [x] 1.1 Add `@asset-checkpoints` entries to `tsconfig.paths.json`
- [x] 1.2 Add `@asset-checkpoints` entries to jest `moduleNameMapper` in `package.json`
- [x] 1.3 Add `exports: [WorkOrdersService]` to `WorkOrdersModule`
- [x] 1.4 Run existing tests to verify nothing broke

## 2. DI Tokens + Repository Interface

- [x] 2.1 Create `asset-checkpoints.tokens.ts`
- [x] 2.2 Create `interfaces/asset-checkpoint.repository.interface.ts`
- [x] 2.3 Create `interfaces/index.ts`

## 3. DTOs

- [x] 3.1 Create `dto/create-asset-checkpoint.dto.ts`
- [x] 3.2 Create `dto/update-asset-checkpoint.dto.ts`
- [x] 3.3 Create `dto/index.ts`

## 4. In-Memory Repository

- [x] 4.1 Create `infrastructure/in-memory-asset-checkpoint.repository.ts`

## 5. AssetCheckpointsService — TDD

- [x] 5.1 Write the failing spec (`asset-checkpoints.service.spec.ts`)
- [x] 5.2 Implement `asset-checkpoints.service.ts`
- [x] 5.3 Run spec and verify all 13 tests pass

## 6. Prisma Repository

- [x] 6.1 Create `infrastructure/prisma-asset-checkpoint.repository.ts`

## 7. Controller, Module, Barrel, AppModule

- [x] 7.1 Create `asset-checkpoints.controller.ts`
- [x] 7.2 Create `asset-checkpoints.module.ts`
- [x] 7.3 Create `index.ts` barrel
- [x] 7.4 Register `AssetCheckpointsModule` in `app.module.ts`
- [x] 7.5 Run full test suite
