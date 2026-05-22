# Design: Repository & Adapter Pattern

## Context

`AuthService` and `AuthGuard` depended directly on `PrismaService` and `RedisTokenStore`, requiring test authors to mock Prisma's query builder internals. This made tests brittle, tightly coupled business logic to infrastructure, and blocked the ability to swap data stores without touching services.

## Goals

- Decouple all domain services from concrete infrastructure via repository interfaces and NestJS DI tokens
- Provide `InMemoryAccountRepository` and `InMemoryTokenStore` as first-class test implementations
- Establish the pattern as the project standard for every future domain module
- Ensure `PrismaService` can only be injected in `infrastructure/` classes

## Non-Goals

- Full domain entity mapping (services use Prisma-derived types directly — Option A trade-off)
- Infrastructure-level testing of `PrismaAccountRepository` (covered by integration/e2e tests)
- Changing the database schema or `packages/database`

## Decisions

| Decision                  | Choice                                      | Reason                                                                       |
| ------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------- |
| Interface location        | `<module>/interfaces/` subfolder            | Keeps contracts co-located with the module that owns them                    |
| Injection tokens          | `Symbol` values in `<module>.tokens.ts`     | NestJS cannot inject TypeScript interfaces directly; symbols are unforgeable |
| In-memory implementations | Live in `infrastructure/`, not test files   | Reusable across multiple test suites without duplication                     |
| Return types              | Prisma-derived (`Prisma.AccountGetPayload`) | Avoids mapping layer overhead at MVP scale while still abstracting the query |

## Risks / Trade-offs

- Services remain coupled to Prisma-generated types (not pure domain objects) — acceptable for MVP, revisit if a non-Prisma adapter is ever needed
- In-memory implementations must be kept in sync with the interface contract; a drift would be caught by TypeScript at compile time
