# Work Order Assignments Module — Design Spec

**Status:** Approved
**Date:** 2026-05-19
**Branch:** feat/work-order-assignments

---

## Goal

Expose assignment management for work orders — allowing OWNER and MANAGER roles to assign and unassign organization members to a work order. Assignments are scoped to a work order and validated against org membership and WO status.

---

## Architecture

Repository pattern — one repository, one service, one controller. `WorkOrderAssignmentsModule` imports `WorkOrdersModule` to call `WorkOrdersService.findOne()` for ownership validation and status checks before any write operation.

**Scope:** `WorkOrderAssignment` is scoped to a `WorkOrder`, which is branch-scoped. Ownership is verified by resolving the WO through the caller's `organizationId`.

**Schema change:** Add `AssignmentRole` enum (`LEAD`, `ASSISTANT`) to Prisma schema. Update `WorkOrderAssignment.role` from `String` to `AssignmentRole` with default `ASSISTANT`.

---

## File Structure

```
apps/api/src/work-order-assignments/
  interfaces/
    work-order-assignment.repository.interface.ts
    index.ts
  infrastructure/
    prisma-work-order-assignment.repository.ts
    in-memory-work-order-assignment.repository.ts
  dto/
    create-work-order-assignment.dto.ts
    index.ts
  work-order-assignments.tokens.ts
  work-order-assignments.service.ts
  work-order-assignments.service.spec.ts
  work-order-assignments.controller.ts
  work-order-assignments.module.ts
  index.ts
```

**Schema changes:**

- `packages/database/prisma/schema.prisma` — add `AssignmentRole` enum, update `WorkOrderAssignment.role`
- `packages/database/prisma/migrations/` — new migration file

---

## Endpoints

| Method   | Path                                        | Description               | Roles          |
| -------- | ------------------------------------------- | ------------------------- | -------------- |
| `POST`   | `/work-orders/:workOrderId/assignments`     | Assign a member to a WO   | OWNER, MANAGER |
| `GET`    | `/work-orders/:workOrderId/assignments`     | List assignments for a WO | ALL            |
| `DELETE` | `/work-orders/:workOrderId/assignments/:id` | Remove a member from a WO | OWNER, MANAGER |

---

## Validation Rules

**On `POST`:**

1. Resolve WO via `WorkOrdersService.findOne(workOrderId, account.organizationId)` → 404 `work_order_not_found` if not found or wrong org
2. If WO status is `COMPLETED` or `CANCELLED` → 409 `work_order_not_assignable`
3. `memberId` exists in same org via `repo.existsMemberInOrg(memberId, organizationId)` → 404 `member_not_found`
4. Assignment `(workOrderId, memberId)` already exists → 409 `assignment_already_exists`

**On `DELETE`:**

1. Resolve WO via `WorkOrdersService.findOne(workOrderId, account.organizationId)` → 404 `work_order_not_found`
2. Find assignment by `id` → 404 `assignment_not_found` if missing
3. Verify `assignment.workOrderId === workOrderId` from URL path → 404 if mismatch (prevents cross-WO access)

No status re-validation on delete — OWNER and MANAGER can unassign regardless of WO state.

---

## Data Shapes

### `WorkOrderAssignmentRecord`

```typescript
interface WorkOrderAssignmentRecord {
  id: string
  workOrderId: string
  memberId: string
  role: AssignmentRole
  assignedAt: Date
}
```

### `CreateWorkOrderAssignmentData`

```typescript
interface CreateWorkOrderAssignmentData {
  workOrderId: string
  memberId: string
  role: AssignmentRole
}
```

### `CreateWorkOrderAssignmentDto`

```typescript
{
  memberId: string        // @IsUUID()
  role?: AssignmentRole   // @IsOptional(), @IsEnum(AssignmentRole) — defaults to ASSISTANT
}
```

---

## Repository Interface

```typescript
interface WorkOrderAssignmentRepositoryInterface {
  create(
    data: CreateWorkOrderAssignmentData
  ): Promise<WorkOrderAssignmentRecord>
  findAllByWorkOrder(workOrderId: string): Promise<WorkOrderAssignmentRecord[]>
  findById(id: string): Promise<WorkOrderAssignmentRecord | null>
  existsByWorkOrderAndMember(
    workOrderId: string,
    memberId: string
  ): Promise<boolean>
  existsMemberInOrg(memberId: string, organizationId: string): Promise<boolean>
  delete(id: string): Promise<void>
}
```

`existsMemberInOrg` queries the `OrganizationMember` table within the repository — acceptable because the repository owns the DB layer and can cross-check related tables needed to support validation.

The in-memory implementation accepts a seed of valid `(memberId, organizationId)` pairs for test setup.

---

## Error Handling

| Condition                                             | Code | Error key                   |
| ----------------------------------------------------- | ---- | --------------------------- |
| WO not found for caller's org                         | 404  | `work_order_not_found`      |
| WO is COMPLETED or CANCELLED                          | 409  | `work_order_not_assignable` |
| Member not in org                                     | 404  | `member_not_found`          |
| Assignment already exists for (workOrderId, memberId) | 409  | `assignment_already_exists` |
| Assignment not found                                  | 404  | `assignment_not_found`      |

---

## Activity Log

`POST` calls `activityLogs.record()` after a successful assignment:

```typescript
await activityLogs.record({
  organizationId,
  branchId: wo.branchId,
  accountId,
  action: ActivityAction.ASSIGNED,
  entity: 'WorkOrder',
  entityId: workOrderId,
  metadata: { memberId, role },
})
```

`WorkOrderAssignmentsModule` imports `ActivityLogsModule`.

---

## Testing Strategy

`WorkOrderAssignmentsService` spec uses `InMemoryWorkOrderAssignmentRepository`. `WorkOrdersService` and `ActivityLogsService` are jest mocks.

**Test cases:**

- `create` — assigns with default ASSISTANT role; assigns with explicit LEAD role; 404 if WO not found; 409 if WO is COMPLETED; 409 if WO is CANCELLED; 404 if member not in org; 409 if assignment already exists; calls `activityLogs.record` with `ASSIGNED` action and correct metadata
- `findAll` — returns assignments for WO
- `remove` — removes assignment; 404 if assignment not found; 404 if assignment belongs to another WO

---

## Module Wiring

```typescript
@Module({
  imports: [PrismaModule, WorkOrdersModule, ActivityLogsModule],
  controllers: [WorkOrderAssignmentsController],
  providers: [
    {
      provide: WORK_ORDER_ASSIGNMENT_REPOSITORY,
      useClass: PrismaWorkOrderAssignmentRepository,
    },
    WorkOrderAssignmentsService,
  ],
})
export class WorkOrderAssignmentsModule {}
```

`AppModule` adds `WorkOrderAssignmentsModule` to imports after `WorkOrdersModule`.

Path aliases added to `tsconfig.paths.json` and Jest `moduleNameMapper`:

- `@work-order-assignments`
- `@work-order-assignments/dto`
- `@work-order-assignments/interfaces`
