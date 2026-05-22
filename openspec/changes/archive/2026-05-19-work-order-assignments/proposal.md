# Proposal: Work Order Assignments

## Why

Work orders had no structured way to assign responsible technicians. Shop managers needed to track who is working on a job and in what role, and the system had no enforcement to prevent assigning members to closed or cancelled orders.

## What Changes

- New `WorkOrderAssignmentsModule` with POST, GET, DELETE endpoints under `/work-orders/:workOrderId/assignments`
- Added `AssignmentRole` enum (`LEAD`, `ASSISTANT`) to Prisma schema; `WorkOrderAssignment.role` typed accordingly
- RBAC enforcement: OWNER and MANAGER can assign/unassign; all roles can list
- Business rules: blocks assignment on COMPLETED or CANCELLED work orders; validates org membership; prevents duplicate assignments
- Activity log recorded on every successful assignment

## Capabilities

- `work-order-assignments`: Manage technician assignments on work orders with role differentiation and status-aware validation

## Impact

- `packages/database/prisma/schema.prisma` — added `AssignmentRole` enum, updated `WorkOrderAssignment.role`
- `packages/database/prisma/migrations/` — new migration
- `apps/api/src/work-order-assignments/` — new module (interface, in-memory repo, Prisma repo, DTO, service, controller, module, barrel)
- `apps/api/src/app.module.ts` — registered `WorkOrderAssignmentsModule`
- `apps/api/tsconfig.paths.json` and `apps/api/package.json` — added `@work-order-assignments` path aliases
