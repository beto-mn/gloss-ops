# Remove `isMain` and Require `branchId` on Invitations — Design Spec

**Date:** 2026-04-28
**Status:** Draft

---

## Goal

Drop the `Branch.isMain` flag and the implicit "main branch" concept from the system. Inviting a member becomes an explicit choice: the owner/admin must pick which branch the invitee joins, by including a `branchId` in the invitation request. This change is a prerequisite for the upcoming `branches` CRUD module — without it, the new module would inherit a dead invariant ("exactly one main branch per organization") that no longer matches the product.

---

## Background

Today an organization has exactly one `Branch` with `isMain = true`. The invitation flow leans on that flag:

- `OrganizationService.createInvitation(organizationId, email, role)` does not receive a `branchId`.
- The invitation payload stored in Redis is `{ orgId, email, role }`.
- When the invitee accepts, `addMember(organizationId, accountId, role)` looks up the org's `isMain: true` branch and creates an `OrganizationMember` anchored to that branch.

In real-world GlossOps, an organization will have **multiple branches with no hierarchy**. The owner/admin must choose which branch each invitee belongs to at invitation time.

---

## Data Model

The `isMain` field is removed from `Branch`:

```prisma
model Branch {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organizationId String   @map("organization_id") @db.Uuid
  name           String
  address        String?
  phone          String?
  email          String?
  // isMain Boolean @default(false) @map("is_main")  // REMOVED
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")
  // …relations unchanged
}
```

A single Prisma migration drops the column:

```sql
ALTER TABLE branch DROP COLUMN is_main;
```

When a new organization is registered (`createWithBranch`), a single branch is auto-created with the organization's name. With `isMain` gone, that branch is simply "the first branch" — no flag distinguishes it. Subsequent branches added via the `branches` CRUD (next plan) will be peers.

---

## API Contract

### `POST /organizations/invitations`

`branchId` becomes a required field on the request body:

```ts
{
  email: string // existing
  role: Role // existing
  branchId: string // NEW — UUID of the target branch
}
```

| Situation                                                     | HTTP | Body                            |
| ------------------------------------------------------------- | ---- | ------------------------------- |
| Missing or non-UUID `branchId`                                | 400  | validation error                |
| `branchId` does not exist or belongs to a different org       | 404  | `{ error: 'branch_not_found' }` |
| Email already invited / already a member (existing behaviors) | 409  | (unchanged)                     |
| Success                                                       | 200  | `{ invitationUrl: string }`     |

The 404 message is uniform regardless of whether the branch is missing or belongs to another organization, so callers cannot probe foreign branch IDs.

### `POST /organizations/invitations/accept`

Request body shape is unchanged. Internally, the invitation payload retrieved from Redis now carries `branchId`, which is forwarded to `addMember`. The accepting account becomes an `OrganizationMember` anchored to the branch the inviter chose.

---

## Repository Layer

### Interface changes

```ts
interface OrganizationRepositoryInterface {
  // CHANGED: now keyed by branchId, not organizationId
  addMember(
    branchId: string,
    accountId: string,
    role: Role
  ): Promise<Prisma.OrganizationMemberModel>

  // NEW: validates a branch belongs to a given organization
  findBranchById(
    branchId: string,
    organizationId: string
  ): Promise<Prisma.BranchModel | null>

  // …existing methods unchanged
}
```

`findBranchById` is scoped by `organizationId` so the service can validate ownership in a single query.

### Prisma implementation

- `addMember(branchId, accountId, role)`: a direct `prisma.organizationMember.create({ data: { branchId, accountId, role } })`. The previous `findFirst({ where: { organizationId, isMain: true } })` is removed.
- `findBranchById(branchId, organizationId)`: `prisma.branch.findFirst({ where: { id: branchId, organizationId } })`.
- `createWithBranch`: drops the `isMain: true` literal — the auto-created branch carries no flag.

### In-memory implementation

- `addMember(branchId, …)`: validates `this.branches.has(branchId)`; if not, rejects.
- `findBranchById`: scans `this.branches` filtering by `id` and `organizationId`.
- `createWithBranch`: the seeded `BranchModel` literal no longer includes the `isMain` field.

### Invitation store

`InvitationPayload` gains a required `branchId`:

```ts
interface InvitationPayload {
  orgId: string
  email: string
  role: Role
  branchId: string // NEW
}
```

---

## Service Layer

`OrganizationService.createInvitation` becomes:

```ts
async createInvitation(
  organizationId: string,
  email: string,
  role: Role,
  branchId: string,
): Promise<{ invitationUrl: string }> {
  const branch = await this.organizations.findBranchById(branchId, organizationId)
  if (!branch) throw new NotFoundException({ error: 'branch_not_found' })

  const token = randomUUID()
  await this.invitationStore.save(
    token,
    { orgId: organizationId, email, role, branchId },
    envs.invitation.expiresInDays,
  )
  return { invitationUrl: `${envs.app.frontendUrl}/invitations/accept?token=${token}` }
}
```

`acceptInvitation` reads `branchId` from the payload and forwards it:

```ts
await this.organizations.addMember(payload.branchId, account.id, role)
```

The membership cap check (`countMembershipsByAccount`) and the existing duplicate-member guard (`findMember`) are unchanged.

---

## Controller Layer

```ts
@Post('invitations')
@Roles(Role.OWNER, Role.MANAGER)
createInvitation(
  @CurrentAccount() account: AuthContext,
  @Body() dto: CreateInvitationDto,
): Promise<{ invitationUrl: string }> {
  return this.orgService.createInvitation(
    account.organizationId!,
    dto.email,
    dto.role,
    dto.branchId,
  )
}
```

`CreateInvitationDto` adds:

```ts
@ApiProperty({ example: 'd3f5...uuid' })
@IsUUID()
branchId: string
```

---

## Error Responses

| Situation                                                         | HTTP | Body                            |
| ----------------------------------------------------------------- | ---- | ------------------------------- |
| `branchId` missing / not a UUID                                   | 400  | validation error                |
| `branchId` references a non-existent branch or one in another org | 404  | `{ error: 'branch_not_found' }` |
| Inviter is not Owner/Manager                                      | 403  | (existing `Roles` guard)        |

---

## Testing Strategy

No Prisma mocks. All service-level tests use `InMemoryOrganizationRepository`.

### In-memory repository spec

- `addMember` requires an existing `branchId`; rejects if the branch is not in `this.branches`.
- `addMember` creates a member anchored to the requested `branchId`, regardless of which branch was created first.
- `findBranchById` returns the branch when `(id, organizationId)` match.
- `findBranchById` returns `null` when the branch belongs to a different organization.
- `createWithBranch` produces a `BranchModel` without an `isMain` field.

### Service spec — `createInvitation`

- Success when `branchId` belongs to the inviter's organization.
- Throws `NotFoundException({ error: 'branch_not_found' })` when `branchId` does not exist.
- Throws `NotFoundException({ error: 'branch_not_found' })` when `branchId` belongs to a different org.
- Persists the payload with `branchId` in the invitation store.

### Service spec — `acceptInvitation`

- Calls `addMember` with the exact `branchId` from the stored payload.
- Membership cap and duplicate-member checks remain in force.

### Controller spec

- DTO validation rejects requests without `branchId` (400).

---

## Out of Scope

- The `branches/` module CRUD itself (separate spec/plan).
- A `GET /branches` listing endpoint for the frontend invitation form (separate spec/plan).
- Re-assigning existing members across branches (no migration of historical members; they keep whatever branch they were on).
- Multi-branch business rules such as "cannot delete the last branch" — handled when the `branches` CRUD lands.

---

## Files Changed

| Action        | File                                                                                  |
| ------------- | ------------------------------------------------------------------------------------- |
| Modify        | `packages/database/prisma/schema.prisma`                                              |
| New migration | `packages/database/prisma/migrations/…remove-branch-is-main/`                         |
| Modify        | `packages/database/prisma/seed.ts`                                                    |
| Modify        | `apps/api/src/organizations/interfaces/organization.repository.interface.ts`          |
| Modify        | `apps/api/src/organizations/interfaces/invitation.store.interface.ts`                 |
| Modify        | `apps/api/src/organizations/infrastructure/prisma-organization.repository.ts`         |
| Modify        | `apps/api/src/organizations/infrastructure/in-memory-organization.repository.ts`      |
| Modify        | `apps/api/src/organizations/infrastructure/in-memory-organization.repository.spec.ts` |
| Modify        | `apps/api/src/organizations/dto/create-invitation.dto.ts`                             |
| Modify        | `apps/api/src/organizations/organizations.service.ts`                                 |
| Modify        | `apps/api/src/organizations/organizations.service.spec.ts`                            |
| Modify        | `apps/api/src/organizations/organizations.controller.ts`                              |
| Modify        | `apps/api/src/organizations/organizations.controller.spec.ts`                         |
