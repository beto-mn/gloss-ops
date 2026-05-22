# Proposal: Customers Module

## Why

There was no way to record or manage the clients of a shop — every work order and service operation depended on having customer records first.

## What Changes

- Added full CRUD for tenant-scoped customers: `POST /customers`, `GET /customers`, `GET /customers/:id`, `PATCH /customers/:id`, `DELETE /customers/:id`
- Added text search across `firstName+lastName` (concatenated), `email`, and `phone`
- Added pagination with `page`, `limit`, and response `meta` (total, totalPages, hasNext, hasPrev)
- Enforced email and phone uniqueness per organization at the service layer
- Added fiscal data fields (`taxId`, `fiscalRegime`, `zipCode`) as a flat block on the customer record
- Followed the repository pattern: `CustomerRepositoryInterface`, `InMemoryCustomerRepository`, `PrismaCustomerRepository`, DI token, service, controller, and module

## Capabilities

- `customers-module`: Tenant-scoped customer CRUD with paginated text search and per-org email/phone uniqueness

## Impact

- `apps/api/src/customers/` — new module (interfaces, infrastructure, DTOs, service, controller, module)
- `apps/api/tsconfig.paths.json` — `@customers`, `@customers/dto`, `@customers/interfaces` path aliases added
- `apps/api/src/app.module.ts` — CustomersModule registered
