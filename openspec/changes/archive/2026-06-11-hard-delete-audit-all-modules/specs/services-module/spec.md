## REMOVED Requirements

### Requirement: FK protection on service deletion

**Reason**: `DELETE /services/:id` is removed entirely. The endpoint was redundant with the existing `POST /services/:id/deactivate`, which already conveys the correct semantics (the service catalog entry persists; new work orders can't use it). With the endpoint gone, FK protection at the controller layer is no longer meaningful.

**Migration**: Callers wanting to retire a service catalog entry use `POST /services/:id/deactivate`. The deactivated service is excluded from `GET /services` by default and remains referenceable by historical `WorkOrderItem` and `Warranty` rows.

## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: RBAC enforcement per endpoint

The system SHALL restrict write and lifecycle operations to authorized roles.

#### Scenario: Only OWNER and MANAGER can create, update, activate, and deactivate

- **WHEN** a caller with TECHNICIAN or FRONT_DESK role attempts POST, PATCH, or lifecycle endpoints on `/services`
- **THEN** the system returns HTTP 403

#### Scenario: DELETE route does not exist

- **WHEN** any caller (regardless of role) sends `DELETE /services/:id`
- **THEN** the response is `404 Not Found` (route not registered). The previous "Only OWNER can hard delete a service" scenario is removed because there is no hard delete to gate.
