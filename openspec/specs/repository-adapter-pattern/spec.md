# Spec: repository-adapter-pattern

## Purpose

Defines the requirements for the `repository-adapter-pattern` capability in GlossOps.

## Requirements

### Requirement: Services depend only on interfaces, never on infrastructure classes

All domain services and guards MUST inject repository and store dependencies via NestJS tokens bound to interfaces, never via concrete `PrismaService` or `RedisTokenStore` classes directly.

#### Scenario: Service uses interface injection

- **WHEN** a service is constructed via NestJS DI
- **THEN** it receives an implementation bound to the interface token, not the concrete class

---

### Requirement: PrismaService is restricted to infrastructure classes

`PrismaService` SHALL only be injected inside `infrastructure/` classes. No service, guard, or controller may import it directly.

#### Scenario: Infrastructure class uses PrismaService

- **WHEN** `PrismaAccountRepository` is resolved
- **THEN** `PrismaService` is injected and used to execute queries

#### Scenario: Service cannot reference PrismaService

- **WHEN** `AuthService` is tested
- **THEN** no Prisma mock is needed — only `InMemoryAccountRepository` via `ACCOUNT_REPOSITORY` token

---

### Requirement: In-memory implementations replace all Prisma and Redis mocks in tests

Tests MUST bind in-memory implementations to injection tokens instead of mocking infrastructure internals.

#### Scenario: Service test with in-memory repository

- **WHEN** `AuthService` tests are set up
- **THEN** `{ provide: ACCOUNT_REPOSITORY, useClass: InMemoryAccountRepository }` is bound, and no `jest.mock` for Prisma is needed

#### Scenario: In-memory token store ignores TTL

- **WHEN** `InMemoryTokenStore.save` is called with any `ttlDays`
- **THEN** the token is stored without expiry for the duration of the test

---

### Requirement: Injection tokens are defined in a dedicated tokens file per module

Each module MUST define its injection token symbols in a `<module>.tokens.ts` file using `SCREAMING_SNAKE_CASE` names.

#### Scenario: Token symbol is defined

- **WHEN** `auth.tokens.ts` is imported
- **THEN** it exports `ACCOUNT_REPOSITORY` and `TOKEN_STORE` as unique `Symbol` values

---

### Requirement: Interface names use the Interface suffix

All repository and store interface types SHALL be named with an `Interface` suffix.

#### Scenario: Naming convention

- **WHEN** a new repository contract is created
- **THEN** it is named `<Entity>RepositoryInterface` and lives in `interfaces/<entity>.repository.interface.ts`
