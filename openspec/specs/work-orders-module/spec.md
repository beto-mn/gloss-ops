# Spec: work-orders-module

## Purpose

Defines the requirements for the `work-orders-module` capability in GlossOps.

## Requirements

### Requirement: Work order status state machine

The system SHALL enforce a defined set of valid status transitions; any attempt to move to an invalid status MUST be rejected.

Valid transitions:

- DRAFT → CONFIRMED or CANCELLED
- CONFIRMED → DRAFT, IN_PROGRESS, or CANCELLED
- IN_PROGRESS → COMPLETED (sets completedAt) or CANCELLED
- COMPLETED and CANCELLED are terminal — no further transitions allowed

#### Scenario: Valid transition is accepted

- **WHEN** a caller sends `PATCH /work-orders/:id/status` with a valid next status
- **THEN** the work order status is updated and the response returns the updated work order

#### Scenario: Invalid transition is rejected

- **WHEN** a caller sends `PATCH /work-orders/:id/status` with an invalid transition (e.g., DRAFT → COMPLETED)
- **THEN** the system returns HTTP 409 with `{ error: 'invalid_status_transition' }`

#### Scenario: Terminal status cannot be transitioned

- **WHEN** a caller sends `PATCH /work-orders/:id/status` for a COMPLETED or CANCELLED work order
- **THEN** the system returns HTTP 409 with `{ error: 'invalid_status_transition' }`

---

### Requirement: totalAmount recalculation after item mutations

The system SHALL automatically recalculate the work order's `totalAmount` after every add, update, or remove operation on work order items.

#### Scenario: totalAmount reflects sum of all item subtotals

- **WHEN** a caller adds, updates, or removes a work order item
- **THEN** `totalAmount` is recalculated as the sum of `(unitPrice × quantity − discount)` across all items

---

### Requirement: Item mutations restricted to DRAFT status

The system SHALL block creation, update, and deletion of work order items unless the work order is in DRAFT status.

#### Scenario: Item mutation on non-DRAFT work order is rejected

- **WHEN** a caller attempts to add, update, or remove an item from a work order not in DRAFT status
- **THEN** the system returns HTTP 409 with `{ error: 'work_order_not_editable' }`

---

### Requirement: branchId sourced from JWT, not from request body

The system SHALL set `branchId` on a new work order from the authenticated account's `branchId` field; callers MUST NOT provide branchId in the request body.

#### Scenario: Work order created with caller's branchId

- **WHEN** a caller sends `POST /work-orders` with only `assetId` and optional fields
- **THEN** the created work order has `branchId` equal to `account.branchId` from the JWT

---

### Requirement: Member assignment validation

The system SHALL validate that a member belongs to the same organization as the work order before creating an assignment, and SHALL prevent duplicate assignments.

#### Scenario: Member from another org cannot be assigned

- **WHEN** a caller attempts to assign a memberId that does not belong to the work order's organization
- **THEN** the system returns HTTP 404 with `{ error: 'member_not_found' }`

#### Scenario: Duplicate assignment is rejected

- **WHEN** a caller attempts to assign a member who is already assigned to the work order
- **THEN** the system returns HTTP 409 with `{ error: 'member_already_assigned' }`

---

### Requirement: Assignments and checkpoints blocked on closed work orders

The system SHALL prevent creating or modifying assignments and checkpoints on work orders in COMPLETED or CANCELLED status.

#### Scenario: Assignment on closed work order is rejected

- **WHEN** a caller attempts to add an assignment to a COMPLETED or CANCELLED work order
- **THEN** the system returns HTTP 409 with `{ error: 'work_order_closed' }`

---

### Requirement: Hard delete restricted to DRAFT work orders

The system SHALL only allow hard deletion of work orders in DRAFT status.

#### Scenario: Non-DRAFT work order cannot be deleted

- **WHEN** a caller with OWNER or MANAGER role attempts to DELETE a work order not in DRAFT status
- **THEN** the system returns HTTP 409 with `{ error: 'work_order_not_deletable' }`
