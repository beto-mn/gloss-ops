# Remove `isMain` and Require `branchId` on Invitations

## Context

Today an organization has exactly one "main" branch (`Branch.isMain = true`). The invitation flow leans on that flag: `OrganizationService.createInvitation` does not receive a `branchId`, and `addMember` internally looks up the branch with `isMain: true` to anchor the new `OrganizationMember` there.

That design does not match where the product is going: in real-world GlossOps an organization will have **multiple branches with no hierarchy** — there is no "main" branch. The owner/admin must explicitly pick which branch each invitee joins at invitation time.

This plan is a **prerequisite** for the upcoming `branches` module — before exposing a branches CRUD we must drop the `isMain` concept so the new module does not inherit a dead invariant.

**Expected outcome:**

- The `Branch.isMain` field is removed from the schema, seed, repositories, and in-memory model.
- `POST /organizations/invitations` requires `branchId`. The service validates that the branch exists and belongs to the inviter's organization (404 `branch_not_found` otherwise).
- `addMember` receives `branchId` directly (no main-branch lookup).
- The branch auto-created on organization registration still uses the organization's name (no `isMain` flag).
- Existing tests pass after the refactor.

---

## Files To Modify

### Schema & seed (`packages/database/`)

- **`prisma/schema.prisma`** — `Branch` model (`schema.prisma:177-197`): remove the line `isMain Boolean @default(false) @map("is_main")`.
- **New Prisma migration** — generate with `npx prisma migrate dev --name remove-branch-is-main` so it produces `ALTER TABLE branch DROP COLUMN is_main`.
- **`prisma/seed.ts:85,98`** — remove `isMain: true` and `isMain: false` from the two `prisma.branch.upsert` calls in the demo seed.

### Organizations interfaces (`apps/api/src/organizations/interfaces/`)

- **`organization.repository.interface.ts`**:
  - Change the `addMember` signature:
    ```ts
    addMember(
      branchId: string,
      accountId: string,
      role: Role
    ): Promise<Prisma.OrganizationMemberModel>
    ```
  - Add:
    ```ts
    findBranchById(
      branchId: string,
      organizationId: string
    ): Promise<Prisma.BranchModel | null>
    ```
- **`invitation.store.interface.ts`**:
  - `InvitationPayload` adds `branchId: string`.

### Organizations infrastructure (`apps/api/src/organizations/infrastructure/`)

- **`prisma-organization.repository.ts`**:
  - Line 67: in `createWithBranch`, drop `isMain: true` from the `data` object.
  - Lines 112-123: rewrite `addMember` to accept `branchId` and create the `OrganizationMember` directly without a `findFirst`.
  - Implement `findBranchById(branchId, organizationId)` with `prisma.branch.findFirst({ where: { id: branchId, organizationId } })`.
- **`in-memory-organization.repository.ts`**:
  - Line 110: drop `isMain: true` from the `BranchModel` literal.
  - Lines 175-194: rewrite `addMember` to accept `branchId`, validate it exists in `this.branches`, and create the member.
  - Implement `findBranchById` by scanning `this.branches`.
  - Confirm that `Prisma.BranchModel` (regenerated after the migration) no longer requires `isMain` — if TypeScript flags errors, run `prisma generate` before editing.

### Organizations service (`apps/api/src/organizations/`)

- **`organizations.service.ts`**:
  - `createInvitation(organizationId, email, role, branchId)`:
    1. `branch = organizations.findBranchById(branchId, organizationId)`
    2. If `null` → `throw new NotFoundException({ error: 'branch_not_found' })`.
    3. Persist payload (including `branchId`) in the invitation store.
  - `acceptInvitation`: read `branchId` from the payload and pass it to `addMember(branchId, account.id, role)`.

### Organizations DTO (`apps/api/src/organizations/dto/`)

- **`create-invitation.dto.ts`** — add:
  ```ts
  @ApiProperty({ example: 'd3f5...uuid' })
  @IsUUID()
  branchId: string
  ```
  Import `IsUUID` from `class-validator`.

### Organizations controller (`apps/api/src/organizations/`)

- **`organizations.controller.ts:96-102`** — pass `dto.branchId` through to the service:
  ```ts
  return this.orgService.createInvitation(
    account.organizationId!,
    dto.email,
    dto.role,
    dto.branchId
  )
  ```

### Tests

- **`organizations.service.spec.ts`** — update the `createInvitation`/`acceptInvitation` tests: pass `branchId`, assert 404 when the branch does not belong to the org, and assert that `addMember` is called with the `branchId` from the payload.
- **`in-memory-organization.repository.spec.ts`** — update `addMember` tests (now receives `branchId`), add tests for `findBranchById`, and remove any assertion that depends on `isMain`.
- **`organizations.controller.spec.ts`** — if it has invitation tests, propagate `branchId`.
- **`in-memory-invitation.store.spec.ts`** — confirm the payload includes `branchId` (likely just a fixture adjustment).

---

## Implementation Order

1. **Schema first**: edit `schema.prisma`, run the local migration, regenerate the Prisma client. TypeScript will break in every place that still references `isMain` — use those errors as the checklist.
2. **Interfaces**: update `OrganizationRepositoryInterface` (new `addMember` signature + new `findBranchById`) and `InvitationPayload`.
3. **Infrastructure**: adjust `prisma-organization.repository.ts` and `in-memory-organization.repository.ts` to implement the new signatures and remove `isMain` references.
4. **Service & DTO**: `createInvitation` accepts and validates `branchId`; the DTO requires it.
5. **Controller**: forward `branchId` from the DTO to the service.
6. **Seed**: drop the `isMain` keys from the seed.
7. **Tests**: update specs in order — in-memory repo → service → controller → invitation store.

---

## Verification

From the monorepo root:

```bash
# 1. Apply the migration and regenerate the client
cd packages/database && npx prisma migrate dev --name remove-branch-is-main && npx prisma generate

# 2. Lint + typecheck + tests for the API
cd ../../apps/api && npm run lint && npm run test
```

**Manual verification (curl or Swagger UI at `/api/docs`):**

1. Register a new org → confirm it creates Account + Org + 1 Branch (no `isMain`). Verify in the DB: `SELECT * FROM branch WHERE organization_id = '<id>'` should not include an `is_main` column.
2. `POST /organizations/invitations` **without** `branchId` → 400 (validation).
3. `POST /organizations/invitations` with a `branchId` from a **different** organization → 404 `branch_not_found`.
4. `POST /organizations/invitations` with a valid `branchId` from the current org → 200 with `invitationUrl`.
5. `POST /organizations/invitations/accept` with the token → the account becomes an `OrganizationMember` with the exact `branchId` from the payload (verify in the DB).
6. Verify the migration does not break the seed: `cd packages/database && npx prisma db seed`.

---

## Out of Scope (deferred to the next plan)

- Build the `branches/` module with its CRUD, DTOs, in-memory/Prisma repos, controller, and tests.
- `GET /branches` endpoint so the frontend can list branches and let the user pick one in the invitation form.
- Multi-branch business rules (e.g. prevent deleting the last branch, reassigning existing members across branches).
