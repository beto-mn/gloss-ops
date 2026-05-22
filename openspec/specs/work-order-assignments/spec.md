# Spec: work-order-assignments

## Purpose

Defines the requirements for the `work-order-assignments` capability in GlossOps.

## Requirements

### Requirement: Assignment creation is blocked on terminal work orders

A work order assignment SHALL NOT be created when the work order status is COMPLETED or CANCELLED.

#### Scenario: Attempt to assign on a completed work order

- **WHEN** a POST request is made to assign a member to a work order with status COMPLETED
- **THEN** the API returns 409 with error key `work_order_not_assignable`

#### Scenario: Attempt to assign on a cancelled work order

- **WHEN** a POST request is made to assign a member to a work order with status CANCELLED
- **THEN** the API returns 409 with error key `work_order_not_assignable`

---

### Requirement: Assignment member MUST belong to the caller's organization

The assigned member SHALL be validated against the organization before the assignment is persisted.

#### Scenario: Member not found in organization

- **WHEN** a POST request is made with a `memberId` that does not belong to the caller's organization
- **THEN** the API returns 404 with error key `member_not_found`

---

### Requirement: Duplicate assignments are prevented

A member SHALL NOT be assigned to the same work order more than once.

#### Scenario: Duplicate assignment attempt

- **WHEN** a POST request is made for a `(workOrderId, memberId)` pair that already exists
- **THEN** the API returns 409 with error key `assignment_already_exists`

---

### Requirement: Assignment role defaults to ASSISTANT

The `role` field in a create request SHALL default to `ASSISTANT` when not provided.

#### Scenario: Create assignment without specifying role

- **WHEN** a POST request is made without a `role` field
- **THEN** the created assignment has `role` equal to `ASSISTANT`

#### Scenario: Create assignment with explicit LEAD role

- **WHEN** a POST request is made with `role: LEAD`
- **THEN** the created assignment has `role` equal to `LEAD`

---

### Requirement: Removal is scoped to the work order in the URL path

An assignment DELETE SHALL be rejected if the assignment's `workOrderId` does not match the `:workOrderId` in the URL.

#### Scenario: Assignment belongs to a different work order

- **WHEN** a DELETE request is made for an assignment ID that exists but belongs to a different work order
- **THEN** the API returns 404 with error key `assignment_not_found`

---

### Requirement: Successful assignment triggers an activity log entry

An activity log record SHALL be created with action `ASSIGNED` when an assignment is successfully created.

#### Scenario: Activity log on successful assignment

- **WHEN** a member is successfully assigned to a work order
- **THEN** an activity log entry is recorded with action `ASSIGNED`, entity `WorkOrder`, and metadata containing `memberId` and `role`
