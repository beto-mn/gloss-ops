# Spec: services-module

## Purpose

Defines the requirements for the `services-module` capability in GlossOps.

## Requirements

### Requirement: Service catalog with activate/deactivate lifecycle

The system SHALL use an `isActive` boolean flag to toggle service availability instead of soft-delete, because services referenced by past work orders must persist to preserve historical pricing and warranty data.

#### Scenario: Deactivate hides a service from default listing

- **WHEN** a caller sends `POST /services/:id/deactivate`
- **THEN** the service's `isActive` is set to false and it is excluded from `GET /services` unless `?includeInactive=true` is provided

#### Scenario: Activate restores a service to the active listing

- **WHEN** a caller sends `POST /services/:id/activate` on an inactive service
- **THEN** the service's `isActive` is set to true and it appears in `GET /services`

#### Scenario: Idempotency guard on activate/deactivate

- **WHEN** a caller attempts to deactivate an already-inactive service
- **THEN** the system returns HTTP 409 with `{ error: 'service_already_inactive' }`

---

### Requirement: Name uniqueness per organization

The system SHALL enforce uniqueness of `(organizationId, name)` at the database level via a unique constraint.

#### Scenario: Duplicate name within same org is rejected

- **WHEN** a caller creates or updates a service with a name that already exists in their organization
- **THEN** the system returns HTTP 409 with `{ error: 'name_already_exists' }`

---

### Requirement: FK protection on service deletion

The system SHALL block hard deletion of a service that has WorkOrderItem or Warranty references.

#### Scenario: Service with references cannot be deleted

- **WHEN** a caller attempts to DELETE a service that has WorkOrderItem or Warranty references
- **THEN** the system returns HTTP 409 with `{ error: 'service_has_references' }`

---

### Requirement: isActive excluded from PATCH body

The system SHALL NOT allow changing `isActive` via `PATCH /services/:id`; activation state MUST only be changed via the dedicated `/activate` and `/deactivate` endpoints.

#### Scenario: PATCH body ignores isActive

- **WHEN** a caller sends `PATCH /services/:id` with an `isActive` field
- **THEN** the system ignores that field and only updates the explicitly supported fields

---

### Requirement: CFDI fields with format-only validation

The system SHALL validate `claveProdServ` (≤ 15 chars, alphanumeric) and `claveUnidad` (≤ 10 chars, alphanumeric) by regex format at the DTO level; catalog validity against the SAT catalog is deferred.

#### Scenario: Non-alphanumeric clave is rejected

- **WHEN** a caller sends a `claveProdServ` containing special characters
- **THEN** the system returns HTTP 400 with a validation error

---

### Requirement: RBAC enforcement per endpoint

The system SHALL restrict write and lifecycle operations to authorized roles.

#### Scenario: Only OWNER and MANAGER can create, update, activate, and deactivate

- **WHEN** a caller with TECHNICIAN or FRONT_DESK role attempts POST, PATCH, or lifecycle endpoints on `/services`
- **THEN** the system returns HTTP 403

#### Scenario: Only OWNER can hard delete a service

- **WHEN** a caller with MANAGER role attempts DELETE on `/services/:id`
- **THEN** the system returns HTTP 403
