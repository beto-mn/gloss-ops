# Spec: organizations

## Purpose

Defines the requirements for the `organizations` capability in GlossOps.

## Requirements

### Requirement: Registration creates org, branch, and owner membership atomically

`POST /auth/register` SHALL create an `Account`, an `Organization`, a `Branch`, and an `OrganizationMember` with role `OWNER` in a single sequential operation when a unique email and slug are provided.

#### Scenario: Happy path registration with org

- **WHEN** a client sends a valid `RegisterDto` including `organizationName` and `organizationSlug`
- **THEN** account, organization, branch, and owner membership are created; tokens with `{ sub, email }` are returned

#### Scenario: Slug already taken

- **WHEN** a client registers with a `organizationSlug` that is already used by another org
- **THEN** the API returns `409` with `{ error: 'slug_already_taken' }`

---

### Requirement: Org context is resolved per-request from the X-Organization-Id header

`AuthGuard` MUST read the `X-Organization-Id` header, look up the `OrganizationMember` for `(accountId, organizationId)`, and populate `memberId`, `branchId`, and `role` in `AuthContext`.

#### Scenario: Valid org header populates full AuthContext

- **WHEN** an authenticated request includes a valid `X-Organization-Id` header for an org the caller belongs to
- **THEN** `AuthContext` is populated with `memberId`, `branchId`, `organizationId`, and `role`

#### Scenario: Not a member of the org

- **WHEN** an authenticated request includes an `X-Organization-Id` for an org the caller does not belong to
- **THEN** the API returns `403` with `{ error: 'not_a_member' }`

#### Scenario: Header absent

- **WHEN** an authenticated request omits `X-Organization-Id`
- **THEN** `AuthContext` has `organizationId: null`, `memberId: null`, `branchId: null`, `role: null`

---

### Requirement: Invitations are single-use Redis-backed tokens

`POST /organizations/invitations` MUST generate a UUID token, store it in Redis with a TTL, and return an invitation URL. The token MUST be deleted immediately after a successful `POST /organizations/invitations/accept`.

#### Scenario: Create invitation

- **WHEN** an OWNER or MANAGER sends a valid `{ email, role }` body with a valid `X-Organization-Id`
- **THEN** a UUID token is stored in Redis and `{ invitationUrl }` is returned

#### Scenario: Accept invitation — existing account

- **WHEN** a client posts a valid token and an account with the invitation email already exists
- **THEN** the account is added to the org and the token is deleted from Redis

#### Scenario: Accept invitation — new account

- **WHEN** a client posts a valid token with `firstName`, `lastName`, `password` and no account exists for the email
- **THEN** a new account is created, added to the org, and the token is deleted from Redis

#### Scenario: Expired or invalid token

- **WHEN** a client posts an unknown or expired invitation token
- **THEN** the API returns `400` with `{ error: 'invalid_invitation' }`

---

### Requirement: An account cannot belong to more than 5 organizations

`POST /organizations/invitations/accept` SHALL reject the request when the invitee already belongs to 5 organizations.

#### Scenario: Membership cap reached

- **WHEN** an invitation is accepted and the invitee already belongs to 5 orgs
- **THEN** the API returns `422` with `{ error: 'organization_limit_reached' }`

---

### Requirement: Organization data is scoped to authenticated members

`GET /organizations/me` and `GET /organizations/me/members` MUST return data only for the organization identified by the `X-Organization-Id` header.

#### Scenario: Get active org

- **WHEN** an authenticated member sends `GET /organizations/me` with a valid `X-Organization-Id`
- **THEN** the organization's details are returned

#### Scenario: Update org — restricted to OWNER or MANAGER

- **WHEN** a `TECHNICIAN` sends `PATCH /organizations/me`
- **THEN** the API returns `403` with `{ error: 'insufficient_role' }`

### Requirement: Organization deletion is soft-delete only

`DELETE /organizations/me` SHALL only soft-delete the organization (`status=DELETED`). There is no permanent / hard-delete option in the public API. The `permanent` query parameter — if present in a request — has no effect and is silently stripped by the validation pipe.

The `removeOrganization` service method SHALL NOT call `prisma.organization.delete(...)`. If a future GDPR-style "right to erasure" requirement appears, it will be designed as a separate, audited workflow — not a query-param toggle on the existing endpoint.

#### Scenario: Soft-delete returns 200 and marks the org

- **WHEN** an `OWNER` calls `DELETE /organizations/me`
- **THEN** the organization's `status` is set to `DELETED` and the response is `200` (or `204`)

#### Scenario: `permanent=true` is silently ignored

- **WHEN** an `OWNER` calls `DELETE /organizations/me?permanent=true`
- **THEN** the response is the same as the request without the flag — the organization is soft-deleted, NOT hard-deleted, and no child rows are removed

#### Scenario: Genuine not-found returns 404

- **WHEN** `DELETE /organizations/me` is invoked against an org id that does not exist for the caller
- **THEN** the response is `404 Not Found` with `{ error: 'organization_not_found' }`

#### Scenario: removeOrganization never calls prisma.organization.delete

- **WHEN** the service-layer code is inspected
- **THEN** no code path in `OrganizationsService.removeOrganization` calls `prisma.organization.delete(...)` — only the soft-delete repository method is used
