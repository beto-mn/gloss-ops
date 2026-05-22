# Proposal: Repository & Adapter Pattern

## Why

`AuthService`, `AuthGuard`, and `TokenService` depended directly on `PrismaService` and `RedisTokenStore`, making unit tests require mocking Prisma internals and tightly coupling business logic to infrastructure choices.

## What Changes

- Introduced `AccountRepositoryInterface` and `TokenStoreInterface` as contracts between services and infrastructure
- Added `ACCOUNT_REPOSITORY` and `TOKEN_STORE` NestJS injection tokens in `auth.tokens.ts`
- Created `PrismaAccountRepository` as the Prisma implementation of `AccountRepositoryInterface`
- Moved `RedisTokenStore` to `auth/infrastructure/` with `implements TokenStoreInterface`
- Created `InMemoryAccountRepository` and `InMemoryTokenStore` for test-only use
- Refactored `AuthService`, `TokenService`, and `AuthGuard` to depend on interfaces via tokens
- Rewrote all auth unit tests to use in-memory implementations — no Prisma/Redis mocks
- Documented the repository pattern in `CLAUDE.md` as the standard for all future modules

## Capabilities

- `repository-adapter-pattern`: Decoupled infrastructure adapter pattern using NestJS DI tokens, repository interfaces, and in-memory test implementations

## Impact

- `apps/api/src/auth/interfaces/` — new `AccountRepositoryInterface`, `TokenStoreInterface`
- `apps/api/src/auth/auth.tokens.ts` — new injection token symbols
- `apps/api/src/auth/infrastructure/` — new `PrismaAccountRepository`, `InMemoryAccountRepository`, `InMemoryTokenStore`; moved `RedisTokenStore`
- `apps/api/src/auth/auth.service.ts`, `token.service.ts`, `guards/auth.guard.ts` — refactored to inject via tokens
- `apps/api/src/auth/auth.module.ts` — updated provider bindings
- `CLAUDE.md` — repository pattern documented as project standard
