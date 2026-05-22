# Design: Remove isMain and Require branchId on Invitations

## Context

The invitation flow assumed one "main" branch per organization: `addMember` did an internal `findFirst({ where: { organizationId, isMain: true } })` to determine where to anchor the new `OrganizationMember`. This worked only for single-branch organizations and broke the model needed for the branches CRUD module, where all branches are peers. The `isMain` flag was also polluting the in-memory models, the seed, and the Prisma schema with a concept that no longer existed in the domain.

## Goals

- Remove `Branch.isMain` from the schema, migration, seed, in-memory models, and all repository implementations
- Make `branchId` a required field on `POST /organizations/invitations`
- Add `findBranchById(branchId, organizationId)` for branch ownership validation
- Store `branchId` in the `InvitationPayload` so `acceptInvitation` can use the inviter's branch choice
- Preserve all existing invitation behaviors (membership cap, duplicate-member guard)

## Non-Goals

- The `branches/` CRUD module itself (separate spec/plan)
- `GET /branches` listing endpoint for the invitation form frontend
- Re-assigning existing `OrganizationMember` records to different branches
- Multi-branch business rules like preventing deletion of the last branch

## Decisions

- **`branchId` required, not optional** — an optional `branchId` would require a fallback to the main-branch lookup, perpetuating the dead concept. Making it required forces all callers to be explicit about branch assignment immediately.
- **Branch ownership validated in the service via `findBranchById`** — the service already validates other invitation preconditions; keeping branch validation there avoids splitting the invitation business logic between service and controller.
- **`findBranchById` added to `OrganizationRepositoryInterface`** rather than depending on a separate `BranchRepository` — the organizations module already owns the `Branch` queries needed for `createWithBranch`; adding one more query stays within the existing responsibility boundary.
- **`InvitationPayload` stores `branchId`** so the accept flow does not need to re-query the store or accept a new parameter; the choice made at invitation time is preserved atomically.

## Risks / Trade-offs

- Existing invitations in Redis at the time of deployment will not have `branchId` in their payload; accepting them after the deploy will fail. For MVP this is acceptable; a migration strategy (grace period, re-issue) can be added before production traffic.
- The auto-created branch at registration no longer carries a distinguishing flag. Code that previously relied on `isMain: true` to find "the" branch must now use the first branch by `createdAt` or accept an explicit `branchId` — this is the correct long-term behavior.
