# Tasks: Branches Module

## 1. Schema and migration

- [x] 1.1 Add `status ResourceStatus @default(ACTIVE)` to `Branch` model in `schema.prisma`
- [x] 1.2 Add `deletedAt DateTime? @map("deleted_at")` to `Branch` model
- [x] 1.3 Add `onDelete: Cascade` to `OrganizationMember.branch` relation
- [x] 1.4 Run migration `add-branch-soft-delete`
- [x] 1.5 Rebuild the database package to update generated types

## 2. TypeScript path aliases

- [x] 2.1 Add `@branches`, `@branches/dto`, `@branches/interfaces` to `tsconfig.paths.json`
- [x] 2.2 Mirror the three aliases in the Jest `moduleNameMapper`

## 3. Interfaces and DTOs

- [x] 3.1 Create `interfaces/branch.repository.interface.ts` with all types and interface
- [x] 3.2 Create `interfaces/index.ts` barrel
- [x] 3.3 Create `dto/create-branch.dto.ts`
- [x] 3.4 Create `dto/update-branch.dto.ts`
- [x] 3.5 Create `dto/list-branches.dto.ts`
- [x] 3.6 Create `dto/index.ts` barrel
- [x] 3.7 Create `branches.tokens.ts`

## 4. In-memory repository and spec

- [x] 4.1 Create `infrastructure/in-memory-branch.repository.ts`
- [x] 4.2 Create `infrastructure/in-memory-branch.repository.spec.ts` with all methods exercised
- [x] 4.3 Run in-memory repo tests to verify they pass

## 5. Prisma repository

- [x] 5.1 Create `infrastructure/prisma-branch.repository.ts`
- [x] 5.2 Create `infrastructure/index.ts` barrel

## 6. Service and spec

- [x] 6.1 Create `branches.service.ts` with `create`, `findAll`, `findOne`, `update`, `remove`
- [x] 6.2 Create `branches.service.spec.ts` covering all business rules
- [x] 6.3 Run service tests to verify they pass

## 7. Controller and spec

- [x] 7.1 Create `branches.controller.ts` with all 5 endpoints
- [x] 7.2 Create `branches.controller.spec.ts` with RBAC checks
- [x] 7.3 Run controller tests to verify they pass

## 8. Cleanup service and spec

- [x] 8.1 Create `branches.cleanup.service.ts` with `@Cron('0 3 * * *')` and 30-day retention
- [x] 8.2 Create `branches.cleanup.service.spec.ts` verifying only expired branches are deleted
- [x] 8.3 Run cleanup tests to verify they pass

## 9. Module wiring

- [x] 9.1 Create `branches.module.ts` registering controller, service, cleanup service, and repo token
- [x] 9.2 Create `index.ts` barrel
- [x] 9.3 Add `BranchesModule` to `AppModule` imports
- [x] 9.4 Run full test suite to verify all suites pass
