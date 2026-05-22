# Spec: invoice-module

## Purpose

Defines the requirements for the `invoice-module` capability in GlossOps.

## Requirements

### Requirement: An invoice can only be created for a work order belonging to the caller's branch

The create endpoint SHALL reject a work order that does not belong to the caller's branch, even if the WO exists in the same organization.

#### Scenario: Work order belongs to a different branch

- **WHEN** a POST request is made to create an invoice and the work order's `branchId` does not match the caller's branch
- **THEN** the API returns 404 with error key `work_order_not_found`

#### Scenario: Work order already has an invoice

- **WHEN** a POST request is made for a work order that already has an existing invoice
- **THEN** the API returns 409 with error key `invoice_already_exists`

---

### Requirement: Invoice folio MUST be unique per branch and sequentially generated

The system SHALL generate a folio in the format `INV-{YYYY}-{NNNN}` where the sequence is monotonically increasing per branch and assigned atomically.

#### Scenario: First invoice for a branch

- **WHEN** the first invoice is created for a branch
- **THEN** the folio is `INV-{currentYear}-0001`

#### Scenario: Concurrent folio generation is safe

- **WHEN** two requests create invoices for the same branch concurrently
- **THEN** each receives a unique folio with no gaps or duplicates

---

### Requirement: The DRAFT → ISSUED transition requires a completed work order

Issuing an invoice SHALL be blocked when the referenced work order has not yet reached COMPLETED status.

#### Scenario: Work order is not COMPLETED at issue time

- **WHEN** a status transition to ISSUED is requested and the invoice's work order status is not COMPLETED
- **THEN** the API returns 409 with error key `work_order_not_completed`

#### Scenario: Successful DRAFT → ISSUED transition sets issuedAt

- **WHEN** a status transition from DRAFT to ISSUED succeeds
- **THEN** the returned invoice has `issuedAt` populated with the current timestamp

---

### Requirement: The invoice status machine MUST enforce valid transitions only

Only defined transitions SHALL be permitted; all others return a conflict error.

#### Scenario: Invalid transition from PAID

- **WHEN** a status transition is requested from PAID to any other status
- **THEN** the API returns 409 with error key `invalid_status_transition`

#### Scenario: Skipping ISSUED to go directly to PAID from DRAFT

- **WHEN** a status transition from DRAFT to PAID is requested
- **THEN** the API returns 409 with error key `invalid_status_transition`

---

### Requirement: Fiscal data can only be updated on a DRAFT invoice

The update endpoint SHALL reject changes to fiscal fields when the invoice is not in DRAFT status.

#### Scenario: Attempt to update a non-DRAFT invoice

- **WHEN** a PATCH request is made on an invoice with status ISSUED, PAID, or CANCELLED
- **THEN** the API returns 409 with error key `invoice_not_editable`

---

### Requirement: Invoice creation and status transitions trigger activity log entries

The system SHALL record an activity log on `CREATED` and `STATUS_CHANGED` events.

#### Scenario: Activity log on invoice creation

- **WHEN** an invoice is successfully created
- **THEN** an activity log entry is recorded with action `CREATED`, entity `Invoice`

#### Scenario: Activity log on status transition

- **WHEN** an invoice status transition succeeds
- **THEN** an activity log entry is recorded with action `STATUS_CHANGED` and metadata `{ from, to }`
