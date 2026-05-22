# Proposal: Remove isMain and Require branchId on Invitations

## Why

The `Branch.isMain` flag encoded a "main branch" concept that no longer matches the product: in real-world GlossOps, an organization will have multiple peer branches. The flag was a prerequisite dependency blocking the branches CRUD module, and the invitation flow needed an explicit `branchId` choice rather than an implicit main-branch lookup.

## What Changes

- Dropped `Branch.isMain` column from schema, migration, seed, and all in-memory models
- Added `branchId` as a required field on `POST /organizations/invitations`
- Added `findBranchById(branchId, organizationId)` to `OrganizationRepositoryInterface`
- Changed `addMember` signature to accept `branchId` directly (removed internal `isMain` lookup)
- Added `branchId` to `InvitationPayload` stored in Redis
- Updated `OrganizationsService.createInvitation` to validate branch ownership and persist `branchId`
- Updated `OrganizationsService.acceptInvitation` to forward `branchId` from the payload to `addMember`

## Capabilities

- `remove-is-main`: Drop the `isMain` branch concept and make branch assignment explicit on every invitation

## Impact

- `packages/database/prisma/schema.prisma`
- `packages/database/prisma/migrations/`
- `packages/database/prisma/seed.ts`
- `apps/api/src/organizations/interfaces/organization.repository.interface.ts`
- `apps/api/src/organizations/interfaces/invitation.store.interface.ts`
- `apps/api/src/organizations/infrastructure/prisma-organization.repository.ts`
- `apps/api/src/organizations/infrastructure/in-memory-organization.repository.ts`
- `apps/api/src/organizations/infrastructure/in-memory-organization.repository.spec.ts`
- `apps/api/src/organizations/dto/create-invitation.dto.ts`
- `apps/api/src/organizations/organizations.service.ts`
- `apps/api/src/organizations/organizations.service.spec.ts`
- `apps/api/src/organizations/organizations.controller.ts`
- `apps/api/src/organizations/organizations.controller.spec.ts`
