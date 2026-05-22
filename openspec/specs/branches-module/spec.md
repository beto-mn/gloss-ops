# Spec: Branches Module

## Purpose

Defines the requirements for the `branches-module` capability in GlossOps.

## Requirements

### Requirement: Create branch with unique name

`POST /branches` SHALL create a new branch scoped to the caller's organization. The branch name MUST be unique among ACTIVE branches in the organization; a duplicate name returns 409.

#### Scenario: Create branch with a new name

- **WHEN** an Owner or Manager posts `{ name: "Sucursal Norte" }` and no ACTIVE branch with that name exists
- **THEN** the branch is created with `status = ACTIVE` and the response is 201

#### Scenario: Create branch with duplicate name

- **WHEN** an Owner or Manager posts a name already used by an ACTIVE branch in the org
- **THEN** the response is 409 `branch_name_taken`

### Requirement: List branches with status filter

`GET /branches` SHALL return a paginated list of branches scoped to the caller's organization. The `status` query parameter MUST accept `ACTIVE`, `DELETED`, or `ALL`; the default is `ACTIVE`.

#### Scenario: List defaults to ACTIVE

- **WHEN** `GET /branches` is called without a `status` parameter
- **THEN** only `ACTIVE` branches are returned

#### Scenario: List with DELETED filter

- **WHEN** `GET /branches?status=DELETED` is called
- **THEN** only soft-deleted branches are returned

### Requirement: Read branch returns 404 for deleted or foreign branches

`GET /branches/:id` SHALL return 404 for any branch that is missing, belongs to another organization, or has `status = DELETED`. The 404 message is uniform so callers cannot probe foreign or deleted IDs.

#### Scenario: Read an active branch

- **WHEN** `GET /branches/:id` is called for an ACTIVE branch in the caller's org
- **THEN** the branch is returned with 200

#### Scenario: Read a deleted branch

- **WHEN** `GET /branches/:id` is called for a DELETED branch
- **THEN** the response is 404 `branch_not_found`

### Requirement: Soft delete protects the last ACTIVE branch

`DELETE /branches/:id` SHALL soft-delete the branch by setting `status = DELETED` and `deletedAt = now()`. If the branch is the last ACTIVE branch in the organization, the request MUST be rejected with 422.

#### Scenario: Delete a branch when multiple active branches exist

- **WHEN** an Owner or Manager calls `DELETE /branches/:id` and the org has more than one ACTIVE branch
- **THEN** the branch is soft-deleted and the response is 204

#### Scenario: Delete the last ACTIVE branch

- **WHEN** an Owner or Manager calls `DELETE /branches/:id` and it is the only ACTIVE branch
- **THEN** the response is 422 `cannot_delete_last_branch`

### Requirement: Cron cleanup hard-deletes expired branches

`BranchCleanupService` SHALL run daily and permanently delete any branch with `status = DELETED` and `deletedAt` older than 30 days. Hard-deleting a branch MUST cascade to its `OrganizationMember` rows.

#### Scenario: Cleanup deletes expired branch

- **WHEN** the cleanup job runs and a branch has `deletedAt` older than 30 days
- **THEN** the branch row is permanently removed along with its `OrganizationMember` rows

#### Scenario: Cleanup skips recently deleted branch

- **WHEN** the cleanup job runs and a branch has `deletedAt` within the last 30 days
- **THEN** the branch is not deleted

### Requirement: RBAC on mutating endpoints

Create, update, and delete MUST require `OWNER` or `MANAGER` role. List and read are accessible to any authenticated member.

#### Scenario: Technician attempts to create a branch

- **WHEN** a `TECHNICIAN` calls `POST /branches`
- **THEN** the response is 403
