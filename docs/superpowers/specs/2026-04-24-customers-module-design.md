# Customers Module — Design Spec

**Date:** 2026-04-24
**Status:** Approved

---

## Goal

Implement the `customers` module — full CRUD for tenant-scoped customers with text search, pagination, and uniqueness enforcement on email and phone per organization.

---

## Data Model

Works directly with `Prisma.CustomerModel` from the existing schema. Three domain types are defined:

```ts
interface CreateCustomerData {
  firstName: string
  lastName: string
  email?: string
  phone?: string
  address?: string
  taxId?: string
  fiscalRegime?: string
  zipCode?: string
  source?: string
  note?: string
}

interface UpdateCustomerData {
  firstName?: string
  lastName?: string
  email?: string | null
  phone?: string | null
  address?: string | null
  taxId?: string | null
  fiscalRegime?: string | null
  zipCode?: string | null
  source?: string | null
  note?: string | null
}

interface CustomerQuery {
  search?: string // matches firstName+lastName (concat), email, phone
  page: number // default 1
  limit: number // default 20, max 100
}

interface CustomerPage {
  data: Prisma.CustomerModel[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}
```

**Fiscal data** (`taxId`, `fiscalRegime`, `zipCode`) is a single flat block on the customer record — no separate fiscal profiles.

---

## Architecture

Follows the repository pattern established by the `organizations` module.

```
customers/
  interfaces/
    customer.repository.interface.ts   ← CustomerRepositoryInterface + all domain types
    index.ts                           ← barrel (types only)
  infrastructure/
    prisma-customer.repository.ts      ← Prisma implementation
    in-memory-customer.repository.ts   ← in-memory implementation for tests
    in-memory-customer.repository.spec.ts
  dto/
    create-customer.dto.ts             ← class-validator input validation
    update-customer.dto.ts
    list-customers.dto.ts              ← query params: search, page, limit
    index.ts
  customers.tokens.ts                  ← DI Symbol
  customers.service.ts                 ← business logic
  customers.service.spec.ts
  customers.controller.ts              ← HTTP layer
  customers.module.ts
  index.ts
```

**Dependency rules:**

- `PrismaService` only injected inside `prisma-customer.repository.ts`
- Service depends on `CustomerRepositoryInterface` via DI token — never on Prisma directly
- Controller delegates everything to the service

---

## Repository Interface

```ts
interface CustomerRepositoryInterface {
  create(
    organizationId: string,
    data: CreateCustomerData
  ): Promise<Prisma.CustomerModel>
  findById(
    id: string,
    organizationId: string
  ): Promise<Prisma.CustomerModel | null>
  findAll(organizationId: string, query: CustomerQuery): Promise<CustomerPage>
  findByEmail(
    email: string,
    organizationId: string
  ): Promise<Prisma.CustomerModel | null>
  findByPhone(
    phone: string,
    organizationId: string
  ): Promise<Prisma.CustomerModel | null>
  update(
    id: string,
    organizationId: string,
    data: UpdateCustomerData
  ): Promise<Prisma.CustomerModel>
  delete(id: string, organizationId: string): Promise<void>
}
```

`findByEmail` and `findByPhone` are used by the service to enforce uniqueness before create/update.

---

## API Endpoints

| Method   | Route            | Roles                      | Description                     |
| -------- | ---------------- | -------------------------- | ------------------------------- |
| `POST`   | `/customers`     | Owner, Manager, Front Desk | Create a customer               |
| `GET`    | `/customers`     | All                        | List with search and pagination |
| `GET`    | `/customers/:id` | All                        | Get one customer by ID          |
| `PATCH`  | `/customers/:id` | Owner, Manager, Front Desk | Update a customer               |
| `DELETE` | `/customers/:id` | Owner, Manager             | Delete a customer (returns 204) |

**Query params for `GET /customers`:**

```
GET /customers?search=ana&page=1&limit=20
```

- `search` — optional, case-insensitive match against `firstName+lastName` (concatenated), `email`, `phone`
- `page` — optional, default `1`
- `limit` — optional, default `20`, maximum `100`

---

## Business Rules

**Uniqueness enforcement (service layer):**

- Before `create`: if `email` is provided, check `findByEmail` — throw `ConflictException({ error: 'email_already_exists' })` if taken
- Before `create`: if `phone` is provided, check `findByPhone` — throw `ConflictException({ error: 'phone_already_exists' })` if taken
- Before `update`: same checks, but exclude the customer being updated from the uniqueness check

**Tenant isolation:**

- All repository methods accept `organizationId` and filter by it
- `findById` returns `null` if the ID exists but belongs to a different org

---

## Error Responses

| Situation                                        | HTTP | Body                                |
| ------------------------------------------------ | ---- | ----------------------------------- |
| Customer not found (or belongs to different org) | 404  | `{ error: 'customer_not_found' }`   |
| Email already exists in org                      | 409  | `{ error: 'email_already_exists' }` |
| Phone already exists in org                      | 409  | `{ error: 'phone_already_exists' }` |

---

## Testing Strategy

No Prisma mocks. All service tests use `InMemoryCustomerRepository`.

**`in-memory-customer.repository.spec.ts`:**

- `create` stores customer with correct `organizationId`
- `findById` returns `null` when ID belongs to a different org
- `findAll` only returns customers of the requested org
- `findAll` with `search` filters across name, email, phone
- `findAll` returns correct `meta` (total, totalPages, hasNext, hasPrev)
- `update` and `delete` reject when customer does not belong to org

**`customers.service.spec.ts`:**

- `create` throws `ConflictException` when email already exists in org
- `create` throws `ConflictException` when phone already exists in org
- `create` succeeds when email/phone are unique in org
- `findOne` throws `NotFoundException` when customer does not exist
- `update` throws `NotFoundException` when customer does not exist
- `update` throws `ConflictException` when updated email conflicts with another customer
- `update` throws `ConflictException` when updated phone conflicts with another customer
- `remove` throws `NotFoundException` when customer does not exist
- Happy path for each operation

---

## Module Wiring

- `CustomersModule` imports `PrismaModule`
- `CUSTOMER_REPOSITORY` token bound to `PrismaCustomerRepository`
- `CustomersModule` registered in `AppModule`
- Path aliases added to `tsconfig.paths.json`: `@customers`, `@customers/dto`, `@customers/interfaces`
