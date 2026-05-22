# Spec: warranties-module

## ADDED Requirements

### Requirement: Warranties are auto-generated on work order completion

When a work order transitions to COMPLETED, the system SHALL create a warranty record for each work order item whose associated service has `warrantyDays > 0`.

#### Scenario: Items with warrantyDays generate warranties

- **WHEN** a work order transitions to COMPLETED and one or more items have a service with `warrantyDays > 0`
- **THEN** one warranty record is created per qualifying item with `validFrom` equal to `completedAt` and `validUntil` equal to `completedAt + warrantyDays`

#### Scenario: Items with warrantyDays null or 0 are skipped

- **WHEN** a work order transitions to COMPLETED and no items qualify (all have `warrantyDays` null or 0)
- **THEN** no warranty records are created and no error is thrown

#### Scenario: Description falls back to service name

- **WHEN** a qualifying item's service has `warrantyDescription` null
- **THEN** the warranty `description` is set to the service `name`

---

### Requirement: WARRANTY_CLAIM work orders MUST reference a valid, active warranty

When creating a work order of type `WARRANTY_CLAIM`, the system SHALL validate the referenced warranty before persisting the new work order.

#### Scenario: Referenced warranty is voided

- **WHEN** a WARRANTY_CLAIM work order is created referencing a warranty with `isVoid = true`
- **THEN** the API returns 422 with error key `warranty_voided`

#### Scenario: Referenced warranty is expired

- **WHEN** a WARRANTY_CLAIM work order is created referencing a warranty whose `validUntil` is in the past
- **THEN** the API returns 422 with error key `warranty_expired`

#### Scenario: Referenced warranty belongs to a different asset

- **WHEN** a WARRANTY_CLAIM work order is created and the warranty's asset does not match `dto.assetId`
- **THEN** the API returns 422 with error key `warranty_asset_mismatch`

---

### Requirement: A warranty SHALL NOT be voided more than once

Calling the void endpoint on an already-voided warranty SHALL return a conflict error.

#### Scenario: Double void attempt

- **WHEN** the void endpoint is called on a warranty that already has `isVoid = true`
- **THEN** the API returns 409 with error key `warranty_already_voided`

---

### Requirement: Voiding a warranty triggers an activity log entry

After successfully voiding a warranty, an activity log record SHALL be created.

#### Scenario: Activity log on void

- **WHEN** a warranty is successfully voided
- **THEN** an activity log entry is recorded with action `UPDATED`, entity `Warranty`, and metadata `{ isVoid: true, reason }`

---

### Requirement: Warranty reads are scoped to the caller's organization

All warranty read operations SHALL filter by `organizationId` via the work order chain.

#### Scenario: Warranty not accessible from a different organization

- **WHEN** a GET request is made for a warranty that belongs to a different organization
- **THEN** the API returns 404 with error key `warranty_not_found`

---

### Requirement: OWNER and MANAGER are the only roles that can void warranties

The void endpoint SHALL be restricted to OWNER and MANAGER roles.

#### Scenario: TECHNICIAN attempts to void a warranty

- **WHEN** a user with role TECHNICIAN calls `POST /warranties/:id/void`
- **THEN** the request is rejected with a 403 Forbidden response
