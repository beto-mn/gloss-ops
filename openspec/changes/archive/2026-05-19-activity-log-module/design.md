# Design: Activity Log Module

## Context

The `ActivityLog` table already exists in the Prisma schema. This module exposes it as a first-class NestJS module: a single repository, one service with read/write separation, and one read-only controller. The module is designed for consumer injection — any future module can import `ActivityLogsModule` and call `ActivityLogsService.record()` after mutations. WorkOrders is the reference consumer implemented in this change.

## Goals

- Build the ActivityLog infrastructure (repository, service, read API)
- Integrate into WorkOrders for create, transition, and remove operations
- Establish the pattern for future module consumers

## Non-Goals

- HTTP write endpoint — writes are service-to-service only
- Real-time streaming or webhooks for log events
- Log retention policies or archival
- Activity logs for modules other than WorkOrders (deferred to each module's own spec)

## Decisions

**Direct service injection over EventEmitter:** Async EventEmitter makes tests harder and loses business context (`accountId`, semantic `action`). Direct calls are synchronous with the mutation and provide full context without extra infrastructure.

**Direct service injection over Prisma middleware:** Middleware runs on every Prisma operation and lacks semantic context like which account triggered the action or what the business action name is.

**`record()` is awaited after the main mutation commits:** Log writes are sequential, not inside the same transaction. If the log write fails, the mutation is already persisted — this is acceptable since logs are informational, not transactional.

**`organizationId` and `branchId` taken from the already-fetched work order record:** No extra DB lookup needed; the WO is fetched during validation, so its `organizationId` and `branchId` are available in the service method.

## Risks / Trade-offs

**Log write failure propagates as HTTP 500:** The main mutation succeeds but the log is not written. Future improvement: wrap in a try/catch and emit a warning, or move to an async queue.

**`accountId` added as required parameter to three WorkOrdersService methods:** This is a breaking change to the method signatures that requires updating the controller and all tests. It was chosen over passing the full auth context to keep the service interface clean.
