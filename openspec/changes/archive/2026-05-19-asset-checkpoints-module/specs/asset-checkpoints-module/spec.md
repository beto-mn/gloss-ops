# Spec: asset-checkpoints-module

## ADDED Requirements

### Requirement: Work Order Ownership Validation

All checkpoint operations MUST resolve the work order via `WorkOrdersService.findOne(workOrderId, account.organizationId)`. A 404 is returned if the work order does not exist or belongs to a different organization.

#### Scenario: Access denied for wrong organization

- **WHEN** a checkpoint operation is requested with a `workOrderId` that belongs to a different organization
- **THEN** the request is rejected with HTTP 404 and error key `work_order_not_found`

### Requirement: Creation Guards on POST

Creating a checkpoint SHALL be blocked if the work order is CANCELLED, if the type is RECEPTION and the work order is COMPLETED, or if a checkpoint of the same type already exists for the work order.

#### Scenario: Blocked on CANCELLED work order

- **WHEN** a checkpoint creation is attempted on a CANCELLED work order
- **THEN** the request is rejected with HTTP 409 and error key `work_order_cancelled`

#### Scenario: RECEPTION blocked on COMPLETED work order

- **WHEN** a RECEPTION checkpoint creation is attempted on a COMPLETED work order
- **THEN** the request is rejected with HTTP 409 and error key `work_order_completed`

#### Scenario: Duplicate type blocked

- **WHEN** a checkpoint of the same `type` already exists for the work order
- **THEN** the request is rejected with HTTP 409 and error key `checkpoint_already_exists`

#### Scenario: DELIVERY allowed on COMPLETED work order

- **WHEN** a DELIVERY checkpoint is created on a COMPLETED work order
- **THEN** the checkpoint is created successfully

### Requirement: Checkpoint Scoping on Read and Write

Checkpoint lookups by ID MUST verify that the checkpoint belongs to the work order specified in the URL path. A mismatch returns 404 to prevent cross-work-order access.

#### Scenario: Cross-WO access denied

- **WHEN** a checkpoint ID is requested under a different work order than it belongs to
- **THEN** the request is rejected with HTTP 404 and error key `checkpoint_not_found`

### Requirement: Checkpoint Update

Checkpoint updates MUST be restricted to OWNER and MANAGER roles. The `type` field is immutable and MUST NOT be updatable.

#### Scenario: Update mileage and note

- **WHEN** a user with OWNER or MANAGER role sends a PATCH with `mileage` and `note`
- **THEN** the checkpoint is updated with the new values

#### Scenario: Type not updatable

- **WHEN** an update payload includes a `type` field
- **THEN** the field is ignored and the checkpoint type remains unchanged

### Requirement: Recorded By Tracking

The `recordedById` field MUST be set from `account.sub` at creation time and is not updatable.

#### Scenario: recordedById set on creation

- **WHEN** a checkpoint is created by an authenticated user
- **THEN** `recordedById` is set to `account.sub` from the JWT

### Requirement: No Status Re-Validation on Update or Delete

OWNER and MANAGER users MUST be able to update or delete a checkpoint regardless of work order status. Status validation only applies at creation time.

#### Scenario: Update allowed regardless of WO status

- **WHEN** an OWNER or MANAGER updates a checkpoint on a COMPLETED or CANCELLED work order
- **THEN** the update succeeds without a status conflict error
