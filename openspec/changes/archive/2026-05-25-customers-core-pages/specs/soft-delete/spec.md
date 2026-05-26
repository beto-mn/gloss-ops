## MODIFIED Requirements

### Requirement: Active-only reads

All read operations (list, find-by-id, find-by-email, find-by-phone) SHALL return only records with `status = ACTIVE`.

#### Scenario: Find by ID excludes inactive records

- **WHEN** a `findById` is called for a record that has been soft-deleted
- **THEN** the repository returns `null`

#### Scenario: List excludes inactive records

- **WHEN** `findAll` is called for an organization
- **THEN** records with `status = INACTIVE` are not included in the results

### Requirement: Soft delete via DELETE endpoint

A `DELETE /:id` request without `?permanent=true` SHALL set the record's `status` to `INACTIVE` and return 204. The record MUST exist and be `ACTIVE`; otherwise the endpoint returns 404.

#### Scenario: Soft delete an active record

- **WHEN** `DELETE /:id` is called on an `ACTIVE` record by an Owner or Manager
- **THEN** the record's status becomes `INACTIVE` and the response is 204

#### Scenario: Soft delete an already-inactive record

- **WHEN** `DELETE /:id` is called on an `INACTIVE` record
- **THEN** the endpoint returns 404

### Requirement: Hard delete requires Owner role

A `DELETE /:id?permanent=true` request SHALL permanently remove the row. Only users with the `OWNER` role may perform this action.

#### Scenario: Non-Owner attempts permanent delete

- **WHEN** a `MANAGER` calls `DELETE /:id?permanent=true`
- **THEN** the endpoint returns 403 `forbidden`

#### Scenario: Owner performs permanent delete

- **WHEN** an `OWNER` calls `DELETE /:id?permanent=true`
- **THEN** the row is removed from the database and the response is 204

### Requirement: Hard delete operates regardless of status

A hard delete SHALL succeed whether the target record is `ACTIVE` or `INACTIVE`. It MUST return 404 only if the record does not exist in the organization at all.

#### Scenario: Hard delete a previously soft-deleted record

- **WHEN** an `OWNER` calls `DELETE /:id?permanent=true` on an `INACTIVE` record
- **THEN** the row is permanently removed and the response is 204

#### Scenario: Hard delete a non-existent record

- **WHEN** an `OWNER` calls `DELETE /:id?permanent=true` for an ID that does not exist
- **THEN** the endpoint returns 404

### Requirement: Status defaults to ACTIVE

Every new record created for `Customer` and `Organization` SHALL have `status = ACTIVE` by default. Existing rows MUST receive `ACTIVE` via the migration column default.

#### Scenario: New customer created

- **WHEN** a new customer is created
- **THEN** its `status` field is `ACTIVE`

### Requirement: Organizations have a DELETE endpoint

`DELETE /organizations/me` SHALL soft-delete the caller's organization by default, with the same `?permanent=true` Owner-only hard-delete option.

#### Scenario: Owner soft-deletes organization

- **WHEN** an `OWNER` calls `DELETE /organizations/me`
- **THEN** the organization's status becomes `INACTIVE`

#### Scenario: Non-Owner attempts to delete organization

- **WHEN** a `MANAGER` calls `DELETE /organizations/me`
- **THEN** the endpoint returns 403
