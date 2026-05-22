# Proposal: Activity Log Module

## Why

GlossOps lacked an audit trail for operational events, making it impossible for shop owners to review what happened to a work order (who created it, when its status changed, who deleted it). The `ActivityLog` table already existed in the schema; this module exposes it as a structured NestJS module and connects it to work orders as the reference consumer.

## What Changes

- Added `ActivityLogsModule` with a read API (`GET /activity-logs`) and a service-to-service write API (`ActivityLogsService.record()`)
- Integrated `ActivityLogsService` into `WorkOrdersService` — logs are written on create, status transition, and delete
- Extended `WorkOrdersService.create`, `transition`, and `remove` signatures with `accountId` parameter
- Updated `WorkOrdersController` to pass `account.sub` to the three modified methods
- Added path aliases `@activity-logs`, `@activity-logs/dto`, `@activity-logs/interfaces`
- Registered `ActivityLogsModule` in `AppModule` and imported into `WorkOrdersModule`

## Capabilities

- `activity-log-module`: Append-only audit trail for operational events, with a paginated read endpoint and direct service-injection write pattern

## Impact

- `apps/api/src/activity-logs/` — new module (interfaces, infrastructure, dto, service, controller, module, barrel)
- `apps/api/src/work-orders/work-orders.service.ts` — injected `ActivityLogsService`, added `accountId` param
- `apps/api/src/work-orders/work-orders.controller.ts` — passes `account.sub` to three methods
- `apps/api/src/work-orders/work-orders.module.ts` — imports `ActivityLogsModule`
- `apps/api/tsconfig.paths.json` — new path aliases
- `apps/api/package.json` — new jest moduleNameMapper entries
- `apps/api/src/app.module.ts` — registered `ActivityLogsModule`
