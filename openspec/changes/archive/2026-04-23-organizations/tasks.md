# Tasks: Organizations Module

## 1. Config — env vars and path aliases

- [ ] 1.1 Add INVITATION_EXPIRES_IN_DAYS and APP_FRONTEND_URL to envs.ts
- [ ] 1.2 Add @organizations/\* path aliases to tsconfig.paths.json
- [ ] 1.3 Add Jest module name mapper entries for @organizations/\* to package.json

## 2. Simplify JWT payload and TokenService

- [ ] 2.1 Update token.service.spec.ts with failing tests for new signature
- [ ] 2.2 Run tests and confirm failures
- [ ] 2.3 Update jwt-payload.interface.ts to replace memberId with email
- [ ] 2.4 Update token.service.ts with issueTokens(accountId, email) and rotateTokens(accountId, tokenId, email)
- [ ] 2.5 Run tests and confirm all pass

## 3. Simplify AccountRepositoryInterface and InMemoryAccountRepository

- [ ] 3.1 Update in-memory-account.repository.spec.ts with failing tests
- [ ] 3.2 Run tests and confirm failures
- [ ] 3.3 Update account.repository.interface.ts — remove AccountWithMemberships, replace findByIdWithMemberships with findById
- [ ] 3.4 Update interfaces/index.ts
- [ ] 3.5 Update in-memory-account.repository.ts
- [ ] 3.6 Update prisma-account.repository.ts
- [ ] 3.7 Run tests and confirm all pass

## 4. Organization and Invitation interfaces

- [ ] 4.1 Create organization.repository.interface.ts with all types and OrganizationRepositoryInterface
- [ ] 4.2 Create invitation.store.interface.ts with InvitationPayload and InvitationStoreInterface
- [ ] 4.3 Create organizations/interfaces/index.ts barrel
- [ ] 4.4 Create organizations.tokens.ts with ORGANIZATION_REPOSITORY and INVITATION_STORE

## 5. InMemoryOrganizationRepository (TDD)

- [ ] 5.1 Write failing tests for InMemoryOrganizationRepository
- [ ] 5.2 Run tests and confirm failures
- [ ] 5.3 Implement InMemoryOrganizationRepository
- [ ] 5.4 Run tests and confirm all pass

## 6. InMemoryInvitationStore (TDD)

- [ ] 6.1 Write failing tests for InMemoryInvitationStore
- [ ] 6.2 Run tests and confirm failures
- [ ] 6.3 Implement InMemoryInvitationStore using a Map
- [ ] 6.4 Run tests and confirm all pass

## 7. Update RegisterDto and AuthService

- [ ] 7.1 Update auth.service.spec.ts with new register behavior and org assertions
- [ ] 7.2 Run tests and confirm failures
- [ ] 7.3 Update register.dto.ts to add organizationName and organizationSlug
- [ ] 7.4 Update auth.service.ts to call OrganizationRepository.createWithBranch after account creation
- [ ] 7.5 Run tests and confirm all pass

## 8. Update AuthGuard

- [ ] 8.1 Rewrite auth.guard.spec.ts for X-Organization-Id header logic
- [ ] 8.2 Run tests and confirm failures
- [ ] 8.3 Update auth.guard.ts to read X-Organization-Id and resolve OrganizationMember
- [ ] 8.4 Run tests and confirm all pass

## 9. OrganizationService (TDD)

- [ ] 9.1 Write failing tests for OrganizationsService
- [ ] 9.2 Run tests and confirm failures
- [ ] 9.3 Implement OrganizationsService with getMyOrganization, updateOrganization, listMembers, createInvitation, acceptInvitation
- [ ] 9.4 Run tests and confirm all pass

## 10. OrganizationController and DTOs

- [ ] 10.1 Create DTOs: UpdateOrgDto, CreateInvitationDto, AcceptInvitationDto
- [ ] 10.2 Create organizations.controller.ts with all six endpoints

## 11. Prisma and Redis infrastructure implementations

- [ ] 11.1 Create prisma-organization.repository.ts
- [ ] 11.2 Create redis-invitation.store.ts

## 12. Wire up modules and barrel exports

- [ ] 12.1 Create organizations.module.ts with forwardRef(AuthModule) and provider bindings
- [ ] 12.2 Create organizations/index.ts barrel
- [ ] 12.3 Update auth.module.ts to use forwardRef(OrganizationsModule) and export ACCOUNT_REPOSITORY
- [ ] 12.4 Update app.module.ts to import OrganizationsModule
- [ ] 12.5 Run all tests and confirm full pass
