# Soft Delete & Hard Delete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add soft delete (`status=DELETED`, hidden from reads) and hard delete (permanent row removal) to the `customers` and `organizations` modules via a single `DELETE` endpoint with an optional `?permanent=true` query param.

**Architecture:** A shared `ResourceStatus` enum (`ACTIVE` | `DELETED`) is added to the Prisma schema and applied to `Customer` and `Organization`. All read methods filter `status: ACTIVE`. A new `softDelete` method updates the status field; the existing `delete` method hard-deletes without a status filter. Controllers enforce Owner-only for permanent deletes (customers also allow Manager for soft delete).

**Tech Stack:** NestJS, Prisma 7, TypeScript, PostgreSQL, Jest (in-memory repo for all unit tests)

---

### Task 1: Add ResourceStatus enum to Prisma schema and migrate

**Files:**

- Modify: `packages/database/prisma/schema.prisma`
- New migration: `packages/database/prisma/migrations/…`

> **Note:** After this task, TypeScript source files that construct `Prisma.CustomerModel` or `Prisma.OrganizationModel` objects will have TS errors (missing `status` field). This is expected and fixed in Tasks 2 and 5. Do NOT run `pnpm --filter api test` after this task.

- [ ] **Step 1: Add ResourceStatus enum after PurchaseOrderStatus**

In `packages/database/prisma/schema.prisma`, after the `PurchaseOrderStatus` enum (ends with `  CANCELLED` around line 96), add:

```prisma
enum ResourceStatus {
  ACTIVE
  DELETED
}
```

- [ ] **Step 2: Add status field to Customer model**

In the `Customer` model, after the `note String?` field and before `createdAt DateTime`, add:

```prisma
  status         ResourceStatus @default(ACTIVE)
```

The Customer model block should now end with:

```prisma
  note           String?
  status         ResourceStatus @default(ACTIVE)
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")
```

- [ ] **Step 3: Add status field to Organization model**

In the `Organization` model, after the `logoUrl String? @map("logo_url")` field and before `createdAt DateTime`, add:

```prisma
  status         ResourceStatus @default(ACTIVE)
```

The Organization model block should now end with:

```prisma
  logoUrl   String?  @map("logo_url")
  status    ResourceStatus @default(ACTIVE)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
```

- [ ] **Step 4: Run migration**

```bash
pnpm --filter @glossops/database exec prisma migrate dev --name add_resource_status
```

Expected: a new migration file created under `packages/database/prisma/migrations/`, no errors.

- [ ] **Step 5: Rebuild the database package to update generated types**

```bash
pnpm --filter @glossops/database build
```

Expected: `packages/database/dist/` updated; `ResourceStatus` enum is now exported from `@glossops/database`.

- [ ] **Step 6: Commit**

Stage only schema and migration files:

```bash
git add packages/database/prisma/schema.prisma packages/database/prisma/migrations/
git commit -m "$(printf '\xf0\x9f\x94\xa7 chore(database): add ResourceStatus enum and status field to Customer and Organization\n')"
```

---

### Task 2: Customers – Interface + InMemory Repository + Tests

**Files:**

- Modify: `apps/api/src/customers/interfaces/customer.repository.interface.ts`
- Modify: `apps/api/src/customers/infrastructure/in-memory-customer.repository.ts`
- Modify: `apps/api/src/customers/infrastructure/in-memory-customer.repository.spec.ts`

- [ ] **Step 1: Write the failing tests for softDelete behavior**

Add the following `describe` blocks to `apps/api/src/customers/infrastructure/in-memory-customer.repository.spec.ts`. Insert them after the existing `describe('delete', ...)` block:

```ts
describe('softDelete', () => {
  it('marks the customer as DELETED', async () => {
    const created = await repo.create('org-1', makeData())
    await repo.softDelete(created.id, 'org-1')
    expect(await repo.findById(created.id, 'org-1')).toBeNull()
  })

  it('rejects when customer does not belong to the organization', async () => {
    await expect(repo.softDelete('unknown', 'org-1')).rejects.toThrow(
      'customer not found'
    )
  })
})
```

Also add these tests to the existing describe blocks:

In `describe('findById', ...)`, after the last existing test, add:

```ts
it('returns null for a DELETED customer', async () => {
  const created = await repo.create('org-1', makeData())
  await repo.softDelete(created.id, 'org-1')
  expect(await repo.findById(created.id, 'org-1')).toBeNull()
})
```

In `describe('findAll', ...)`, after the last existing test, add:

```ts
it('excludes DELETED customers', async () => {
  const active = await repo.create(
    'org-1',
    makeData({ firstName: 'Active', email: 'active@t.com', phone: '111' })
  )
  const deleted = await repo.create(
    'org-1',
    makeData({ firstName: 'Deleted', email: 'deleted@t.com', phone: '222' })
  )
  await repo.softDelete(deleted.id, 'org-1')
  const result = await repo.findAll('org-1', { page: 1, limit: 20 })
  expect(result.data).toHaveLength(1)
  expect(result.data[0].id).toBe(active.id)
})
```

In `describe('findByEmail', ...)`, after the last existing test, add:

```ts
it('returns null for a DELETED customer', async () => {
  const created = await repo.create('org-1', makeData())
  await repo.softDelete(created.id, 'org-1')
  expect(await repo.findByEmail('ana@test.com', 'org-1')).toBeNull()
})
```

In `describe('findByPhone', ...)`, after the last existing test, add:

```ts
it('returns null for a DELETED customer', async () => {
  const created = await repo.create('org-1', makeData())
  await repo.softDelete(created.id, 'org-1')
  expect(await repo.findByPhone('5551234567', 'org-1')).toBeNull()
})
```

In `describe('delete', ...)`, after the last existing test, add:

```ts
it('removes a DELETED customer (hard delete regardless of status)', async () => {
  const created = await repo.create('org-1', makeData())
  await repo.softDelete(created.id, 'org-1')
  await repo.delete(created.id, 'org-1')
  // Record is gone entirely — even a raw lookup finds nothing
  expect(await repo.findById(created.id, 'org-1')).toBeNull()
})
```

- [ ] **Step 2: Run tests — verify they fail with "softDelete is not a function"**

```bash
pnpm --filter api test -- --testPathPattern="in-memory-customer.repository"
```

Expected: FAIL — `repo.softDelete is not a function` (and TS error: `status` missing in `create`).

- [ ] **Step 3: Add softDelete to CustomerRepositoryInterface**

In `apps/api/src/customers/interfaces/customer.repository.interface.ts`, add `softDelete` before the `delete` method:

```ts
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
  softDelete(id: string, organizationId: string): Promise<Prisma.CustomerModel>
  delete(id: string, organizationId: string): Promise<void>
}
```

- [ ] **Step 4: Update InMemoryCustomerRepository**

Replace the full contents of `apps/api/src/customers/infrastructure/in-memory-customer.repository.ts` with:

```ts
import { randomUUID } from 'crypto'

import { ResourceStatus } from '@glossops/database'
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
      status: ResourceStatus.ACTIVE,
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
    if (
      !customer ||
      customer.organizationId !== organizationId ||
      customer.status !== ResourceStatus.ACTIVE
    )
      return Promise.resolve(null)
    return Promise.resolve(customer)
  }

  findAll(organizationId: string, query: CustomerQuery): Promise<CustomerPage> {
    let list = [...this.customers.values()].filter(
      c =>
        c.organizationId === organizationId &&
        c.status === ResourceStatus.ACTIVE
    )

    if (query.search) {
      const term = query.search.toLowerCase()
      list = list.filter(c => {
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
        customer.email === email &&
        customer.status === ResourceStatus.ACTIVE
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
        customer.phone === phone &&
        customer.status === ResourceStatus.ACTIVE
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

  softDelete(
    id: string,
    organizationId: string
  ): Promise<Prisma.CustomerModel> {
    const customer = this.customers.get(id)
    if (!customer || customer.organizationId !== organizationId) {
      return Promise.reject(new Error('customer not found'))
    }
    const updated: Prisma.CustomerModel = {
      ...customer,
      status: ResourceStatus.DELETED,
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

- [ ] **Step 5: Run tests — verify they pass**

```bash
pnpm --filter api test -- --testPathPattern="in-memory-customer.repository"
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/customers/interfaces/customer.repository.interface.ts \
        apps/api/src/customers/infrastructure/in-memory-customer.repository.ts \
        apps/api/src/customers/infrastructure/in-memory-customer.repository.spec.ts
git commit -m "$(printf '\xf0\x9f\xa7\xaa test(customers): add softDelete and DELETED-record tests for in-memory repo\n')"
```

---

### Task 3: Customers – Prisma Repository

**Files:**

- Modify: `apps/api/src/customers/infrastructure/prisma-customer.repository.ts`

- [ ] **Step 1: Replace the full file contents**

```ts
import { Injectable } from '@nestjs/common'

import { ResourceStatus } from '@glossops/database'
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
    return this.prisma.customer.findFirst({
      where: { id, organizationId, status: ResourceStatus.ACTIVE },
    })
  }

  async findAll(
    organizationId: string,
    query: CustomerQuery
  ): Promise<CustomerPage> {
    const where: Prisma.CustomerWhereInput = {
      organizationId,
      status: ResourceStatus.ACTIVE,
    }

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
    return this.prisma.customer.findFirst({
      where: { email, organizationId, status: ResourceStatus.ACTIVE },
    })
  }

  findByPhone(
    phone: string,
    organizationId: string
  ): Promise<Prisma.CustomerModel | null> {
    return this.prisma.customer.findFirst({
      where: { phone, organizationId, status: ResourceStatus.ACTIVE },
    })
  }

  async update(
    id: string,
    organizationId: string,
    data: UpdateCustomerData
  ): Promise<Prisma.CustomerModel> {
    await this.prisma.customer.updateMany({
      where: { id, organizationId },
      data,
    })
    const record = await this.prisma.customer.findFirst({
      where: { id, organizationId },
    })
    return record!
  }

  async softDelete(
    id: string,
    organizationId: string
  ): Promise<Prisma.CustomerModel> {
    await this.prisma.customer.updateMany({
      where: { id, organizationId },
      data: { status: ResourceStatus.DELETED },
    })
    const record = await this.prisma.customer.findFirst({
      where: { id, organizationId },
    })
    return record!
  }

  async delete(id: string, organizationId: string): Promise<void> {
    const result = await this.prisma.customer.deleteMany({
      where: { id, organizationId },
    })
    if (result.count === 0) throw new Error('customer not found')
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/customers/infrastructure/prisma-customer.repository.ts
git commit -m "$(printf '\xe2\x9c\xa8 feat(customers): add status filters and softDelete to Prisma customer repository\n')"
```

---

### Task 4: Customers – Service + Controller + Specs

**Files:**

- Modify: `apps/api/src/customers/customers.service.ts`
- Modify: `apps/api/src/customers/customers.controller.ts`
- Modify: `apps/api/src/customers/customers.service.spec.ts`
- Create: `apps/api/src/customers/customers.controller.spec.ts`

- [ ] **Step 1: Write failing service tests for the new remove behaviors**

In `apps/api/src/customers/customers.service.spec.ts`, replace the entire `describe('remove', ...)` block with:

```ts
describe('remove', () => {
  it('soft-deletes an ACTIVE customer (default)', async () => {
    const created = await repo.create('org-1', makeData())
    await service.remove(created.id, 'org-1', false)
    await expect(service.findOne(created.id, 'org-1')).rejects.toThrow(
      NotFoundException
    )
  })

  it('throws NotFoundException when soft-deleting an already-DELETED customer', async () => {
    const created = await repo.create('org-1', makeData())
    await repo.softDelete(created.id, 'org-1')
    await expect(service.remove(created.id, 'org-1', false)).rejects.toThrow(
      NotFoundException
    )
  })

  it('throws NotFoundException when soft-deleting a non-existent customer', async () => {
    await expect(service.remove('unknown', 'org-1', false)).rejects.toThrow(
      NotFoundException
    )
  })

  it('permanently deletes an ACTIVE customer', async () => {
    const created = await repo.create('org-1', makeData())
    await service.remove(created.id, 'org-1', true)
    await expect(service.remove(created.id, 'org-1', true)).rejects.toThrow(
      NotFoundException
    )
  })

  it('permanently deletes a DELETED customer (Owner cleaning up)', async () => {
    const created = await repo.create('org-1', makeData())
    await repo.softDelete(created.id, 'org-1')
    await expect(
      service.remove(created.id, 'org-1', true)
    ).resolves.toBeUndefined()
  })

  it('throws NotFoundException when permanently deleting from a different org', async () => {
    const created = await repo.create('org-1', makeData())
    await expect(service.remove(created.id, 'org-2', true)).rejects.toThrow(
      NotFoundException
    )
  })

  it('throws NotFoundException when permanently deleting an already-hard-deleted customer', async () => {
    const created = await repo.create('org-1', makeData())
    await repo.delete(created.id, 'org-1')
    await expect(service.remove(created.id, 'org-1', true)).rejects.toThrow(
      NotFoundException
    )
  })
})
```

Also add to `describe('findOne', ...)` a test for DELETED records. Insert after the last existing test:

```ts
it('throws NotFoundException for a DELETED customer', async () => {
  const created = await repo.create('org-1', makeData())
  await repo.softDelete(created.id, 'org-1')
  await expect(service.findOne(created.id, 'org-1')).rejects.toThrow(
    NotFoundException
  )
})
```

Add to `describe('findAll', ...)` after the last existing test:

```ts
it('does not include DELETED customers', async () => {
  const active = await repo.create('org-1', makeData({ firstName: 'Active' }))
  const deleted = await repo.create(
    'org-1',
    makeData({ firstName: 'Deleted', email: 'del@t.com' })
  )
  await repo.softDelete(deleted.id, 'org-1')
  const result = await service.findAll('org-1', {})
  expect(result.data.map(c => c.id)).toContain(active.id)
  expect(result.data.map(c => c.id)).not.toContain(deleted.id)
})
```

- [ ] **Step 2: Write failing controller test**

Create `apps/api/src/customers/customers.controller.spec.ts`:

```ts
import { ForbiddenException } from '@nestjs/common'
import { Test } from '@nestjs/testing'

import { Role } from '@glossops/database'

import type { AuthContext } from '@auth/interfaces'

import { CustomersController } from './customers.controller'
import { CustomersService } from './customers.service'

const makeAccount = (role: Role): AuthContext => ({
  sub: 'acc-1',
  memberId: 'mem-1',
  email: 'test@test.com',
  branchId: 'branch-1',
  organizationId: 'org-1',
  role,
})

describe('CustomersController', () => {
  let controller: CustomersController
  let service: { remove: jest.Mock }

  beforeEach(async () => {
    service = { remove: jest.fn().mockResolvedValue(undefined) }
    const module = await Test.createTestingModule({
      controllers: [CustomersController],
      providers: [{ provide: CustomersService, useValue: service }],
    }).compile()
    controller = module.get(CustomersController)
  })

  describe('remove', () => {
    it('throws ForbiddenException when Manager attempts permanent delete', () => {
      const account = makeAccount(Role.MANAGER)
      expect(() => controller.remove(account, 'cust-1', 'true')).toThrow(
        ForbiddenException
      )
      expect(service.remove).not.toHaveBeenCalled()
    })

    it('calls service.remove with permanent=true when Owner', () => {
      const account = makeAccount(Role.OWNER)
      controller.remove(account, 'cust-1', 'true')
      expect(service.remove).toHaveBeenCalledWith('cust-1', 'org-1', true)
    })

    it('calls service.remove with permanent=false when Manager does soft delete', () => {
      const account = makeAccount(Role.MANAGER)
      controller.remove(account, 'cust-1', undefined)
      expect(service.remove).toHaveBeenCalledWith('cust-1', 'org-1', false)
    })
  })
})
```

- [ ] **Step 3: Run tests — verify they fail**

```bash
pnpm --filter api test -- --testPathPattern="customers.service.spec|customers.controller.spec"
```

Expected: FAIL — `remove` doesn't accept `permanent` param yet, no ForbiddenException.

- [ ] **Step 4: Update CustomersService.remove**

In `apps/api/src/customers/customers.service.ts`, replace the `remove` method:

```ts
async remove(
  id: string,
  organizationId: string,
  permanent = false
): Promise<void> {
  if (permanent) {
    try {
      await this.customers.delete(id, organizationId)
    } catch {
      throw new NotFoundException({ error: 'customer_not_found' })
    }
  } else {
    await this.findOne(id, organizationId)
    await this.customers.softDelete(id, organizationId)
  }
}
```

- [ ] **Step 5: Update CustomersController.remove**

In `apps/api/src/customers/customers.controller.ts`, update the NestJS import to add `ForbiddenException`:

```ts
import {
  ForbiddenException,
  Controller,
  HttpCode,
  Delete,
  Param,
  Patch,
  Query,
  Body,
  Post,
  Get,
} from '@nestjs/common'
```

Then replace the `remove` method:

```ts
@Delete(':id')
@HttpCode(204)
@Roles(Role.OWNER, Role.MANAGER)
remove(
  @CurrentAccount() account: AuthContext,
  @Param('id') id: string,
  @Query('permanent') permanent?: string,
): Promise<void> {
  const isPermanent = permanent === 'true'
  if (isPermanent && account.role !== Role.OWNER) {
    throw new ForbiddenException({ error: 'forbidden' })
  }
  return this.customersService.remove(id, account.organizationId!, isPermanent)
}
```

- [ ] **Step 6: Run tests — verify they pass**

```bash
pnpm --filter api test -- --testPathPattern="customers.service.spec|customers.controller.spec"
```

Expected: all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/customers/customers.service.ts \
        apps/api/src/customers/customers.controller.ts \
        apps/api/src/customers/customers.service.spec.ts \
        apps/api/src/customers/customers.controller.spec.ts
git commit -m "$(printf '\xe2\x9c\xa8 feat(customers): add soft delete and hard delete with Owner-only guard for permanent\n')"
```

---

### Task 5: Organizations – Interface + InMemory Repository + Tests

**Files:**

- Modify: `apps/api/src/organizations/interfaces/organization.repository.interface.ts`
- Modify: `apps/api/src/organizations/infrastructure/in-memory-organization.repository.ts`
- Modify: `apps/api/src/organizations/infrastructure/in-memory-organization.repository.spec.ts`

- [ ] **Step 1: Write failing tests for softDelete/delete and DELETED-record filtering**

In `apps/api/src/organizations/infrastructure/in-memory-organization.repository.spec.ts`, add the following new `describe` blocks after the existing `describe('addMember', ...)` block:

```ts
describe('softDelete', () => {
  it('marks the organization as DELETED and hides it from findById', async () => {
    const { organization } = await repo.createWithBranch(
      { name: 'T', slug: 't' },
      'acc-1'
    )
    await repo.softDelete(organization.id)
    expect(await repo.findById(organization.id)).toBeNull()
  })

  it('rejects when organization does not exist', async () => {
    await expect(repo.softDelete('unknown')).rejects.toThrow(
      'organization not found'
    )
  })
})

describe('delete', () => {
  it('removes an ACTIVE organization from the store', async () => {
    const { organization } = await repo.createWithBranch(
      { name: 'T', slug: 't' },
      'acc-1'
    )
    await repo.delete(organization.id)
    expect(await repo.findById(organization.id)).toBeNull()
  })

  it('removes a DELETED organization from the store (hard delete any status)', async () => {
    const { organization } = await repo.createWithBranch(
      { name: 'T', slug: 't' },
      'acc-1'
    )
    await repo.softDelete(organization.id)
    await repo.delete(organization.id)
    expect(await repo.findById(organization.id)).toBeNull()
  })

  it('rejects when organization does not exist', async () => {
    await expect(repo.delete('unknown')).rejects.toThrow(
      'organization not found'
    )
  })
})
```

Also add to the existing `describe('findById', ...)` block, after the last existing test:

```ts
it('returns null for a DELETED organization', async () => {
  const { organization } = await repo.createWithBranch(
    { name: 'T', slug: 't' },
    'acc-1'
  )
  await repo.softDelete(organization.id)
  expect(await repo.findById(organization.id)).toBeNull()
})
```

Add to `describe('findAllByAccountId', ...)`, after the last existing test:

```ts
it('excludes DELETED organizations', async () => {
  const { organization: active } = await repo.createWithBranch(
    { name: 'Active', slug: 'active' },
    'acc-1'
  )
  const { organization: deleted } = await repo.createWithBranch(
    { name: 'Deleted', slug: 'deleted' },
    'acc-1'
  )
  await repo.softDelete(deleted.id)
  const orgs = await repo.findAllByAccountId('acc-1')
  expect(orgs.map(o => o.id)).toContain(active.id)
  expect(orgs.map(o => o.id)).not.toContain(deleted.id)
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
pnpm --filter api test -- --testPathPattern="in-memory-organization.repository"
```

Expected: FAIL — `softDelete is not a function`, `delete is not a function`, TS error on missing `status` in `createWithBranch`.

- [ ] **Step 3: Add softDelete and delete to OrganizationRepositoryInterface**

In `apps/api/src/organizations/interfaces/organization.repository.interface.ts`, add the two new methods after `update`:

```ts
export interface OrganizationRepositoryInterface {
  findById(id: string): Promise<Prisma.OrganizationModel | null>
  findAllByAccountId(accountId: string): Promise<OrganizationWithRole[]>
  update(id: string, data: UpdateOrgData): Promise<Prisma.OrganizationModel>
  softDelete(id: string): Promise<Prisma.OrganizationModel>
  delete(id: string): Promise<void>
  createWithBranch(
    data: CreateOrgData,
    accountId: string
  ): Promise<{
    organization: Prisma.OrganizationModel
    member: Prisma.OrganizationMemberModel
  }>
  listMembers(organizationId: string): Promise<MemberWithAccount[]>
  findMember(
    accountId: string,
    organizationId: string
  ): Promise<Prisma.OrganizationMemberModel | null>
  countMembershipsByAccount(accountId: string): Promise<number>
  addMember(
    organizationId: string,
    accountId: string,
    role: Role
  ): Promise<Prisma.OrganizationMemberModel>
}
```

- [ ] **Step 4: Update InMemoryOrganizationRepository**

Replace the full contents of `apps/api/src/organizations/infrastructure/in-memory-organization.repository.ts` with:

```ts
import { randomUUID } from 'crypto'

import { ResourceStatus, Role } from '@glossops/database'
import type { Prisma } from '@glossops/database'

import type {
  CreateOrgData,
  MemberWithAccount,
  OrganizationRepositoryInterface,
  OrganizationWithRole,
  UpdateOrgData,
} from '@organizations/interfaces'

export class InMemoryOrganizationRepository implements OrganizationRepositoryInterface {
  private organizations = new Map<string, Prisma.OrganizationModel>()
  private branches = new Map<string, Prisma.BranchModel>()
  private members = new Map<string, Prisma.OrganizationMemberModel>()
  private accounts = new Map<
    string,
    Pick<
      Prisma.AccountModel,
      'id' | 'email' | 'firstName' | 'lastName' | 'avatarUrl'
    >
  >()

  seedAccounts(
    accounts: Pick<
      Prisma.AccountModel,
      'id' | 'email' | 'firstName' | 'lastName' | 'avatarUrl'
    >[]
  ): void {
    accounts.forEach(a => this.accounts.set(a.id, a))
  }

  findById(id: string): Promise<Prisma.OrganizationModel | null> {
    const org = this.organizations.get(id)
    if (!org || org.status !== ResourceStatus.ACTIVE)
      return Promise.resolve(null)
    return Promise.resolve(org)
  }

  findAllByAccountId(accountId: string): Promise<OrganizationWithRole[]> {
    const result: OrganizationWithRole[] = []
    for (const member of this.members.values()) {
      if (member.accountId !== accountId) continue
      const branch = this.branches.get(member.branchId)
      if (!branch) continue
      const org = this.organizations.get(branch.organizationId)
      if (!org || org.status !== ResourceStatus.ACTIVE) continue
      result.push({ ...org, role: member.role })
    }
    return Promise.resolve(result)
  }

  update(id: string, data: UpdateOrgData): Promise<Prisma.OrganizationModel> {
    const org = this.organizations.get(id)
    if (!org) return Promise.reject(new Error('organization not found'))
    const updated = { ...org, ...data, updatedAt: new Date() }
    this.organizations.set(id, updated)
    return Promise.resolve(updated)
  }

  softDelete(id: string): Promise<Prisma.OrganizationModel> {
    const org = this.organizations.get(id)
    if (!org) return Promise.reject(new Error('organization not found'))
    const updated = {
      ...org,
      status: ResourceStatus.DELETED,
      updatedAt: new Date(),
    }
    this.organizations.set(id, updated)
    return Promise.resolve(updated)
  }

  delete(id: string): Promise<void> {
    if (!this.organizations.has(id))
      return Promise.reject(new Error('organization not found'))
    this.organizations.delete(id)
    return Promise.resolve()
  }

  createWithBranch(
    data: CreateOrgData,
    accountId: string
  ): Promise<{
    organization: Prisma.OrganizationModel
    member: Prisma.OrganizationMemberModel
  }> {
    const now = new Date()
    const orgId = randomUUID()
    const branchId = randomUUID()

    const organization: Prisma.OrganizationModel = {
      id: orgId,
      name: data.name,
      slug: data.slug,
      logoUrl: null,
      status: ResourceStatus.ACTIVE,
      createdAt: now,
      updatedAt: now,
    }

    const branch: Prisma.BranchModel = {
      id: branchId,
      organizationId: orgId,
      name: data.name,
      address: null,
      phone: null,
      email: null,
      isMain: true,
      createdAt: now,
      updatedAt: now,
    }

    const member: Prisma.OrganizationMemberModel = {
      id: randomUUID(),
      branchId,
      accountId,
      role: Role.OWNER,
      joinedAt: now,
    }

    this.organizations.set(orgId, organization)
    this.branches.set(branchId, branch)
    this.members.set(member.id, member)

    return Promise.resolve({ organization, member })
  }

  listMembers(organizationId: string): Promise<MemberWithAccount[]> {
    const orgBranchIds = new Set(
      [...this.branches.values()]
        .filter(b => b.organizationId === organizationId)
        .map(b => b.id)
    )

    const result: MemberWithAccount[] = []
    for (const member of this.members.values()) {
      if (!orgBranchIds.has(member.branchId)) continue
      const account = this.accounts.get(member.accountId)
      if (!account) continue
      result.push({ ...member, account })
    }
    return Promise.resolve(result)
  }

  findMember(
    accountId: string,
    organizationId: string
  ): Promise<Prisma.OrganizationMemberModel | null> {
    const orgBranchIds = new Set(
      [...this.branches.values()]
        .filter(b => b.organizationId === organizationId)
        .map(b => b.id)
    )

    for (const member of this.members.values()) {
      if (member.accountId === accountId && orgBranchIds.has(member.branchId)) {
        return Promise.resolve(member)
      }
    }
    return Promise.resolve(null)
  }

  countMembershipsByAccount(accountId: string): Promise<number> {
    const orgIds = new Set<string>()
    for (const member of this.members.values()) {
      if (member.accountId !== accountId) continue
      const branch = this.branches.get(member.branchId)
      if (branch) orgIds.add(branch.organizationId)
    }
    return Promise.resolve(orgIds.size)
  }

  addMember(
    organizationId: string,
    accountId: string,
    role: Role
  ): Promise<Prisma.OrganizationMemberModel> {
    const mainBranch = [...this.branches.values()].find(
      b => b.organizationId === organizationId && b.isMain
    )
    if (!mainBranch) return Promise.reject(new Error('main branch not found'))

    const member: Prisma.OrganizationMemberModel = {
      id: randomUUID(),
      branchId: mainBranch.id,
      accountId,
      role,
      joinedAt: new Date(),
    }
    this.members.set(member.id, member)
    return Promise.resolve(member)
  }
}
```

- [ ] **Step 5: Run tests — verify they pass**

```bash
pnpm --filter api test -- --testPathPattern="in-memory-organization.repository"
```

Expected: all tests PASS (including existing ones — newly created orgs are ACTIVE so all prior tests still pass).

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/organizations/interfaces/organization.repository.interface.ts \
        apps/api/src/organizations/infrastructure/in-memory-organization.repository.ts \
        apps/api/src/organizations/infrastructure/in-memory-organization.repository.spec.ts
git commit -m "$(printf '\xf0\x9f\xa7\xaa test(organizations): add softDelete, delete, and DELETED-record tests for in-memory repo\n')"
```

---

### Task 6: Organizations – Prisma Repository + Service + Controller + Specs

**Files:**

- Modify: `apps/api/src/organizations/infrastructure/prisma-organization.repository.ts`
- Modify: `apps/api/src/organizations/organizations.service.ts`
- Modify: `apps/api/src/organizations/organizations.controller.ts`
- Modify: `apps/api/src/organizations/organizations.service.spec.ts`

- [ ] **Step 1: Write failing service tests for removeOrganization**

In `apps/api/src/organizations/organizations.service.spec.ts`, add a new `describe('removeOrganization', ...)` block after the existing `describe('acceptInvitation', ...)` block:

```ts
describe('removeOrganization', () => {
  it('soft-deletes an ACTIVE organization', async () => {
    const { organization } = await organizations.createWithBranch(
      { name: 'T', slug: 't' },
      'acc-1'
    )
    await service.removeOrganization(organization.id, false)
    await expect(service.getMyOrganization(organization.id)).rejects.toThrow(
      NotFoundException
    )
  })

  it('throws NotFoundException when soft-deleting a DELETED organization', async () => {
    const { organization } = await organizations.createWithBranch(
      { name: 'T', slug: 't' },
      'acc-1'
    )
    await organizations.softDelete(organization.id)
    await expect(
      service.removeOrganization(organization.id, false)
    ).rejects.toThrow(NotFoundException)
  })

  it('throws NotFoundException when soft-deleting a non-existent organization', async () => {
    await expect(service.removeOrganization('unknown', false)).rejects.toThrow(
      NotFoundException
    )
  })

  it('permanently deletes an ACTIVE organization', async () => {
    const { organization } = await organizations.createWithBranch(
      { name: 'T', slug: 't' },
      'acc-1'
    )
    await service.removeOrganization(organization.id, true)
    await expect(service.getMyOrganization(organization.id)).rejects.toThrow(
      NotFoundException
    )
  })

  it('permanently deletes a DELETED organization (Owner cleaning up)', async () => {
    const { organization } = await organizations.createWithBranch(
      { name: 'T', slug: 't' },
      'acc-1'
    )
    await organizations.softDelete(organization.id)
    await expect(
      service.removeOrganization(organization.id, true)
    ).resolves.toBeUndefined()
  })

  it('throws NotFoundException when permanently deleting a non-existent organization', async () => {
    await expect(service.removeOrganization('unknown', true)).rejects.toThrow(
      NotFoundException
    )
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
pnpm --filter api test -- --testPathPattern="organizations.service.spec"
```

Expected: FAIL — `removeOrganization is not a function`.

- [ ] **Step 3: Update PrismaOrganizationRepository**

Replace the full contents of `apps/api/src/organizations/infrastructure/prisma-organization.repository.ts` with:

```ts
import { Injectable } from '@nestjs/common'

import { ResourceStatus, Role } from '@glossops/database'
import type { Prisma } from '@glossops/database'

import { PrismaService } from '@prisma'
import type {
  OrganizationRepositoryInterface,
  OrganizationWithRole,
  MemberWithAccount,
  CreateOrgData,
  UpdateOrgData,
} from '@organizations/interfaces'

@Injectable()
export class PrismaOrganizationRepository implements OrganizationRepositoryInterface {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<Prisma.OrganizationModel | null> {
    return this.prisma.organization.findFirst({
      where: { id, status: ResourceStatus.ACTIVE },
    })
  }

  async findAllByAccountId(accountId: string): Promise<OrganizationWithRole[]> {
    const members = await this.prisma.organizationMember.findMany({
      where: {
        accountId,
        branch: { organization: { status: ResourceStatus.ACTIVE } },
      },
      include: { branch: { include: { organization: true } } },
    })
    return members.map(m => ({ ...m.branch.organization, role: m.role }))
  }

  update(id: string, data: UpdateOrgData): Promise<Prisma.OrganizationModel> {
    return this.prisma.organization.update({ where: { id }, data })
  }

  async softDelete(id: string): Promise<Prisma.OrganizationModel> {
    return this.prisma.organization.update({
      where: { id },
      data: { status: ResourceStatus.DELETED },
    })
  }

  async delete(id: string): Promise<void> {
    const result = await this.prisma.organization.deleteMany({ where: { id } })
    if (result.count === 0) throw new Error('organization not found')
  }

  async createWithBranch(
    data: CreateOrgData,
    accountId: string
  ): Promise<{
    organization: Prisma.OrganizationModel
    member: Prisma.OrganizationMemberModel
  }> {
    const organization = await this.prisma.organization.create({
      data: { name: data.name, slug: data.slug },
    })

    const branch = await this.prisma.branch.create({
      data: { organizationId: organization.id, name: data.name, isMain: true },
    })

    const member = await this.prisma.organizationMember.create({
      data: { branchId: branch.id, accountId, role: Role.OWNER },
    })

    return { organization, member }
  }

  listMembers(organizationId: string): Promise<MemberWithAccount[]> {
    return this.prisma.organizationMember.findMany({
      where: { branch: { organizationId } },
      include: {
        account: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    }) as Promise<MemberWithAccount[]>
  }

  findMember(
    accountId: string,
    organizationId: string
  ): Promise<Prisma.OrganizationMemberModel | null> {
    return this.prisma.organizationMember.findFirst({
      where: { accountId, branch: { organizationId } },
    })
  }

  async countMembershipsByAccount(accountId: string): Promise<number> {
    const members = await this.prisma.organizationMember.findMany({
      where: { accountId },
      include: { branch: { select: { organizationId: true } } },
    })
    const orgIds = new Set(members.map(m => m.branch.organizationId))
    return orgIds.size
  }

  async addMember(
    organizationId: string,
    accountId: string,
    role: Role
  ): Promise<Prisma.OrganizationMemberModel> {
    const branch = await this.prisma.branch.findFirst({
      where: { organizationId, isMain: true },
    })
    return this.prisma.organizationMember.create({
      data: { branchId: branch!.id, accountId, role },
    })
  }
}
```

- [ ] **Step 4: Add removeOrganization to OrganizationService**

In `apps/api/src/organizations/organizations.service.ts`, add `removeOrganization` after the `updateOrganization` method:

```ts
async removeOrganization(
  organizationId: string,
  permanent: boolean
): Promise<void> {
  if (permanent) {
    try {
      await this.organizations.delete(organizationId)
    } catch {
      throw new NotFoundException({ error: 'organization_not_found' })
    }
  } else {
    const org = await this.organizations.findById(organizationId)
    if (!org) throw new NotFoundException({ error: 'organization_not_found' })
    await this.organizations.softDelete(organizationId)
  }
}
```

- [ ] **Step 5: Run service tests — verify they pass**

```bash
pnpm --filter api test -- --testPathPattern="organizations.service.spec"
```

Expected: all tests PASS.

- [ ] **Step 6: Add DELETE /organizations/me to OrganizationController**

In `apps/api/src/organizations/organizations.controller.ts`, update the NestJS import to add `Delete` and `Query`:

```ts
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Patch,
  Post,
  Query,
} from '@nestjs/common'
```

Then add the `removeOrganization` handler after the `updateOrganization` method:

```ts
@Delete('me')
@HttpCode(204)
@Roles(Role.OWNER)
removeOrganization(
  @CurrentAccount() account: AuthContext,
  @Query('permanent') permanent?: string,
): Promise<void> {
  return this.orgService.removeOrganization(
    account.organizationId!,
    permanent === 'true'
  )
}
```

- [ ] **Step 7: Run all tests to verify nothing is broken**

```bash
pnpm --filter api test
```

Expected: all suites PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/organizations/infrastructure/prisma-organization.repository.ts \
        apps/api/src/organizations/organizations.service.ts \
        apps/api/src/organizations/organizations.controller.ts \
        apps/api/src/organizations/organizations.service.spec.ts
git commit -m "$(printf '\xe2\x9c\xa8 feat(organizations): add soft delete and hard delete with Owner-only endpoint\n')"
```
