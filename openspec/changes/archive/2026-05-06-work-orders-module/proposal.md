# Proposal: Work Orders Module

## Why

Automotive shops needed a central operational entity to manage the full lifecycle of a job — from intake through completion — bringing together customers, vehicles, services, and technicians into a single structured workflow.

## What Changes

- Added `WorkOrdersModule` covering four resources: `WorkOrder`, `WorkOrderItem`, `WorkOrderAssignment`, and `AssetCheckpoint`
- Implemented status state machine with valid transitions: DRAFT → CONFIRMED → IN_PROGRESS → COMPLETED, plus CANCELLED from non-terminal states
- Work order items recalculate `totalAmount` after every mutation via `syncTotal`
- Four controllers split concerns: work orders, items, assignments, and checkpoints
- S3 pre-signed URL generation for checkpoint photos and customer signatures
- Org-scoping done via `branchId → branch.organizationId` (never from DTO)
- TS path aliases and Jest mapper entries added for `@work-orders`, `@work-orders/dto`, `@work-orders/interfaces`
- Four AWS environment variables added for S3 integration

## Capabilities

- `work-orders-module`: Full CRUD for work orders with state machine transitions, nested items with totalAmount recalculation, member assignments, asset checkpoints, and S3 photo/signature upload via pre-signed URLs

## Impact

- `apps/api/src/config/envs.ts` — added AWS S3 env var schema
- `apps/api/src/work-orders/` — new module with 4 interfaces, 4 infrastructure implementations each (Prisma + in-memory), 11 DTOs, 4 controllers, 1 service, S3 service, tokens, and module wiring
- `apps/api/tsconfig.paths.json` — added `@work-orders`, `@work-orders/dto`, `@work-orders/interfaces`
- `apps/api/package.json` — added jest moduleNameMapper entries
- `apps/api/src/app.module.ts` — registered `WorkOrdersModule`
