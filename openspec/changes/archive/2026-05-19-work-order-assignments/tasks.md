# Tasks: Work Order Assignments

## 1. Schema migration — add `AssignmentRole` enum

- [x] 1.1 Add `AssignmentRole` enum to `schema.prisma`
- [x] 1.2 Update `WorkOrderAssignment.role` field type to `AssignmentRole` with default `ASSISTANT`
- [x] 1.3 Run `prisma migrate dev --name add_assignment_role_enum`
- [x] 1.4 Verify the generated SQL contains the correct `CREATE TYPE` and `ALTER TABLE` statements
- [x] 1.5 Confirm `@glossops/database` package builds without errors
- [x] 1.6 Commit schema and migration changes

## 2. Path aliases

- [x] 2.1 Add `@work-order-assignments`, `@work-order-assignments/dto`, and `@work-order-assignments/interfaces` entries to `tsconfig.paths.json`
- [x] 2.2 Add the same three entries to `jest.moduleNameMapper` in `package.json`
- [x] 2.3 Commit path alias changes

## 3. DI token + repository interface

- [x] 3.1 Create `work-order-assignments.tokens.ts` with `WORK_ORDER_ASSIGNMENT_REPOSITORY` symbol
- [x] 3.2 Create `interfaces/work-order-assignment.repository.interface.ts` with `WorkOrderAssignmentRecord`, `CreateWorkOrderAssignmentData`, and `WorkOrderAssignmentRepositoryInterface`
- [x] 3.3 Create `interfaces/index.ts` barrel sorted by line length
- [x] 3.4 Commit interface and token files

## 4. DTO

- [x] 4.1 Create `dto/create-work-order-assignment.dto.ts` with `memberId` and optional `role` fields
- [x] 4.2 Create `dto/index.ts` barrel
- [x] 4.3 Commit DTO files

## 5. In-memory repository

- [x] 5.1 Create `infrastructure/in-memory-work-order-assignment.repository.ts` with `seedMember` helper and all interface methods
- [x] 5.2 Commit in-memory repository

## 6. WorkOrderAssignmentsService — TDD

- [x] 6.1 Write full service spec covering create (7 cases), findAll, and remove (3 cases)
- [x] 6.2 Run tests to confirm they all fail before implementation
- [x] 6.3 Create `work-order-assignments.service.ts` with create, findAll, and remove methods
- [x] 6.4 Run tests to confirm all 11 pass
- [x] 6.5 Commit service and spec files

## 7. Prisma repository

- [x] 7.1 Create `infrastructure/prisma-work-order-assignment.repository.ts` with `existsMemberInOrg` querying via `branch.organizationId` join
- [x] 7.2 Commit Prisma repository

## 8. Controller, module, barrel, and AppModule registration

- [x] 8.1 Create `work-order-assignments.controller.ts` with POST, GET, DELETE handlers
- [x] 8.2 Create `work-order-assignments.module.ts` importing `PrismaModule`, `WorkOrdersModule`, and `ActivityLogsModule`
- [x] 8.3 Create `index.ts` barrel sorted by line length
- [x] 8.4 Register `WorkOrderAssignmentsModule` in `apps/api/src/app.module.ts`
- [x] 8.5 Run full test suite to confirm no regressions
- [x] 8.6 Commit controller, module, barrel, and AppModule changes
