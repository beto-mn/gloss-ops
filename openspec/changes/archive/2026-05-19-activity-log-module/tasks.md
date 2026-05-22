# Tasks: Activity Log Module

## 1. Path Aliases

- [x] 1.1 Add `@activity-logs` entries to `tsconfig.paths.json`
- [x] 1.2 Add `@activity-logs` entries to jest `moduleNameMapper` in `package.json`

## 2. DI Token + Repository Interface

- [x] 2.1 Create `activity-logs.tokens.ts`
- [x] 2.2 Create `interfaces/activity-log.repository.interface.ts`
- [x] 2.3 Create `interfaces/index.ts`

## 3. DTO

- [x] 3.1 Create `dto/list-activity-logs.dto.ts`
- [x] 3.2 Create `dto/index.ts`

## 4. In-Memory Repository

- [x] 4.1 Create `infrastructure/in-memory-activity-log.repository.ts`

## 5. ActivityLogsService — TDD

- [x] 5.1 Write the failing spec (`activity-logs.service.spec.ts`)
- [x] 5.2 Implement `activity-logs.service.ts`
- [x] 5.3 Run spec and verify all 8 tests pass

## 6. Prisma Repository

- [x] 6.1 Create `infrastructure/prisma-activity-log.repository.ts`

## 7. Controller, Module, Barrel, AppModule

- [x] 7.1 Write the failing controller spec (`activity-logs.controller.spec.ts`)
- [x] 7.2 Implement `activity-logs.controller.ts`
- [x] 7.3 Create `activity-logs.module.ts`
- [x] 7.4 Create `index.ts` barrel
- [x] 7.5 Register `ActivityLogsModule` in `app.module.ts`

## 8. WorkOrders Integration

- [x] 8.1 Add `ActivityLogsService` mock and update call sites in `work-orders.service.spec.ts`
- [x] 8.2 Update `work-orders.service.ts` to inject `ActivityLogsService` and call `record()` on create, transition, and remove
- [x] 8.3 Update `work-orders.controller.ts` to pass `account.sub` to create, transition, and remove
- [x] 8.4 Update `work-orders.module.ts` to import `ActivityLogsModule`
- [x] 8.5 Run the full test suite
