# Repository & Adapter Pattern — Design Spec

**Date:** 2026-04-21
**Scope:** `apps/api` — all modules (auth + all future domain modules)
**Goal:** Decouple business logic from Prisma and Redis so the API is testable without infrastructure and can swap implementations without touching services.

---

## Problem

Currently, services and guards depend directly on concrete infrastructure classes:

- `AuthService` → `PrismaService`, `RedisTokenStore`
- `AuthGuard` → `PrismaService`, `TokenService`
- `TokenService` → `RedisTokenStore`

This makes unit testing hard (requires mocking Prisma internals), and tightly couples business logic to infrastructure choices.

---

## Approach: Repository Pattern

Introduce interfaces (contracts) between services and infrastructure. NestJS DI binds interfaces to concrete implementations at the module level. Services never know whether they're talking to Prisma, Redis, or an in-memory implementation.

`packages/database` remains unchanged — it is the infrastructure source of truth.

---

## Folder Structure

Each domain module follows this convention:

```
<module>/
  interfaces/
    <entity>.repository.interface.ts   ← contract (what operations exist)
    <store>.store.interface.ts         ← contract for external stores (cache, etc.)
    index.ts                           ← barrel export
  infrastructure/
    prisma-<entity>.repository.ts      ← Prisma implementation
    redis-<store>.store.ts             ← Redis implementation
    in-memory-<entity>.repository.ts  ← in-memory implementation for tests
    in-memory-<store>.store.ts
  <module>.tokens.ts                   ← DI injection token symbols
  <module>.service.ts                  ← depends on interfaces only
  <module>.module.ts                   ← binds interfaces to implementations
```

### Rule

`PrismaService` may only be injected inside `infrastructure/` classes. No service, guard, or controller imports it directly.

---

## Interface Definitions

### `AccountRepositoryInterface`

```ts
export interface AccountRepositoryInterface {
  findByEmail(email: string): Promise<Account | null>
  findByIdWithMemberships(id: string): Promise<AccountWithMemberships | null>
  create(data: CreateAccountData): Promise<Account>
}
```

Return types (`Account`, `AccountWithMemberships`) come from `@glossops/database`. This is the Option A trade-off: operation abstraction without full domain entity mapping.

### `TokenStoreInterface`

```ts
export interface TokenStoreInterface {
  save(accountId: string, tokenId: string, ttlDays: number): Promise<void>
  exists(accountId: string, tokenId: string): Promise<boolean>
  delete(accountId: string, tokenId: string): Promise<void>
}
```

---

## Naming Conventions

- Interfaces: `<Name>Interface` suffix — e.g., `AccountRepositoryInterface`, `TokenStoreInterface`
- Files: `<name>.repository.interface.ts`, `<name>.store.interface.ts`
- Injection tokens: `SCREAMING_SNAKE_CASE` symbols in `<module>.tokens.ts`
- Prisma implementations: `prisma-<entity>.repository.ts`
- In-memory implementations: `in-memory-<entity>.repository.ts`

---

## NestJS Dependency Injection

Interfaces cannot be injected directly in NestJS. Each module defines symbols as injection tokens:

```ts
// auth/auth.tokens.ts
export const ACCOUNT_REPOSITORY = Symbol('AccountRepositoryInterface')
export const TOKEN_STORE = Symbol('TokenStoreInterface')
```

Services receive them via `@Inject()`:

```ts
constructor(
  @Inject(ACCOUNT_REPOSITORY) private readonly accounts: AccountRepositoryInterface,
  @Inject(TOKEN_STORE) private readonly tokenStore: TokenStoreInterface,
)
```

The module binds tokens to concrete classes:

```ts
// auth.module.ts
providers: [
  { provide: ACCOUNT_REPOSITORY, useClass: PrismaAccountRepository },
  { provide: TOKEN_STORE, useClass: RedisTokenStore },
  AuthService,
  TokenService,
  AuthGuard,
]
```

For future modules the pattern is identical — each module owns its tokens and binds its own implementations.

---

## Dependency Chain

```
AuthModule
  imports: [PrismaModule, JwtModule]
  providers:
    ACCOUNT_REPOSITORY → PrismaAccountRepository  ← injects PrismaService
    TOKEN_STORE        → RedisTokenStore           ← constructs own Redis client
    AuthService        ← injects ACCOUNT_REPOSITORY + TOKEN_STORE
    TokenService       ← injects TOKEN_STORE
    AuthGuard          ← injects ACCOUNT_REPOSITORY + TokenService
```

---

## Testing Strategy

Tests replace concrete implementations with in-memory versions via NestJS test modules:

```ts
const module = await Test.createTestingModule({
  providers: [
    AuthService,
    { provide: ACCOUNT_REPOSITORY, useClass: InMemoryAccountRepository },
    { provide: TOKEN_STORE, useClass: InMemoryTokenStore },
  ],
}).compile()
```

### `InMemoryAccountRepository`

Stores accounts in a plain array. Implements `AccountRepositoryInterface`. Lives in `auth/infrastructure/`.

### `InMemoryTokenStore`

Stores tokens in a `Map<string, true>`. Implements `TokenStoreInterface`. Ignores `ttlDays` (no expiry in tests). Lives in `auth/infrastructure/`.

The existing `jest.mock('@glossops/database', ...)` calls in auth tests are removed and replaced with in-memory providers.

---

## Rollout Order

1. Formalize interfaces in `auth/interfaces/`
2. Create `auth/auth.tokens.ts`
3. Move `RedisTokenStore` to `auth/infrastructure/`, create `PrismaAccountRepository`
4. Create in-memory implementations
5. Refactor `AuthService`, `TokenService`, `AuthGuard` to use tokens
6. Update `AuthModule` providers
7. Rewrite auth unit tests
8. Document the pattern in `CLAUDE.md` as the standard for all future modules
