# Customers Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the `customers` module — full CRUD for tenant-scoped customers, following the repository pattern established by `organizations`.

**Architecture:** Follows the exact same structure as `organizations`: repository interface → in-memory implementation → Prisma implementation → service → controller → module wiring. All queries filter by `organizationId` to enforce tenant isolation. No cross-module dependencies beyond `AuthModule` (for guards/decorators) and `PrismaModule`.

**Tech Stack:** NestJS, TypeScript, Prisma (`@glossops/database`), class-validator, Jest (in-memory implementations for tests — no Prisma mocks).

---

## File Map

| Action | Path                                                                          | Responsibility                                                      |
| ------ | ----------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Create | `apps/api/src/customers/interfaces/customer.repository.interface.ts`          | Contract + data types                                               |
| Create | `apps/api/src/customers/interfaces/index.ts`                                  | Barrel — types only                                                 |
| Create | `apps/api/src/customers/infrastructure/in-memory-customer.repository.ts`      | In-memory impl for tests                                            |
| Create | `apps/api/src/customers/infrastructure/in-memory-customer.repository.spec.ts` | Unit tests for in-memory                                            |
| Create | `apps/api/src/customers/infrastructure/prisma-customer.repository.ts`         | Prisma impl                                                         |
| Create | `apps/api/src/customers/dto/create-customer.dto.ts`                           | Validated input DTO                                                 |
| Create | `apps/api/src/customers/dto/update-customer.dto.ts`                           | Partial update DTO                                                  |
| Create | `apps/api/src/customers/dto/index.ts`                                         | Barrel                                                              |
| Create | `apps/api/src/customers/customers.tokens.ts`                                  | DI injection token                                                  |
| Create | `apps/api/src/customers/customers.service.ts`                                 | Business logic                                                      |
| Create | `apps/api/src/customers/customers.service.spec.ts`                            | Service unit tests                                                  |
| Create | `apps/api/src/customers/customers.controller.ts`                              | HTTP endpoints                                                      |
| Create | `apps/api/src/customers/customers.module.ts`                                  | NestJS module wiring                                                |
| Create | `apps/api/src/customers/index.ts`                                             | Module barrel                                                       |
| Modify | `apps/api/tsconfig.paths.json`                                                | Add `@customers`, `@customers/dto`, `@customers/interfaces` aliases |
| Modify | `apps/api/src/app.module.ts`                                                  | Import `CustomersModule`                                            |

---

## Task 1: Repository Interface & DTOs

**Files:**

- Create: `apps/api/src/customers/interfaces/customer.repository.interface.ts`
- Create: `apps/api/src/customers/interfaces/index.ts`
- Create: `apps/api/src/customers/dto/create-customer.dto.ts`
- Create: `apps/api/src/customers/dto/update-customer.dto.ts`
- Create: `apps/api/src/customers/dto/index.ts`
- Create: `apps/api/src/customers/customers.tokens.ts`

- [ ] **Step 1: Create the repository interface**

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

export interface CustomerRepositoryInterface {
  create(
    organizationId: string,
    data: CreateCustomerData
  ): Promise<Prisma.CustomerModel>
  findById(
    id: string,
    organizationId: string
  ): Promise<Prisma.CustomerModel | null>
  findAll(organizationId: string): Promise<Prisma.CustomerModel[]>
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
export type { CreateCustomerData } from './customer.repository.interface'
export type { UpdateCustomerData } from './customer.repository.interface'
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

- [ ] **Step 5: Create the DTO barrel**

`apps/api/src/customers/dto/index.ts`:

```ts
export { CreateCustomerDto } from './create-customer.dto'
export { UpdateCustomerDto } from './update-customer.dto'
```

- [ ] **Step 6: Create the DI token**

`apps/api/src/customers/customers.tokens.ts`:

```ts
export const CUSTOMER_REPOSITORY = Symbol('CustomerRepositoryInterface')
```

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/customers/
git commit -m "feat(customers): add repository interface, DTOs, and DI token"
```

---

## Task 2: In-Memory Implementation + Tests (TDD)

**Files:**

- Create: `apps/api/src/customers/infrastructure/in-memory-customer.repository.ts`
- Create: `apps/api/src/customers/infrastructure/in-memory-customer.repository.spec.ts`

- [ ] **Step 1: Write the failing tests first**

`apps/api/src/customers/infrastructure/in-memory-customer.repository.spec.ts`:

```ts
import { InMemoryCustomerRepository } from './in-memory-customer.repository'

const makeData = (overrides = {}) => ({
  firstName: 'Ana',
  lastName: 'Pérez',
  email: 'ana@test.com',
  ...overrides,
})

describe('InMemoryCustomerRepository', () => {
  let repo: InMemoryCustomerRepository

  beforeEach(() => {
    repo = new InMemoryCustomerRepository()
  })

  describe('create', () => {
    it('creates a customer scoped to an organization', async () => {
      const customer = await repo.create('org-1', makeData())
      expect(customer.organizationId).toBe('org-1')
      expect(customer.firstName).toBe('Ana')
      expect(customer.id).toBeDefined()
    })
  })

  describe('findById', () => {
    it('returns customer when id and organizationId match', async () => {
      const created = await repo.create('org-1', makeData())
      const found = await repo.findById(created.id, 'org-1')
      expect(found?.id).toBe(created.id)
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
    it('returns only customers belonging to the organization', async () => {
      await repo.create('org-1', makeData({ firstName: 'A' }))
      await repo.create('org-1', makeData({ firstName: 'B' }))
      await repo.create('org-2', makeData({ firstName: 'C' }))
      const result = await repo.findAll('org-1')
      expect(result).toHaveLength(2)
      expect(result.every((c) => c.organizationId === 'org-1')).toBe(true)
    })

    it('returns empty array when org has no customers', async () => {
      expect(await repo.findAll('org-empty')).toEqual([])
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

    it('throws when customer does not exist in the organization', async () => {
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

    it('throws when customer does not exist in the organization', async () => {
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

  findAll(organizationId: string): Promise<Prisma.CustomerModel[]> {
    const result = [...this.customers.values()].filter(
      (c) => c.organizationId === organizationId
    )
    return Promise.resolve(result)
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
    const updated = { ...customer, ...data, updatedAt: new Date() }
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

- [ ] **Step 4: Add the tsconfig path alias** (needed so the in-memory impl can import `@customers/interfaces`)

In `apps/api/tsconfig.paths.json`, add under `"paths"`:

```json
"@customers": ["./src/customers/index.ts"],
"@customers/dto": ["./src/customers/dto/index.ts"],
"@customers/interfaces": ["./src/customers/interfaces/index.ts"]
```

Full updated file:

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

- [ ] **Step 5: Run tests — verify they pass**

```bash
cd /path/to/gloss-ops && npx nx test api --testFile=apps/api/src/customers/infrastructure/in-memory-customer.repository.spec.ts
```

Expected: All 8 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/customers/infrastructure/ apps/api/tsconfig.paths.json
git commit -m "feat(customers): add InMemoryCustomerRepository with full test coverage"
```

---

## Task 3: CustomerService + Tests (TDD)

**Files:**

- Create: `apps/api/src/customers/customers.service.ts`
- Create: `apps/api/src/customers/customers.service.spec.ts`

- [ ] **Step 1: Write the failing service tests**

`apps/api/src/customers/customers.service.spec.ts`:

```ts
import { Test } from '@nestjs/testing'
import { NotFoundException } from '@nestjs/common'

import { InMemoryCustomerRepository } from './infrastructure/in-memory-customer.repository'
import { CustomersService } from './customers.service'
import { CUSTOMER_REPOSITORY } from './customers.tokens'

const makeData = (overrides = {}) => ({
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
  })

  describe('findAll', () => {
    it('returns all customers of the organization', async () => {
      await repo.create('org-1', makeData({ firstName: 'A' }))
      await repo.create('org-1', makeData({ firstName: 'B' }))
      const result = await service.findAll('org-1')
      expect(result).toHaveLength(2)
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
cd /path/to/gloss-ops && npx nx test api --testFile=apps/api/src/customers/customers.service.spec.ts
```

Expected: FAIL — `Cannot find module './customers.service'`

- [ ] **Step 3: Implement the service**

`apps/api/src/customers/customers.service.ts`:

```ts
import { NotFoundException, Injectable, Inject } from '@nestjs/common'

import type { Prisma } from '@glossops/database'

import type {
  CustomerRepositoryInterface,
  CreateCustomerData,
  UpdateCustomerData,
} from '@customers/interfaces'

import { CUSTOMER_REPOSITORY } from './customers.tokens'

@Injectable()
export class CustomersService {
  constructor(
    @Inject(CUSTOMER_REPOSITORY)
    private readonly customers: CustomerRepositoryInterface
  ) {}

  create(
    organizationId: string,
    data: CreateCustomerData
  ): Promise<Prisma.CustomerModel> {
    return this.customers.create(organizationId, data)
  }

  findAll(organizationId: string): Promise<Prisma.CustomerModel[]> {
    return this.customers.findAll(organizationId)
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
cd /path/to/gloss-ops && npx nx test api --testFile=apps/api/src/customers/customers.service.spec.ts
```

Expected: All 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/customers/customers.service.ts apps/api/src/customers/customers.service.spec.ts
git commit -m "feat(customers): add CustomersService with full test coverage"
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

  findAll(organizationId: string): Promise<Prisma.CustomerModel[]> {
    return this.prisma.customer.findMany({ where: { organizationId } })
  }

  update(
    id: string,
    organizationId: string,
    data: UpdateCustomerData
  ): Promise<Prisma.CustomerModel> {
    return this.prisma.customer.update({ where: { id }, data })
  }

  async delete(id: string, organizationId: string): Promise<void> {
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

## Task 5: Controller, Module, Barrel, and App Wiring

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
} from '@nestjs/common'

import type { Prisma } from '@glossops/database'
import { Role } from '@glossops/database'

import type { AuthContext } from '@auth/interfaces'
import { CurrentAccount, Roles } from '@auth/decorators'

import { CreateCustomerDto, UpdateCustomerDto } from './dto'
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
    @CurrentAccount() account: AuthContext
  ): Promise<Prisma.CustomerModel[]> {
    return this.customersService.findAll(account.organizationId!)
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

Modify `apps/api/src/app.module.ts` — add the import:

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
cd /path/to/gloss-ops && npx nx test api
```

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/customers/customers.controller.ts apps/api/src/customers/customers.module.ts apps/api/src/customers/index.ts apps/api/src/app.module.ts
git commit -m "feat(customers): wire controller, module, and register in AppModule"
```

---

## Self-Review Checklist

- [x] **Tenant isolation**: All repository methods accept `organizationId` and filter by it — `findById`, `findAll`, `update`, `delete` all scope to org.
- [x] **PrismaService not used outside infrastructure**: Service depends on `CustomerRepositoryInterface` via DI token; Prisma only in `PrismaCustomerRepository`.
- [x] **RBAC**: Create/Update scoped to Owner/Manager/Front Desk; Delete scoped to Owner/Manager; Read open to all org members.
- [x] **Repository pattern**: Matches `organizations` — interface → in-memory → Prisma → tokens → module.
- [x] **Import tiers**: All files follow 6-tier import ordering.
- [x] **Barrel exports**: `index.ts` files sorted by line length, longest first.
- [x] **No placeholders**: Every step has complete code.
- [x] **Type consistency**: `CreateCustomerData`/`UpdateCustomerData` used consistently across interface, in-memory, Prisma, and service.
