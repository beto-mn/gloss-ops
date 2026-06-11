## ADDED Requirements

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
