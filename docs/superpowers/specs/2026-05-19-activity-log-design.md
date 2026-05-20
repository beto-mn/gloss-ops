# Activity Log Module — Design Spec

**Status:** Approved
**Date:** 2026-05-19
**Branch:** feat/activity-log

---

## Goal

Build the ActivityLog infrastructure (repository, service, read API) and integrate it into WorkOrders as the reference consumer. The `ActivityLog` table already exists in the schema — this module exposes it as a first-class NestJS module.

---

## Architecture

Repository pattern — one repository, one service, one controller. `ActivityLogsModule` imports only `PrismaModule` and exports `ActivityLogsService`. Consumer modules import `ActivityLogsModule` to inject `ActivityLogsService` for writes.

No HTTP endpoint for writes — writes are service-to-service only via `ActivityLogsService.record()`. The read endpoint is scoped to `account.organizationId`.

**Write pattern:** Direct service injection. Each consumer calls `record(data)` explicitly after mutations. Chosen over EventEmitter (async, harder to test) and Prisma middleware (loses business context like `accountId` and semantic `action`).

**Scope:** This spec builds the ActivityLog module and integrates it into WorkOrders. Future modules add `record()` calls in their own specs following the same pattern.

---

## File Structure

```
apps/api/src/activity-logs/
  interfaces/
    activity-log.repository.interface.ts
    index.ts
  infrastructure/
    prisma-activity-log.repository.ts
    in-memory-activity-log.repository.ts
  dto/
    list-activity-logs.dto.ts
    index.ts
  activity-logs.tokens.ts
  activity-logs.service.ts
  activity-logs.service.spec.ts
  activity-logs.controller.spec.ts
  activity-logs.controller.ts
  activity-logs.module.ts
  index.ts
```

**WorkOrders changes (existing files):**

- `work-orders.service.ts` — inject `ActivityLogsService`, add `accountId` param to `create`, `changeStatus`, `remove`
- `work-orders.controller.ts` — pass `account.sub` to those three methods
- `work-orders.module.ts` — add `ActivityLogsModule` to imports
- `work-orders.service.spec.ts` — add `ActivityLogsService` mock, add tests verifying `record()` calls

---

## Endpoint

| Method | Path             | Description                           | Roles |
| ------ | ---------------- | ------------------------------------- | ----- |
| `GET`  | `/activity-logs` | List logs for caller's org, paginated | ALL   |

---

## Data Shapes

### `ActivityLogRecord`

```typescript
interface ActivityLogRecord {
  id: string
  organizationId: string
  branchId: string | null
  accountId: string | null
  action: ActivityAction
  entity: string
  entityId: string
  metadata: Record<string, unknown> | null
  createdAt: Date
}
```

### `CreateActivityLogData`

```typescript
interface CreateActivityLogData {
  organizationId: string
  branchId?: string
  accountId?: string
  action: ActivityAction
  entity: string // PascalCase model name: 'WorkOrder', 'Customer', 'CustomerAsset', …
  entityId: string
  metadata?: Record<string, unknown>
}
```

### `ListActivityLogsDto`

```typescript
{
  entity?: string           // filter by entity name, e.g. 'WorkOrder'
  entityId?: string         // filter by specific record ID
  action?: ActivityAction   // CREATED | UPDATED | DELETED | STATUS_CHANGED | ASSIGNED
  page?: number             // default 1
  limit?: number            // default 20
}
```

---

## Repository Interface

```typescript
interface ActivityLogRepositoryInterface {
  create(data: CreateActivityLogData): Promise<ActivityLogRecord>
  findAll(
    organizationId: string,
    query: ActivityLogQuery
  ): Promise<ActivityLogPage>
}
```

### Supporting types

```typescript
interface ActivityLogQuery {
  entity?: string
  entityId?: string
  action?: ActivityAction
  page: number
  limit: number
}

interface ActivityLogPage {
  data: ActivityLogRecord[]
  total: number
  page: number
  limit: number
}
```

---

## Service API

```typescript
class ActivityLogsService {
  async record(data: CreateActivityLogData): Promise<void>
  async findAll(
    organizationId: string,
    dto: ListActivityLogsDto
  ): Promise<ActivityLogPage>
}
```

`record()` is awaited by callers after the main mutation commits. If the DB write fails, the exception propagates as 500 — but the main mutation is already persisted since log writes are sequential, not inside the same transaction.

---

## WorkOrders Integration

Three WorkOrder operations are logged. `accountId` is added as a required parameter to each method signature:

| Method         | New signature addition          | Action           | Metadata                              |
| -------------- | ------------------------------- | ---------------- | ------------------------------------- |
| `create`       | `accountId: string` (3rd param) | `CREATED`        | —                                     |
| `changeStatus` | `accountId: string` (4th param) | `STATUS_CHANGED` | `{ from: prevStatus, to: newStatus }` |
| `remove`       | `accountId: string` (3rd param) | `DELETED`        | —                                     |

`branchId` and `organizationId` are taken from the WorkOrder record already fetched during validation. `record()` is called after the mutation succeeds.

### Controller updates

`WorkOrdersController` passes `account.sub` as `accountId` to each of the three methods above.

### `changeStatus` flow update

```
1. Fetch WO → store prevStatus = wo.status
2. Validate transition
3. Persist new status
4. await activityLogs.record({ ..., action: STATUS_CHANGED, metadata: { from: prevStatus, to: newStatus } })
```

---

## Error Handling

ActivityLog writes have no validation errors. The only failure mode is a DB error, which propagates as an unhandled exception (500). No special error codes defined for this module.

The read endpoint returns an empty page (not 404) when no logs match the filters.

---

## Testing Strategy

### `ActivityLogsService` spec

Uses `InMemoryActivityLogRepository`. No mocks.

**Test cases:**

- `record` — creates a log entry; resolves void
- `findAll` — returns paginated results; filters by `entity` independently; filters by `entityId` independently; filters by `action` independently

### `WorkOrdersService` spec updates

Adds `ActivityLogsService` mock: `{ provide: ActivityLogsService, useValue: { record: jest.fn() } }`.

**New test cases:**

- `create` — calls `activityLogs.record` with `action: CREATED`, correct `entityId`, correct `accountId`
- `changeStatus` — calls `activityLogs.record` with `action: STATUS_CHANGED`, `metadata: { from, to }`
- `remove` — calls `activityLogs.record` with `action: DELETED`, correct `entityId`

---

## Module Wiring

```typescript
@Module({
  imports: [PrismaModule],
  controllers: [ActivityLogsController],
  providers: [
    {
      provide: ACTIVITY_LOG_REPOSITORY,
      useClass: PrismaActivityLogRepository,
    },
    ActivityLogsService,
  ],
  exports: [ActivityLogsService],
})
export class ActivityLogsModule {}
```

`WorkOrdersModule` adds `ActivityLogsModule` to its imports.

`AppModule` adds `ActivityLogsModule` to imports after `WorkOrdersModule`.

Path aliases added to `tsconfig.paths.json` and Jest `moduleNameMapper`:

- `@activity-logs`
- `@activity-logs/dto`
- `@activity-logs/interfaces`
