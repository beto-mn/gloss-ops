# Spec: activity-log-module

## ADDED Requirements

### Requirement: Activity Log Write API

`ActivityLogsService.record()` SHALL create an immutable log entry. There are no validation errors — the only failure mode is a database error which propagates as HTTP 500.

#### Scenario: Record a log entry

- **WHEN** `activityLogsService.record(data)` is called with valid `CreateActivityLogData`
- **THEN** an `ActivityLog` entry is persisted and the method resolves void

#### Scenario: Metadata is persisted

- **WHEN** `record()` is called with a `metadata` object
- **THEN** the metadata is stored as-is and retrievable via `findAll`

### Requirement: Activity Log Read API

`GET /activity-logs` SHALL return a paginated list of logs scoped to `account.organizationId`. The endpoint MUST support filters by `entity`, `entityId`, and `action`.

#### Scenario: List logs for organization

- **WHEN** `GET /activity-logs` is called by an authenticated user
- **THEN** only logs belonging to `account.organizationId` are returned, paginated

#### Scenario: Filter by entity

- **WHEN** `GET /activity-logs?entity=WorkOrder` is called
- **THEN** only logs with `entity = 'WorkOrder'` are returned

#### Scenario: Filter by action

- **WHEN** `GET /activity-logs?action=STATUS_CHANGED` is called
- **THEN** only logs with `action = STATUS_CHANGED` are returned

### Requirement: WorkOrders Activity Integration — Create

`WorkOrdersService.create` MUST call `activityLogs.record` with `action: CREATED` after the work order is persisted.

#### Scenario: Log on work order creation

- **WHEN** a work order is created
- **THEN** an activity log entry is written with `action: CREATED`, correct `entityId`, `branchId`, and `accountId`

### Requirement: WorkOrders Activity Integration — Status Change

`WorkOrdersService.transition` MUST call `activityLogs.record` with `action: STATUS_CHANGED` and metadata containing `{ from: prevStatus, to: newStatus }` after the transition is persisted.

#### Scenario: Log on status transition

- **WHEN** a work order status is transitioned
- **THEN** an activity log entry is written with `action: STATUS_CHANGED` and metadata `{ from, to }`

### Requirement: WorkOrders Activity Integration — Delete

`WorkOrdersService.remove` MUST call `activityLogs.record` with `action: DELETED` after the work order is deleted.

#### Scenario: Log on work order deletion

- **WHEN** a work order is deleted
- **THEN** an activity log entry is written with `action: DELETED` and the correct `entityId` and `accountId`
