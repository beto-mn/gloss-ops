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

#### Scenario: DELETE route does not exist

- **WHEN** any caller (regardless of role) sends `DELETE /services/:id`
- **THEN** the response is `404 Not Found` (route not registered). The previous "Only OWNER can hard delete a service" scenario is removed because there is no hard delete to gate.

### Requirement: Service deletion is via deactivate, not DELETE

The `DELETE /services/:id` endpoint SHALL NOT exist. The `services` module exposes activation lifecycle endpoints (`POST /services/:id/activate` and `POST /services/:id/deactivate`) as the only way to retire a catalog entry. The `delete` method on `ServicesService` and the repository layer are removed (unless an internal caller other than the controller still references them — in which case they are kept but isolated).

#### Scenario: DELETE returns 404 (route does not exist)

- **WHEN** any caller sends `DELETE /services/:id`
- **THEN** Nest returns `404 Not Found` because the route is not registered (no controller method handles it)

#### Scenario: Deactivate replaces delete

- **WHEN** an `OWNER` or `MANAGER` calls `POST /services/:id/deactivate`
- **THEN** the service's `isActive` is set to `false` and it is excluded from `GET /services` unless `?includeInactive=true` is provided

#### Scenario: Service code has no hard-delete path

- **WHEN** the service-layer code is inspected
- **THEN** no code path in `ServicesService` calls `prisma.service.delete(...)` from a public-controller-reachable method
