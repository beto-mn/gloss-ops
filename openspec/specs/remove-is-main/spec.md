# Spec: Remove isMain and Require branchId on Invitations

## Purpose

Defines the requirements for the `remove-is-main` capability in GlossOps.

## Requirements

### Requirement: branchId is required on invitation creation

`POST /organizations/invitations` SHALL require a `branchId` field in the request body. A missing or non-UUID `branchId` MUST return 400.

#### Scenario: Invitation without branchId

- **WHEN** `POST /organizations/invitations` is called without a `branchId`
- **THEN** the response is 400 with a validation error

#### Scenario: Invitation with valid branchId

- **WHEN** `POST /organizations/invitations` is called with a valid `branchId` belonging to the caller's org
- **THEN** the invitation is created and the response includes `invitationUrl`

### Requirement: branchId must belong to the caller's organization

The service SHALL validate that the `branchId` exists and belongs to the inviter's organization. A `branchId` from another organization or a non-existent branch MUST return 404 `branch_not_found`.

#### Scenario: branchId from another organization

- **WHEN** `POST /organizations/invitations` is called with a `branchId` that belongs to a different org
- **THEN** the response is 404 `branch_not_found`

#### Scenario: branchId does not exist

- **WHEN** `POST /organizations/invitations` is called with a `branchId` that does not exist
- **THEN** the response is 404 `branch_not_found`

### Requirement: branchId is persisted in the invitation payload

The `branchId` chosen by the inviter SHALL be stored in the invitation payload in Redis so it is available when the invitee accepts.

#### Scenario: Invitation payload contains branchId

- **WHEN** an invitation is created with a valid `branchId`
- **THEN** the stored payload includes the `branchId`

### Requirement: acceptInvitation uses the stored branchId

`POST /organizations/invitations/accept` SHALL create the `OrganizationMember` anchored to the `branchId` from the stored payload, not from a main-branch lookup.

#### Scenario: Accept invitation creates member on correct branch

- **WHEN** an invitation with `branchId: "branch-x"` is accepted
- **THEN** the new `OrganizationMember` has `branchId = "branch-x"`

### Requirement: addMember accepts branchId directly

The `OrganizationRepositoryInterface.addMember` method SHALL accept `branchId` as its first parameter and create the member directly without any internal branch lookup.

#### Scenario: addMember creates member for given branchId

- **WHEN** `addMember("branch-x", "account-1", Role.TECHNICIAN)` is called
- **THEN** an `OrganizationMember` with `branchId = "branch-x"` is created

### Requirement: Branch model has no isMain field

The `Branch` model SHALL NOT contain an `isMain` field. The schema, seed, and all in-memory implementations MUST be updated to remove any reference to `isMain`.

#### Scenario: createWithBranch produces a branch without isMain

- **WHEN** a new organization is registered via `createWithBranch`
- **THEN** the auto-created branch has no `isMain` property
