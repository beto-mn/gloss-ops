# Tasks: Remove isMain and Require branchId on Invitations

## 1. Schema and seed

- [x] 1.1 Remove `isMain` field from `Branch` model in `schema.prisma`
- [x] 1.2 Run migration `remove-branch-is-main`
- [x] 1.3 Remove `isMain: true` and `isMain: false` from the two `branch.upsert` calls in `seed.ts`
- [x] 1.4 Rebuild the database package to update generated types

## 2. Interfaces

- [x] 2.1 Update `OrganizationRepositoryInterface.addMember` signature to accept `branchId` directly
- [x] 2.2 Add `findBranchById(branchId, organizationId)` to `OrganizationRepositoryInterface`
- [x] 2.3 Add `branchId: string` to `InvitationPayload` in `invitation.store.interface.ts`

## 3. Infrastructure

- [x] 3.1 Update `prisma-organization.repository.ts`: drop `isMain: true` from `createWithBranch`
- [x] 3.2 Update `prisma-organization.repository.ts`: rewrite `addMember` to accept `branchId` directly
- [x] 3.3 Implement `findBranchById` in `prisma-organization.repository.ts`
- [x] 3.4 Update `in-memory-organization.repository.ts`: drop `isMain` from `BranchModel` literal
- [x] 3.5 Update `in-memory-organization.repository.ts`: rewrite `addMember` with `branchId` and branch existence check
- [x] 3.6 Implement `findBranchById` in `in-memory-organization.repository.ts`

## 4. Service and DTO

- [x] 4.1 Update `CreateInvitationDto` to add `@IsUUID() branchId: string`
- [x] 4.2 Update `createInvitation` in `organizations.service.ts` to accept and validate `branchId`
- [x] 4.3 Update `acceptInvitation` in `organizations.service.ts` to forward `branchId` from payload

## 5. Controller

- [x] 5.1 Update `organizations.controller.ts` to pass `dto.branchId` to `createInvitation`

## 6. Tests

- [x] 6.1 Update `in-memory-organization.repository.spec.ts`: fix `addMember` tests, add `findBranchById` tests, remove `isMain` assertions
- [x] 6.2 Update `organizations.service.spec.ts`: pass `branchId` in `createInvitation`/`acceptInvitation` tests, add 404 branch-not-found cases
- [x] 6.3 Update `organizations.controller.spec.ts`: propagate `branchId` in invitation tests
- [x] 6.4 Update `in-memory-invitation.store.spec.ts`: confirm payload includes `branchId`
- [x] 6.5 Run full test suite to verify all suites pass
