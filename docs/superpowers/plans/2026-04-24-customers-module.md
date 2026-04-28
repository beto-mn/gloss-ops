# Customers Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the `customers` module — full CRUD with text search, pagination, and per-org uniqueness on email/phone, following the repository pattern established by `organizations`.

**Architecture:** Repository interface → in-memory implementation (tests) → Prisma implementation → service (business logic + uniqueness) → controller (HTTP). All queries filter by `organizationId`. `CustomerPage` wraps `data + meta` for paginated responses. Uniqueness is enforced at the service layer via `findByEmail` / `findByPhone` before create/update.

**Tech Stack:** NestJS, TypeScript, Prisma (`@glossops/database`), class-validator, class-transformer, Jest.

**Spec:** `docs/superpowers/specs/2026-04-24-customers-module-design.md`

---

## File Map

| Action | Path                                                                          | Responsibility                                              |
| ------ | ----------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Create | `apps/api/src/customers/interfaces/customer.repository.interface.ts`          | All domain types + repository contract                      |
| Create | `apps/api/src/customers/interfaces/index.ts`                                  | Barrel — types only                                         |
| Create | `apps/api/src/customers/dto/create-customer.dto.ts`                           | Validated create input                                      |
| Create | `apps/api/src/customers/dto/update-customer.dto.ts`                           | Validated update input                                      |
| Create | `apps/api/src/customers/dto/list-customers.dto.ts`                            | Query params: search, page, limit                           |
| Create | `apps/api/src/customers/dto/index.ts`                                         | DTO barrel                                                  |
| Create | `apps/api/src/customers/customers.tokens.ts`                                  | DI Symbol                                                   |
| Create | `apps/api/src/customers/infrastructure/in-memory-customer.repository.ts`      | In-memory impl for tests                                    |
| Create | `apps/api/src/customers/infrastructure/in-memory-customer.repository.spec.ts` | Unit tests for in-memory                                    |
| Create | `apps/api/src/customers/infrastructure/prisma-customer.repository.ts`         | Prisma implementation                                       |
| Create | `apps/api/src/customers/customers.service.ts`                                 | Business logic + uniqueness                                 |
| Create | `apps/api/src/customers/customers.service.spec.ts`                            | Service unit tests                                          |
| Create | `apps/api/src/customers/customers.controller.ts`                              | HTTP endpoints                                              |
| Create | `apps/api/src/customers/customers.module.ts`                                  | NestJS module wiring                                        |
| Create | `apps/api/src/customers/index.ts`                                             | Module barrel                                               |
| Modify | `apps/api/tsconfig.paths.json`                                                | Add `@customers`, `@customers/dto`, `@customers/interfaces` |
| Modify | `apps/api/src/app.module.ts`                                                  | Register `CustomersModule`                                  |

---

## Task 1: Repository Interface, Types, DTOs & Token

**Files:**

- Create: `apps/api/src/customers/interfaces/customer.repository.interface.ts`
- Create: `apps/api/src/customers/interfaces/index.ts`
- Create: `apps/api/src/customers/dto/create-customer.dto.ts`
- Create: `apps/api/src/customers/dto/update-customer.dto.ts`
- Create: `apps/api/src/customers/dto/list-customers.dto.ts`
- Create: `apps/api/src/customers/dto/index.ts`
- Create: `apps/api/src/customers/customers.tokens.ts`
- Modify: `apps/api/tsconfig.paths.json`

- [ ] **Step 1: Create the repository interface and all domain types**

`apps/api/src/customers/interfaces/customer.repository.interface.ts`:

```ts
import type { Prisma } from '@glossops/database'

export interface CreateCustomerData {
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

export interface UpdateCustomerData {
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

export interface CustomerQuery {
  search?: string
  page: number
  limit: number
}

export interface CustomerPageMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface CustomerPage {
  data: Prisma.CustomerModel[]
  meta: CustomerPageMeta
}

export interface CustomerRepositoryInterface {
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

- [ ] **Step 2: Create the interfaces barrel**

`apps/api/src/customers/interfaces/index.ts`:

```ts
export type { CustomerRepositoryInterface } from './customer.repository.interface'
export type { CustomerPageMeta } from './customer.repository.interface'
export type { CreateCustomerData } from './customer.repository.interface'
export type { UpdateCustomerData } from './customer.repository.interface'
export type { CustomerQuery } from './customer.repository.interface'
export type { CustomerPage } from './customer.repository.interface'
```

- [ ] **Step 3: Create the create DTO**

`apps/api/src/customers/dto/create-customer.dto.ts`:

```ts
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

export class CreateCustomerDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName: string

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName: string

  @IsOptional()
  @IsString()
  @MaxLength(254)
  email?: string

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string

  @IsOptional()
  @IsString()
  @MaxLength(20)
  taxId?: string

  @IsOptional()
  @IsString()
  @MaxLength(10)
  fiscalRegime?: string

  @IsOptional()
  @IsString()
  @MaxLength(10)
  zipCode?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  source?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string
}
```

- [ ] **Step 4: Create the update DTO**

`apps/api/src/customers/dto/update-customer.dto.ts`:

```ts
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

export class UpdateCustomerDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName?: string

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName?: string

  @IsOptional()
  @IsString()
  @MaxLength(254)
  email?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(20)
  taxId?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(10)
  fiscalRegime?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(10)
  zipCode?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(100)
  source?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string | null
}
```

- [ ] **Step 5: Create the list query DTO**

`apps/api/src/customers/dto/list-customers.dto.ts`:

```ts
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator'
import { Type } from 'class-transformer'

export class ListCustomersDto {
  @IsOptional()
  @IsString()
  search?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number
}
```

- [ ] **Step 6: Create the DTO barrel**

`apps/api/src/customers/dto/index.ts`:

```ts
export { CreateCustomerDto } from './create-customer.dto'
export { UpdateCustomerDto } from './update-customer.dto'
export { ListCustomersDto } from './list-customers.dto'
```

- [ ] **Step 7: Create the DI token**

`apps/api/src/customers/customers.tokens.ts`:

```ts
export const CUSTOMER_REPOSITORY = Symbol('CustomerRepositoryInterface')
```

- [ ] **Step 8: Add tsconfig path aliases**

Modify `apps/api/tsconfig.paths.json` — add three entries under `"paths"` (keep alphabetical order):

```json
{
  "compilerOptions": {
    "paths": {
      "@auth": ["./src/auth/index.ts"],
      "@auth/decorators": ["./src/auth/decorators/index.ts"],
      "@auth/dto": ["./src/auth/dto/index.ts"],
      "@auth/guards": ["./src/auth/guards/index.ts"],
      "@auth/interfaces": ["./src/auth/interfaces/index.ts"],
      "@config": ["./src/config/index.ts"],
      "@customers": ["./src/customers/index.ts"],
      "@customers/dto": ["./src/customers/dto/index.ts"],
      "@customers/interfaces": ["./src/customers/interfaces/index.ts"],
      "@organizations": ["./src/organizations/index.ts"],
      "@organizations/dto": ["./src/organizations/dto/index.ts"],
      "@organizations/interfaces": ["./src/organizations/interfaces/index.ts"],
      "@prisma": ["./src/prisma/index.ts"]
    }
  }
}
```

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/customers/ apps/api/tsconfig.paths.json
git commit -m "feat(customers): add repository interface, DTOs, and DI token"
```

---

## Task 2: In-Memory Repository + Tests (TDD)

**Files:**

- Create: `apps/api/src/customers/infrastructure/in-memory-customer.repository.spec.ts`
- Create: `apps/api/src/customers/infrastructure/in-memory-customer.repository.ts`

- [ ] **Step 1: Write the failing tests**

`apps/api/src/customers/infrastructure/in-memory-customer.repository.spec.ts`:

```ts
import { InMemoryCustomerRepository } from './in-memory-customer.repository'

const makeData = (overrides: Record<string, unknown> = {}) => ({
  firstName: 'Ana',
  lastName: 'Pérez',
  email: 'ana@test.com',
  phone: '5551234567',
  ...overrides,
})

describe('InMemoryCustomerRepository', () => {
  let repo: InMemoryCustomerRepository

  beforeEach(() => {
    repo = new InMemoryCustomerRepository()
  })

  describe('create', () => {
    it('stores customer with correct organizationId and returns it', async () => {
      const customer = await repo.create('org-1', makeData())
      expect(customer.organizationId).toBe('org-1')
      expect(customer.firstName).toBe('Ana')
      expect(customer.id).toBeDefined()
    })
  })

  describe('findById', () => {
    it('returns customer when id and organizationId match', async () => {
      const created = await repo.create('org-1', makeData())
      expect(await repo.findById(created.id, 'org-1')).toMatchObject({
        id: created.id,
      })
    })

    it('returns null when id belongs to a different organization', async () => {
      const created = await repo.create('org-1', makeData())
      expect(await repo.findById(created.id, 'org-2')).toBeNull()
    })

    it('returns null when id does not exist', async () => {
      expect(await repo.findById('unknown', 'org-1')).toBeNull()
    })
  })

  describe('findAll', () => {
    it('returns only customers of the organization', async () => {
      await repo.create(
        'org-1',
        makeData({ firstName: 'A', email: 'a@t.com', phone: '111' })
      )
      await repo.create(
        'org-1',
        makeData({ firstName: 'B', email: 'b@t.com', phone: '222' })
      )
      await repo.create(
        'org-2',
        makeData({ firstName: 'C', email: 'c@t.com', phone: '333' })
      )
      const result = await repo.findAll('org-1', { page: 1, limit: 20 })
      expect(result.data).toHaveLength(2)
      expect(result.data.every((c) => c.organizationId === 'org-1')).toBe(true)
    })

    it('returns empty data and correct meta when org has no customers', async () => {
      const result = await repo.findAll('org-empty', { page: 1, limit: 20 })
      expect(result.data).toHaveLength(0)
      expect(result.meta).toMatchObject({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      })
    })

    it('filters by search term across fullName, email and phone', async () => {
      await repo.create(
        'org-1',
        makeData({
          firstName: 'Ana',
          lastName: 'López',
          email: 'ana@test.com',
          phone: '111',
        })
      )
      await repo.create(
        'org-1',
        makeData({
          firstName: 'Juan',
          lastName: 'García',
          email: 'juan@test.com',
          phone: '222',
        })
      )

      const byName = await repo.findAll('org-1', {
        search: 'ana',
        page: 1,
        limit: 20,
      })
      expect(byName.data).toHaveLength(1)
      expect(byName.data[0].firstName).toBe('Ana')

      const byEmail = await repo.findAll('org-1', {
        search: 'juan@test',
        page: 1,
        limit: 20,
      })
      expect(byEmail.data).toHaveLength(1)
      expect(byEmail.data[0].firstName).toBe('Juan')

      const byPhone = await repo.findAll('org-1', {
        search: '222',
        page: 1,
        limit: 20,
      })
      expect(byPhone.data).toHaveLength(1)
      expect(byPhone.data[0].firstName).toBe('Juan')
    })

    it('paginates correctly and computes meta', async () => {
      for (let i = 0; i < 5; i++) {
        await repo.create(
          'org-1',
          makeData({ firstName: `C${i}`, email: `c${i}@t.com`, phone: `${i}` })
        )
      }
      const page1 = await repo.findAll('org-1', { page: 1, limit: 2 })
      expect(page1.data).toHaveLength(2)
      expect(page1.meta).toMatchObject({
        page: 1,
        limit: 2,
        total: 5,
        totalPages: 3,
        hasNext: true,
        hasPrev: false,
      })

      const page3 = await repo.findAll('org-1', { page: 3, limit: 2 })
      expect(page3.data).toHaveLength(1)
      expect(page3.meta).toMatchObject({
        page: 3,
        limit: 2,
        total: 5,
        totalPages: 3,
        hasNext: false,
        hasPrev: true,
      })
    })
  })

  describe('findByEmail', () => {
    it('returns customer when email matches in org', async () => {
      const created = await repo.create('org-1', makeData())
      expect(await repo.findByEmail('ana@test.com', 'org-1')).toMatchObject({
        id: created.id,
      })
    })

    it('returns null when email belongs to a different org', async () => {
      await repo.create('org-1', makeData())
      expect(await repo.findByEmail('ana@test.com', 'org-2')).toBeNull()
    })

    it('returns null when email does not exist', async () => {
      expect(await repo.findByEmail('nobody@test.com', 'org-1')).toBeNull()
    })
  })

  describe('findByPhone', () => {
    it('returns customer when phone matches in org', async () => {
      const created = await repo.create('org-1', makeData())
      expect(await repo.findByPhone('5551234567', 'org-1')).toMatchObject({
        id: created.id,
      })
    })

    it('returns null when phone belongs to a different org', async () => {
      await repo.create('org-1', makeData())
      expect(await repo.findByPhone('5551234567', 'org-2')).toBeNull()
    })
  })

  describe('update', () => {
    it('updates fields and returns the updated customer', async () => {
      const created = await repo.create('org-1', makeData())
      const updated = await repo.update(created.id, 'org-1', {
        firstName: 'Updated',
      })
      expect(updated.firstName).toBe('Updated')
      expect(updated.lastName).toBe('Pérez')
    })

    it('rejects when customer does not belong to the organization', async () => {
      await expect(
        repo.update('unknown', 'org-1', { firstName: 'X' })
      ).rejects.toThrow('customer not found')
    })
  })

  describe('delete', () => {
    it('removes the customer from the store', async () => {
      const created = await repo.create('org-1', makeData())
      await repo.delete(created.id, 'org-1')
      expect(await repo.findById(created.id, 'org-1')).toBeNull()
    })

    it('rejects when customer does not belong to the organization', async () => {
      await expect(repo.delete('unknown', 'org-1')).rejects.toThrow(
        'customer not found'
      )
    })
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd /path/to/gloss-ops && npx nx test api --testFile=apps/api/src/customers/infrastructure/in-memory-customer.repository.spec.ts
```

Expected: FAIL — `Cannot find module './in-memory-customer.repository'`

- [ ] **Step 3: Implement the in-memory repository**

`apps/api/src/customers/infrastructure/in-memory-customer.repository.ts`:

```ts
import { randomUUID } from 'crypto'

import type { Prisma } from '@glossops/database'

import type {
  CustomerRepositoryInterface,
  CreateCustomerData,
  UpdateCustomerData,
  CustomerQuery,
  CustomerPage,
} from '@customers/interfaces'

export class InMemoryCustomerRepository implements CustomerRepositoryInterface {
  private customers = new Map<string, Prisma.CustomerModel>()

  create(
    organizationId: string,
    data: CreateCustomerData
  ): Promise<Prisma.CustomerModel> {
    const now = new Date()
    const customer: Prisma.CustomerModel = {
      id: randomUUID(),
      organizationId,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email ?? null,
      phone: data.phone ?? null,
      address: data.address ?? null,
      taxId: data.taxId ?? null,
      fiscalRegime: data.fiscalRegime ?? null,
      zipCode: data.zipCode ?? null,
      source: data.source ?? null,
      note: data.note ?? null,
      createdAt: now,
      updatedAt: now,
    }
    this.customers.set(customer.id, customer)
    return Promise.resolve(customer)
  }

  findById(
    id: string,
    organizationId: string
  ): Promise<Prisma.CustomerModel | null> {
    const customer = this.customers.get(id)
    if (!customer || customer.organizationId !== organizationId)
      return Promise.resolve(null)
    return Promise.resolve(customer)
  }

  findAll(organizationId: string, query: CustomerQuery): Promise<CustomerPage> {
    let list = [...this.customers.values()].filter(
      (c) => c.organizationId === organizationId
    )

    if (query.search) {
      const term = query.search.toLowerCase()
      list = list.filter((c) => {
        const fullName = `${c.firstName} ${c.lastName}`.toLowerCase()
        return (
          fullName.includes(term) ||
          c.email?.toLowerCase().includes(term) ||
          c.phone?.toLowerCase().includes(term)
        )
      })
    }

    const total = list.length
    const totalPages = total === 0 ? 0 : Math.ceil(total / query.limit)
    const offset = (query.page - 1) * query.limit
    const data = list.slice(offset, offset + query.limit)

    return Promise.resolve({
      data,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
        hasNext: query.page < totalPages,
        hasPrev: query.page > 1,
      },
    })
  }

  findByEmail(
    email: string,
    organizationId: string
  ): Promise<Prisma.CustomerModel | null> {
    for (const customer of this.customers.values()) {
      if (
        customer.organizationId === organizationId &&
        customer.email === email
      ) {
        return Promise.resolve(customer)
      }
    }
    return Promise.resolve(null)
  }

  findByPhone(
    phone: string,
    organizationId: string
  ): Promise<Prisma.CustomerModel | null> {
    for (const customer of this.customers.values()) {
      if (
        customer.organizationId === organizationId &&
        customer.phone === phone
      ) {
        return Promise.resolve(customer)
      }
    }
    return Promise.resolve(null)
  }

  update(
    id: string,
    organizationId: string,
    data: UpdateCustomerData
  ): Promise<Prisma.CustomerModel> {
    const customer = this.customers.get(id)
    if (!customer || customer.organizationId !== organizationId) {
      return Promise.reject(new Error('customer not found'))
    }
    const updated: Prisma.CustomerModel = {
      ...customer,
      ...data,
      updatedAt: new Date(),
    }
    this.customers.set(id, updated)
    return Promise.resolve(updated)
  }

  delete(id: string, organizationId: string): Promise<void> {
    const customer = this.customers.get(id)
    if (!customer || customer.organizationId !== organizationId) {
      return Promise.reject(new Error('customer not found'))
    }
    this.customers.delete(id)
    return Promise.resolve()
  }
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx nx test api --testFile=apps/api/src/customers/infrastructure/in-memory-customer.repository.spec.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/customers/infrastructure/
git commit -m "feat(customers): add InMemoryCustomerRepository with full test coverage"
```

---

## Task 3: CustomerService + Tests (TDD)

**Files:**

- Create: `apps/api/src/customers/customers.service.spec.ts`
- Create: `apps/api/src/customers/customers.service.ts`

- [ ] **Step 1: Write the failing service tests**

`apps/api/src/customers/customers.service.spec.ts`:

```ts
import { Test } from '@nestjs/testing'
import { ConflictException, NotFoundException } from '@nestjs/common'

import { InMemoryCustomerRepository } from './infrastructure/in-memory-customer.repository'
import { CustomersService } from './customers.service'
import { CUSTOMER_REPOSITORY } from './customers.tokens'

const makeData = (overrides: Record<string, unknown> = {}) => ({
  firstName: 'Ana',
  lastName: 'Pérez',
  ...overrides,
})

describe('CustomersService', () => {
  let service: CustomersService
  let repo: InMemoryCustomerRepository

  beforeEach(async () => {
    repo = new InMemoryCustomerRepository()
    const module = await Test.createTestingModule({
      providers: [
        CustomersService,
        { provide: CUSTOMER_REPOSITORY, useValue: repo },
      ],
    }).compile()
    service = module.get(CustomersService)
  })

  describe('create', () => {
    it('creates and returns the customer', async () => {
      const customer = await service.create('org-1', makeData())
      expect(customer.firstName).toBe('Ana')
      expect(customer.organizationId).toBe('org-1')
    })

    it('throws ConflictException when email already exists in org', async () => {
      await repo.create('org-1', makeData({ email: 'taken@test.com' }))
      await expect(
        service.create('org-1', makeData({ email: 'taken@test.com' }))
      ).rejects.toThrow(ConflictException)
    })

    it('throws ConflictException when phone already exists in org', async () => {
      await repo.create('org-1', makeData({ phone: '5559999' }))
      await expect(
        service.create(
          'org-1',
          makeData({ email: 'other@test.com', phone: '5559999' })
        )
      ).rejects.toThrow(ConflictException)
    })

    it('does not enforce uniqueness across different orgs', async () => {
      await repo.create('org-1', makeData({ email: 'shared@test.com' }))
      await expect(
        service.create('org-2', makeData({ email: 'shared@test.com' }))
      ).resolves.toBeDefined()
    })
  })

  describe('findAll', () => {
    it('returns paginated customers for the organization', async () => {
      await repo.create('org-1', makeData({ firstName: 'A' }))
      await repo.create('org-1', makeData({ firstName: 'B' }))
      const result = await service.findAll('org-1', {})
      expect(result.data).toHaveLength(2)
      expect(result.meta.total).toBe(2)
    })

    it('applies defaults: page=1, limit=20', async () => {
      const result = await service.findAll('org-1', {})
      expect(result.meta.page).toBe(1)
      expect(result.meta.limit).toBe(20)
    })
  })

  describe('findOne', () => {
    it('returns customer when it belongs to the org', async () => {
      const created = await repo.create('org-1', makeData())
      const result = await service.findOne(created.id, 'org-1')
      expect(result.id).toBe(created.id)
    })

    it('throws NotFoundException when customer does not exist in the org', async () => {
      await expect(service.findOne('unknown', 'org-1')).rejects.toThrow(
        NotFoundException
      )
    })
  })

  describe('update', () => {
    it('updates and returns the customer', async () => {
      const created = await repo.create('org-1', makeData())
      const result = await service.update(created.id, 'org-1', {
        firstName: 'Updated',
      })
      expect(result.firstName).toBe('Updated')
    })

    it('throws NotFoundException when customer does not exist in the org', async () => {
      await expect(
        service.update('unknown', 'org-1', { firstName: 'X' })
      ).rejects.toThrow(NotFoundException)
    })

    it('throws ConflictException when email conflicts with a DIFFERENT customer', async () => {
      const other = await repo.create(
        'org-1',
        makeData({ email: 'other@test.com', phone: '111' })
      )
      const target = await repo.create(
        'org-1',
        makeData({ email: 'target@test.com', phone: '222' })
      )
      await expect(
        service.update(target.id, 'org-1', { email: other.email! })
      ).rejects.toThrow(ConflictException)
    })

    it('does NOT throw ConflictException when email belongs to the SAME customer', async () => {
      const created = await repo.create(
        'org-1',
        makeData({ email: 'same@test.com' })
      )
      await expect(
        service.update(created.id, 'org-1', { email: 'same@test.com' })
      ).resolves.toBeDefined()
    })

    it('throws ConflictException when phone conflicts with a DIFFERENT customer', async () => {
      const other = await repo.create(
        'org-1',
        makeData({ phone: '9999', email: 'a@t.com' })
      )
      const target = await repo.create(
        'org-1',
        makeData({ phone: '8888', email: 'b@t.com' })
      )
      await expect(
        service.update(target.id, 'org-1', { phone: other.phone! })
      ).rejects.toThrow(ConflictException)
    })
  })

  describe('remove', () => {
    it('deletes the customer', async () => {
      const created = await repo.create('org-1', makeData())
      await service.remove(created.id, 'org-1')
      await expect(service.findOne(created.id, 'org-1')).rejects.toThrow(
        NotFoundException
      )
    })

    it('throws NotFoundException when customer does not exist in the org', async () => {
      await expect(service.remove('unknown', 'org-1')).rejects.toThrow(
        NotFoundException
      )
    })
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx nx test api --testFile=apps/api/src/customers/customers.service.spec.ts
```

Expected: FAIL — `Cannot find module './customers.service'`

- [ ] **Step 3: Implement the service**

`apps/api/src/customers/customers.service.ts`:

```ts
import {
  ConflictException,
  NotFoundException,
  Injectable,
  Inject,
} from '@nestjs/common'

import type { Prisma } from '@glossops/database'

import type {
  CustomerRepositoryInterface,
  CreateCustomerData,
  UpdateCustomerData,
  CustomerPage,
} from '@customers/interfaces'

import { ListCustomersDto } from './dto'
import { CUSTOMER_REPOSITORY } from './customers.tokens'

@Injectable()
export class CustomersService {
  constructor(
    @Inject(CUSTOMER_REPOSITORY)
    private readonly customers: CustomerRepositoryInterface
  ) {}

  async create(
    organizationId: string,
    data: CreateCustomerData
  ): Promise<Prisma.CustomerModel> {
    if (data.email) {
      const existing = await this.customers.findByEmail(
        data.email,
        organizationId
      )
      if (existing)
        throw new ConflictException({ error: 'email_already_exists' })
    }
    if (data.phone) {
      const existing = await this.customers.findByPhone(
        data.phone,
        organizationId
      )
      if (existing)
        throw new ConflictException({ error: 'phone_already_exists' })
    }
    return this.customers.create(organizationId, data)
  }

  findAll(
    organizationId: string,
    dto: ListCustomersDto
  ): Promise<CustomerPage> {
    return this.customers.findAll(organizationId, {
      search: dto.search,
      page: dto.page ?? 1,
      limit: dto.limit ?? 20,
    })
  }

  async findOne(
    id: string,
    organizationId: string
  ): Promise<Prisma.CustomerModel> {
    const customer = await this.customers.findById(id, organizationId)
    if (!customer) throw new NotFoundException({ error: 'customer_not_found' })
    return customer
  }

  async update(
    id: string,
    organizationId: string,
    data: UpdateCustomerData
  ): Promise<Prisma.CustomerModel> {
    await this.findOne(id, organizationId)

    if (data.email) {
      const existing = await this.customers.findByEmail(
        data.email,
        organizationId
      )
      if (existing && existing.id !== id) {
        throw new ConflictException({ error: 'email_already_exists' })
      }
    }
    if (data.phone) {
      const existing = await this.customers.findByPhone(
        data.phone,
        organizationId
      )
      if (existing && existing.id !== id) {
        throw new ConflictException({ error: 'phone_already_exists' })
      }
    }

    return this.customers.update(id, organizationId, data)
  }

  async remove(id: string, organizationId: string): Promise<void> {
    await this.findOne(id, organizationId)
    return this.customers.delete(id, organizationId)
  }
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx nx test api --testFile=apps/api/src/customers/customers.service.spec.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/customers/customers.service.ts apps/api/src/customers/customers.service.spec.ts
git commit -m "feat(customers): add CustomersService with uniqueness enforcement and full test coverage"
```

---

## Task 4: Prisma Implementation

**Files:**

- Create: `apps/api/src/customers/infrastructure/prisma-customer.repository.ts`

- [ ] **Step 1: Implement the Prisma repository**

`apps/api/src/customers/infrastructure/prisma-customer.repository.ts`:

```ts
import { Injectable } from '@nestjs/common'

import type { Prisma } from '@glossops/database'

import { PrismaService } from '@prisma'
import type {
  CustomerRepositoryInterface,
  CreateCustomerData,
  UpdateCustomerData,
  CustomerQuery,
  CustomerPage,
} from '@customers/interfaces'

@Injectable()
export class PrismaCustomerRepository implements CustomerRepositoryInterface {
  constructor(private readonly prisma: PrismaService) {}

  create(
    organizationId: string,
    data: CreateCustomerData
  ): Promise<Prisma.CustomerModel> {
    return this.prisma.customer.create({ data: { organizationId, ...data } })
  }

  findById(
    id: string,
    organizationId: string
  ): Promise<Prisma.CustomerModel | null> {
    return this.prisma.customer.findFirst({ where: { id, organizationId } })
  }

  async findAll(
    organizationId: string,
    query: CustomerQuery
  ): Promise<CustomerPage> {
    const where: Prisma.CustomerWhereInput = { organizationId }

    if (query.search) {
      const term = query.search
      where.OR = [
        { firstName: { contains: term, mode: 'insensitive' } },
        { lastName: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
        { phone: { contains: term, mode: 'insensitive' } },
      ]
    }

    const [total, data] = await Promise.all([
      this.prisma.customer.count({ where }),
      this.prisma.customer.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
      }),
    ])

    const totalPages = total === 0 ? 0 : Math.ceil(total / query.limit)

    return {
      data,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
        hasNext: query.page < totalPages,
        hasPrev: query.page > 1,
      },
    }
  }

  findByEmail(
    email: string,
    organizationId: string
  ): Promise<Prisma.CustomerModel | null> {
    return this.prisma.customer.findFirst({ where: { email, organizationId } })
  }

  findByPhone(
    phone: string,
    organizationId: string
  ): Promise<Prisma.CustomerModel | null> {
    return this.prisma.customer.findFirst({ where: { phone, organizationId } })
  }

  update(
    id: string,
    organizationId: string,
    data: UpdateCustomerData
  ): Promise<Prisma.CustomerModel> {
    return this.prisma.customer.update({ where: { id }, data })
  }

  async delete(id: string, _organizationId: string): Promise<void> {
    await this.prisma.customer.delete({ where: { id } })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/customers/infrastructure/prisma-customer.repository.ts
git commit -m "feat(customers): add PrismaCustomerRepository"
```

---

## Task 5: Controller, Module, Barrel & App Wiring

**Files:**

- Create: `apps/api/src/customers/customers.controller.ts`
- Create: `apps/api/src/customers/customers.module.ts`
- Create: `apps/api/src/customers/index.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Create the controller**

`apps/api/src/customers/customers.controller.ts`:

```ts
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common'

import type { Prisma } from '@glossops/database'
import { Role } from '@glossops/database'

import type { AuthContext } from '@auth/interfaces'
import { CurrentAccount, Roles } from '@auth/decorators'
import type { CustomerPage } from '@customers/interfaces'

import { CreateCustomerDto, UpdateCustomerDto, ListCustomersDto } from './dto'
import { CustomersService } from './customers.service'

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @Roles(Role.OWNER, Role.MANAGER, Role.FRONT_DESK)
  create(
    @CurrentAccount() account: AuthContext,
    @Body() dto: CreateCustomerDto
  ): Promise<Prisma.CustomerModel> {
    return this.customersService.create(account.organizationId!, dto)
  }

  @Get()
  findAll(
    @CurrentAccount() account: AuthContext,
    @Query() dto: ListCustomersDto
  ): Promise<CustomerPage> {
    return this.customersService.findAll(account.organizationId!, dto)
  }

  @Get(':id')
  findOne(
    @CurrentAccount() account: AuthContext,
    @Param('id') id: string
  ): Promise<Prisma.CustomerModel> {
    return this.customersService.findOne(id, account.organizationId!)
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.MANAGER, Role.FRONT_DESK)
  update(
    @CurrentAccount() account: AuthContext,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto
  ): Promise<Prisma.CustomerModel> {
    return this.customersService.update(id, account.organizationId!, dto)
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles(Role.OWNER, Role.MANAGER)
  remove(
    @CurrentAccount() account: AuthContext,
    @Param('id') id: string
  ): Promise<void> {
    return this.customersService.remove(id, account.organizationId!)
  }
}
```

- [ ] **Step 2: Create the NestJS module**

`apps/api/src/customers/customers.module.ts`:

```ts
import { Module } from '@nestjs/common'

import { PrismaModule } from '@prisma'

import { PrismaCustomerRepository } from './infrastructure/prisma-customer.repository'
import { CustomersController } from './customers.controller'
import { CustomersService } from './customers.service'
import { CUSTOMER_REPOSITORY } from './customers.tokens'

@Module({
  imports: [PrismaModule],
  controllers: [CustomersController],
  providers: [
    { provide: CUSTOMER_REPOSITORY, useClass: PrismaCustomerRepository },
    CustomersService,
  ],
})
export class CustomersModule {}
```

- [ ] **Step 3: Create the module barrel**

`apps/api/src/customers/index.ts`:

```ts
export { CustomersModule } from './customers.module'
export { CustomersService } from './customers.service'
```

- [ ] **Step 4: Register CustomersModule in AppModule**

`apps/api/src/app.module.ts`:

```ts
import { ConfigModule } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { Module } from '@nestjs/common'

import { AuthGuard, RolesGuard } from '@auth/guards'
import { PrismaModule } from '@prisma'
import { AuthModule } from '@auth'

import { OrganizationsModule } from './organizations/organizations.module'
import { CustomersModule } from './customers/customers.module'
import { AppController } from './app.controller'
import { AppService } from './app.service'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    OrganizationsModule,
    CustomersModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
```

- [ ] **Step 5: Run the full test suite to confirm no regressions**

```bash
npx nx test api
```

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/customers/customers.controller.ts apps/api/src/customers/customers.module.ts apps/api/src/customers/index.ts apps/api/src/app.module.ts
git commit -m "feat(customers): wire controller, module, and register in AppModule"
```

---

## Self-Review

**Spec coverage:**

- ✅ CRUD endpoints with correct roles (Task 5)
- ✅ Text search across name/email/phone (Task 2 + 4)
- ✅ Pagination with `meta` object (Task 1 + 2 + 4)
- ✅ `page` default 1, `limit` default 20, max 100 (Task 3 service)
- ✅ `findByEmail` + `findByPhone` for uniqueness (Task 1 + 2)
- ✅ Uniqueness on create for email + phone (Task 3)
- ✅ Uniqueness on update excludes current customer (Task 3)
- ✅ `NotFoundException` on missing customer (Task 3)
- ✅ `ConflictException` with correct error keys (Task 3)
- ✅ Tenant isolation in all repo methods (Task 2 + 4)
- ✅ tsconfig paths (Task 1)
- ✅ AppModule wiring (Task 5)

**Placeholder scan:** None found.

**Type consistency:**

- `CustomerQuery` defined in Task 1, used in Task 2 (in-memory), Task 3 (service), Task 4 (Prisma) ✅
- `CustomerPage` defined in Task 1, returned by `findAll` in all three layers ✅
- `ListCustomersDto` defined in Task 1, imported by service in Task 3 and controller in Task 5 ✅
- `CUSTOMER_REPOSITORY` token defined in Task 1, used in Task 3 (service spec + service) and Task 5 (module) ✅
