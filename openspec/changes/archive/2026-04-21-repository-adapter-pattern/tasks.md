# Tasks: Repository & Adapter Pattern

## 1. Define interfaces and injection tokens

- [ ] 1.1 Create account.repository.interface.ts with AccountRepositoryInterface, AccountWithMemberships, CreateAccountData
- [ ] 1.2 Create token.store.interface.ts with TokenStoreInterface
- [ ] 1.3 Create auth.tokens.ts with ACCOUNT_REPOSITORY and TOKEN_STORE symbols
- [ ] 1.4 Update interfaces/index.ts barrel
- [ ] 1.5 Verify TypeScript compiles

## 2. InMemoryTokenStore (TDD)

- [ ] 2.1 Write failing tests for InMemoryTokenStore
- [ ] 2.2 Run tests and confirm failure
- [ ] 2.3 Implement InMemoryTokenStore using a Map
- [ ] 2.4 Run tests and confirm all pass

## 3. InMemoryAccountRepository (TDD)

- [ ] 3.1 Write failing tests for InMemoryAccountRepository
- [ ] 3.2 Run tests and confirm failure
- [ ] 3.3 Implement InMemoryAccountRepository with seed, findByEmail, findByIdWithMemberships, create
- [ ] 3.4 Run tests and confirm all pass

## 4. PrismaAccountRepository

- [ ] 4.1 Create PrismaAccountRepository implementing AccountRepositoryInterface
- [ ] 4.2 Verify TypeScript compiles

## 5. Move RedisTokenStore to infrastructure/

- [ ] 5.1 Create infrastructure/redis-token.store.ts with implements TokenStoreInterface
- [ ] 5.2 Create infrastructure/redis-token.store.spec.ts with updated import path
- [ ] 5.3 Delete old auth/redis-token.store.ts and auth/redis-token.store.spec.ts
- [ ] 5.4 Run moved spec and confirm it passes

## 6. Refactor TokenService

- [ ] 6.1 Update token.service.ts to inject TOKEN_STORE instead of RedisTokenStore
- [ ] 6.2 Rewrite token.service.spec.ts using InMemoryTokenStore via TOKEN_STORE token
- [ ] 6.3 Run tests and confirm all pass

## 7. Refactor AuthService

- [ ] 7.1 Update auth.service.ts to inject ACCOUNT_REPOSITORY and TOKEN_STORE
- [ ] 7.2 Rewrite auth.service.spec.ts using InMemoryAccountRepository and InMemoryTokenStore
- [ ] 7.3 Run tests and confirm all pass

## 8. Refactor AuthGuard

- [ ] 8.1 Update auth.guard.ts to inject ACCOUNT_REPOSITORY instead of PrismaService
- [ ] 8.2 Rewrite auth.guard.spec.ts using InMemoryAccountRepository
- [ ] 8.3 Run tests and confirm all pass

## 9. Wire AuthModule and update barrel

- [ ] 9.1 Update auth.module.ts to bind ACCOUNT_REPOSITORY and TOKEN_STORE tokens to implementations
- [ ] 9.2 Update auth/index.ts to remove RedisTokenStore export
- [ ] 9.3 Run full test suite and confirm all pass

## 10. Document pattern in CLAUDE.md

- [ ] 10.1 Add repository pattern section to CLAUDE.md
- [ ] 10.2 Run full test suite to confirm no regressions
