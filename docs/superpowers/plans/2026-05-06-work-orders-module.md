# Work Orders Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the WorkOrders module with full CRUD for work orders and nested work order items, plus status transition management.

**Architecture:** Two repository interfaces (`WorkOrderRepositoryInterface`, `WorkOrderItemRepositoryInterface`) are consumed by a single `WorkOrdersService`. Two controllers split concerns: `WorkOrdersController` handles work-order CRUD and status transitions; `WorkOrderItemsController` handles nested item management at `PATCH /work-orders/:id/items`. Work orders are org-scoped via `branchId → branch.organizationId`. The `branchId` comes from `account.branchId` (never from the DTO). The service owns `totalAmount` recalculation: after any item mutation it calls `workOrderItems.findAllByWorkOrder` and then `workOrders.update` with the recomputed sum (`syncTotal`).

**Tech Stack:** NestJS, TypeScript, Prisma ORM, PostgreSQL, class-validator, class-transformer, Jest

---

## File Map

**Create:**

- `apps/api/src/work-orders/work-orders.tokens.ts`
- `apps/api/src/work-orders/interfaces/work-order.repository.interface.ts`
- `apps/api/src/work-orders/interfaces/work-order-item.repository.interface.ts`
- `apps/api/src/work-orders/interfaces/index.ts`
- `apps/api/src/work-orders/dto/create-work-order.dto.ts`
- `apps/api/src/work-orders/dto/update-work-order.dto.ts`
- `apps/api/src/work-orders/dto/list-work-orders.dto.ts`
- `apps/api/src/work-orders/dto/transition-status.dto.ts`
- `apps/api/src/work-orders/dto/create-work-order-item.dto.ts`
- `apps/api/src/work-orders/dto/update-work-order-item.dto.ts`
- `apps/api/src/work-orders/dto/index.ts`
- `apps/api/src/work-orders/infrastructure/in-memory-work-order.repository.ts`
- `apps/api/src/work-orders/infrastructure/in-memory-work-order-item.repository.ts`
- `apps/api/src/work-orders/infrastructure/prisma-work-order.repository.ts`
- `apps/api/src/work-orders/infrastructure/prisma-work-order-item.repository.ts`
- `apps/api/src/work-orders/work-orders.service.ts`
- `apps/api/src/work-orders/work-orders.service.spec.ts`
- `apps/api/src/work-orders/work-orders.controller.ts`
- `apps/api/src/work-orders/work-orders.controller.spec.ts`
- `apps/api/src/work-orders/work-order-items.controller.ts`
- `apps/api/src/work-orders/work-order-items.controller.spec.ts`
- `apps/api/src/work-orders/work-orders.module.ts`
- `apps/api/src/work-orders/index.ts`

**Modify:**

- `apps/api/tsconfig.paths.json` — add `@work-orders` and `@work-orders/*` path aliases
- `apps/api/package.json` — add jest `moduleNameMapper` entries for `@work-orders`
- `apps/api/src/app.module.ts` — import `WorkOrdersModule`

---

## Task 1: DI Tokens, Repository Interfaces, and Shared Types

**Files:**

- Create: `apps/api/src/work-orders/work-orders.tokens.ts`
- Create: `apps/api/src/work-orders/interfaces/work-order.repository.interface.ts`
- Create: `apps/api/src/work-orders/interfaces/work-order-item.repository.interface.ts`
- Create: `apps/api/src/work-orders/interfaces/index.ts`

- [ ] **Step 1: Create DI injection tokens**

```typescript
// apps/api/src/work-orders/work-orders.tokens.ts
export const WORK_ORDER_REPOSITORY = Symbol('WorkOrderRepositoryInterface')
export const WORK_ORDER_ITEM_REPOSITORY = Symbol(
  'WorkOrderItemRepositoryInterface'
)
```

- [ ] **Step 2: Create WorkOrder repository interface**

```typescript
// apps/api/src/work-orders/interfaces/work-order.repository.interface.ts
import type { WorkOrderStatus, WorkOrderType, Prisma } from '@glossops/database'

export interface CreateWorkOrderData {
  branchId: string
  assetId: string
  type: WorkOrderType
  warrantyClaimId?: string
  scheduledAt?: Date
  note?: string
}

export interface UpdateWorkOrderData {
  scheduledAt?: Date | null
  note?: string | null
  totalAmount?: number
}

export interface WorkOrderQuery {
  status?: WorkOrderStatus
  assetId?: string
  page: number
  limit: number
}

export interface WorkOrderPageMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export type WorkOrderWithItems = Prisma.WorkOrderModel & {
  items: Prisma.WorkOrderItemModel[]
}

export interface WorkOrderPage {
  data: Prisma.WorkOrderModel[]
  meta: WorkOrderPageMeta
}

export interface WorkOrderRepositoryInterface {
  create(data: CreateWorkOrderData): Promise<Prisma.WorkOrderModel>
  findById(
    id: string,
    organizationId: string
  ): Promise<WorkOrderWithItems | null>
  findAll(organizationId: string, query: WorkOrderQuery): Promise<WorkOrderPage>
  update(
    id: string,
    organizationId: string,
    data: UpdateWorkOrderData
  ): Promise<Prisma.WorkOrderModel>
  updateStatus(
    id: string,
    organizationId: string,
    status: WorkOrderStatus,
    completedAt?: Date
  ): Promise<Prisma.WorkOrderModel>
  delete(id: string, organizationId: string): Promise<void>
}
```

- [ ] **Step 3: Create WorkOrderItem repository interface**

```typescript
// apps/api/src/work-orders/interfaces/work-order-item.repository.interface.ts
import type { Prisma } from '@glossops/database'

export interface CreateWorkOrderItemData {
  workOrderId: string
  serviceId: string
  description?: string
  quantity: number
  unitPrice: number
  discount: number
  isBillable: boolean
}

export interface UpdateWorkOrderItemData {
  serviceId?: string
  description?: string | null
  quantity?: number
  unitPrice?: number
  discount?: number
  isBillable?: boolean
}

export interface WorkOrderItemRepositoryInterface {
  create(data: CreateWorkOrderItemData): Promise<Prisma.WorkOrderItemModel>
  findById(
    id: string,
    workOrderId: string
  ): Promise<Prisma.WorkOrderItemModel | null>
  findAllByWorkOrder(workOrderId: string): Promise<Prisma.WorkOrderItemModel[]>
  update(
    id: string,
    workOrderId: string,
    data: UpdateWorkOrderItemData
  ): Promise<Prisma.WorkOrderItemModel>
  delete(id: string, workOrderId: string): Promise<void>
}
```

- [ ] **Step 4: Create barrel — ordered by line length, longest first**

```typescript
// apps/api/src/work-orders/interfaces/index.ts
export type { WorkOrderItemRepositoryInterface } from './work-order-item.repository.interface'
export type { WorkOrderRepositoryInterface } from './work-order.repository.interface'
export type { UpdateWorkOrderItemData } from './work-order-item.repository.interface'
export type { CreateWorkOrderItemData } from './work-order-item.repository.interface'
export type { WorkOrderWithItems } from './work-order.repository.interface'
export type { WorkOrderPageMeta } from './work-order.repository.interface'
export type { UpdateWorkOrderData } from './work-order.repository.interface'
export type { CreateWorkOrderData } from './work-order.repository.interface'
export type { WorkOrderQuery } from './work-order.repository.interface'
export type { WorkOrderPage } from './work-order.repository.interface'
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/work-orders/work-orders.tokens.ts \
        apps/api/src/work-orders/interfaces/
git commit -m "feat(work-orders): add DI tokens and repository interfaces"
```

---

## Task 2: DTOs

**Files:**

- Create: `apps/api/src/work-orders/dto/create-work-order.dto.ts`
- Create: `apps/api/src/work-orders/dto/update-work-order.dto.ts`
- Create: `apps/api/src/work-orders/dto/list-work-orders.dto.ts`
- Create: `apps/api/src/work-orders/dto/transition-status.dto.ts`
- Create: `apps/api/src/work-orders/dto/create-work-order-item.dto.ts`
- Create: `apps/api/src/work-orders/dto/update-work-order-item.dto.ts`
- Create: `apps/api/src/work-orders/dto/index.ts`

- [ ] **Step 1: Create CreateWorkOrderDto**

`branchId` is NOT in this DTO — it comes from `account.branchId` in the controller.

```typescript
// apps/api/src/work-orders/dto/create-work-order.dto.ts
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

import { WorkOrderType } from '@glossops/database'

export class CreateWorkOrderDto {
  @ApiProperty({ example: 'uuid-of-customer-asset' })
  @IsUUID()
  assetId: string

  @ApiPropertyOptional({ enum: WorkOrderType, default: WorkOrderType.STANDARD })
  @IsOptional()
  @IsEnum(WorkOrderType)
  type?: WorkOrderType

  @ApiPropertyOptional({ description: 'Required when type is WARRANTY_CLAIM' })
  @IsOptional()
  @IsUUID()
  warrantyClaimId?: string

  @ApiPropertyOptional({ example: '2026-05-10T10:00:00Z' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string

  @ApiPropertyOptional({ example: 'Customer requests premium vinyl' })
  @IsOptional()
  @IsString()
  note?: string
}
```

- [ ] **Step 2: Create UpdateWorkOrderDto**

```typescript
// apps/api/src/work-orders/dto/update-work-order.dto.ts
import { IsDateString, IsOptional, IsString } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class UpdateWorkOrderDto {
  @ApiPropertyOptional({ example: '2026-05-10T10:00:00Z', nullable: true })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string | null

  @ApiPropertyOptional({ example: 'Updated note', nullable: true })
  @IsOptional()
  @IsString()
  note?: string | null
}
```

- [ ] **Step 3: Create ListWorkOrdersDto**

```typescript
// apps/api/src/work-orders/dto/list-work-orders.dto.ts
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiPropertyOptional } from '@nestjs/swagger'

import { WorkOrderStatus } from '@glossops/database'

export class ListWorkOrdersDto {
  @ApiPropertyOptional({ enum: WorkOrderStatus })
  @IsOptional()
  @IsEnum(WorkOrderStatus)
  status?: WorkOrderStatus

  @ApiPropertyOptional({ example: 'uuid-of-customer-asset' })
  @IsOptional()
  @IsUUID()
  assetId?: string

  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number

  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number
}
```

- [ ] **Step 4: Create TransitionStatusDto**

```typescript
// apps/api/src/work-orders/dto/transition-status.dto.ts
import { IsEnum } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

import { WorkOrderStatus } from '@glossops/database'

export class TransitionStatusDto {
  @ApiProperty({ enum: WorkOrderStatus })
  @IsEnum(WorkOrderStatus)
  status: WorkOrderStatus
}
```

- [ ] **Step 5: Create CreateWorkOrderItemDto**

```typescript
// apps/api/src/work-orders/dto/create-work-order-item.dto.ts
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateWorkOrderItemDto {
  @ApiProperty({ example: 'uuid-of-service' })
  @IsUUID()
  serviceId: string

  @ApiPropertyOptional({ example: 'Window tint 35% rear' })
  @IsOptional()
  @IsString()
  description?: string

  @ApiPropertyOptional({ example: 1, minimum: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number

  @ApiProperty({ example: 1500.0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice: number

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discount?: number

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isBillable?: boolean
}
```

- [ ] **Step 6: Create UpdateWorkOrderItemDto**

```typescript
// apps/api/src/work-orders/dto/update-work-order-item.dto.ts
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class UpdateWorkOrderItemDto {
  @ApiPropertyOptional({ example: 'uuid-of-service' })
  @IsOptional()
  @IsUUID()
  serviceId?: string

  @ApiPropertyOptional({ example: 'Window tint 35% rear', nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null

  @ApiPropertyOptional({ example: 2, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number

  @ApiPropertyOptional({ example: 1500.0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice?: number

  @ApiPropertyOptional({ example: 100.0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discount?: number

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isBillable?: boolean
}
```

- [ ] **Step 7: Create dto/index.ts barrel — ordered by line length, longest first**

```typescript
// apps/api/src/work-orders/dto/index.ts
export { CreateWorkOrderItemDto } from './create-work-order-item.dto'
export { UpdateWorkOrderItemDto } from './update-work-order-item.dto'
export { TransitionStatusDto } from './transition-status.dto'
export { ListWorkOrdersDto } from './list-work-orders.dto'
export { CreateWorkOrderDto } from './create-work-order.dto'
export { UpdateWorkOrderDto } from './update-work-order.dto'
```

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/work-orders/dto/
git commit -m "feat(work-orders): add DTOs for work orders and items"
```

---

## Task 3: In-Memory Repositories

These are used exclusively by service tests. No direct tests for them here — behaviour is covered via the service spec in Task 4.

**Files:**

- Create: `apps/api/src/work-orders/infrastructure/in-memory-work-order.repository.ts`
- Create: `apps/api/src/work-orders/infrastructure/in-memory-work-order-item.repository.ts`

- [ ] **Step 1: Create InMemoryWorkOrderRepository**

Org-scoping uses a seeded branches map (`branchId → organizationId`). `setItemsGetter` connects the two in-memory repos so `findById` can include items without a direct dependency between them.

```typescript
// apps/api/src/work-orders/infrastructure/in-memory-work-order.repository.ts
import { randomUUID } from 'crypto'

import { Prisma, WorkOrderStatus, WorkOrderType } from '@glossops/database'

import type {
  WorkOrderRepositoryInterface,
  CreateWorkOrderData,
  UpdateWorkOrderData,
  WorkOrderQuery,
  WorkOrderPage,
  WorkOrderWithItems,
} from '@work-orders/interfaces'

export class InMemoryWorkOrderRepository implements WorkOrderRepositoryInterface {
  private store = new Map<string, Prisma.WorkOrderModel>()
  private branches = new Map<string, string>() // branchId → organizationId
  private getItems: (
    workOrderId: string
  ) => Promise<Prisma.WorkOrderItemModel[]> = () => Promise.resolve([])

  seedBranches(branches: { id: string; organizationId: string }[]): void {
    for (const b of branches) this.branches.set(b.id, b.organizationId)
  }

  setItemsGetter(
    fn: (workOrderId: string) => Promise<Prisma.WorkOrderItemModel[]>
  ): void {
    this.getItems = fn
  }

  private orgIdFor(branchId: string): string {
    return this.branches.get(branchId) ?? branchId
  }

  private belongsToOrg(
    wo: Prisma.WorkOrderModel,
    organizationId: string
  ): boolean {
    return this.orgIdFor(wo.branchId) === organizationId
  }

  create(data: CreateWorkOrderData): Promise<Prisma.WorkOrderModel> {
    const wo: Prisma.WorkOrderModel = {
      id: randomUUID(),
      branchId: data.branchId,
      assetId: data.assetId,
      type: data.type ?? WorkOrderType.STANDARD,
      warrantyClaimId: data.warrantyClaimId ?? null,
      status: WorkOrderStatus.DRAFT,
      scheduledAt: data.scheduledAt ?? null,
      completedAt: null,
      totalAmount: new Prisma.Decimal(0),
      note: data.note ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    this.store.set(wo.id, wo)
    return Promise.resolve(wo)
  }

  async findById(
    id: string,
    organizationId: string
  ): Promise<WorkOrderWithItems | null> {
    const wo = this.store.get(id)
    if (!wo || !this.belongsToOrg(wo, organizationId)) return null
    const items = await this.getItems(id)
    return { ...wo, items }
  }

  findAll(
    organizationId: string,
    query: WorkOrderQuery
  ): Promise<WorkOrderPage> {
    let items = Array.from(this.store.values()).filter(wo =>
      this.belongsToOrg(wo, organizationId)
    )

    if (query.status) items = items.filter(wo => wo.status === query.status)
    if (query.assetId) items = items.filter(wo => wo.assetId === query.assetId)

    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    const total = items.length
    const totalPages = total === 0 ? 0 : Math.ceil(total / query.limit)
    const data = items.slice(
      (query.page - 1) * query.limit,
      query.page * query.limit
    )

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

  update(
    id: string,
    _organizationId: string,
    data: UpdateWorkOrderData
  ): Promise<Prisma.WorkOrderModel> {
    const wo = this.store.get(id)!
    const updated: Prisma.WorkOrderModel = {
      ...wo,
      ...(data.scheduledAt !== undefined && {
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
      }),
      ...(data.note !== undefined && { note: data.note }),
      ...(data.totalAmount !== undefined && {
        totalAmount: new Prisma.Decimal(data.totalAmount),
      }),
      updatedAt: new Date(),
    }
    this.store.set(id, updated)
    return Promise.resolve(updated)
  }

  updateStatus(
    id: string,
    _organizationId: string,
    status: WorkOrderStatus,
    completedAt?: Date
  ): Promise<Prisma.WorkOrderModel> {
    const wo = this.store.get(id)!
    const updated: Prisma.WorkOrderModel = {
      ...wo,
      status,
      ...(completedAt && { completedAt }),
      updatedAt: new Date(),
    }
    this.store.set(id, updated)
    return Promise.resolve(updated)
  }

  delete(id: string, organizationId: string): Promise<void> {
    const wo = this.store.get(id)
    if (!wo || !this.belongsToOrg(wo, organizationId)) return Promise.resolve()
    this.store.delete(id)
    return Promise.resolve()
  }
}
```

- [ ] **Step 2: Create InMemoryWorkOrderItemRepository**

`subtotal` is computed on create and update using `Prisma.Decimal` arithmetic.

```typescript
// apps/api/src/work-orders/infrastructure/in-memory-work-order-item.repository.ts
import { randomUUID } from 'crypto'

import { Prisma } from '@glossops/database'

import type {
  WorkOrderItemRepositoryInterface,
  CreateWorkOrderItemData,
  UpdateWorkOrderItemData,
} from '@work-orders/interfaces'

export class InMemoryWorkOrderItemRepository implements WorkOrderItemRepositoryInterface {
  private store = new Map<string, Prisma.WorkOrderItemModel>()

  create(data: CreateWorkOrderItemData): Promise<Prisma.WorkOrderItemModel> {
    const unitPrice = new Prisma.Decimal(data.unitPrice)
    const discount = new Prisma.Decimal(data.discount)
    const subtotal = unitPrice.times(data.quantity).minus(discount)

    const item: Prisma.WorkOrderItemModel = {
      id: randomUUID(),
      workOrderId: data.workOrderId,
      serviceId: data.serviceId,
      description: data.description ?? null,
      quantity: data.quantity,
      unitPrice,
      discount,
      subtotal,
      isBillable: data.isBillable,
      createdAt: new Date(),
    }
    this.store.set(item.id, item)
    return Promise.resolve(item)
  }

  findById(
    id: string,
    workOrderId: string
  ): Promise<Prisma.WorkOrderItemModel | null> {
    const item = this.store.get(id)
    if (!item || item.workOrderId !== workOrderId) return Promise.resolve(null)
    return Promise.resolve(item)
  }

  findAllByWorkOrder(
    workOrderId: string
  ): Promise<Prisma.WorkOrderItemModel[]> {
    const items = Array.from(this.store.values()).filter(
      i => i.workOrderId === workOrderId
    )
    return Promise.resolve(items)
  }

  update(
    id: string,
    _workOrderId: string,
    data: UpdateWorkOrderItemData
  ): Promise<Prisma.WorkOrderItemModel> {
    const existing = this.store.get(id)!
    const quantity = data.quantity ?? existing.quantity
    const unitPrice =
      data.unitPrice !== undefined
        ? new Prisma.Decimal(data.unitPrice)
        : existing.unitPrice
    const discount =
      data.discount !== undefined
        ? new Prisma.Decimal(data.discount)
        : existing.discount
    const subtotal = unitPrice.times(quantity).minus(discount)

    const updated: Prisma.WorkOrderItemModel = {
      ...existing,
      ...(data.serviceId !== undefined && { serviceId: data.serviceId }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.isBillable !== undefined && { isBillable: data.isBillable }),
      quantity,
      unitPrice,
      discount,
      subtotal,
    }
    this.store.set(id, updated)
    return Promise.resolve(updated)
  }

  delete(id: string, _workOrderId: string): Promise<void> {
    this.store.delete(id)
    return Promise.resolve()
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/work-orders/infrastructure/in-memory-work-order.repository.ts \
        apps/api/src/work-orders/infrastructure/in-memory-work-order-item.repository.ts
git commit -m "feat(work-orders): add in-memory repository implementations"
```

---

## Task 4: WorkOrdersService — TDD

**Files:**

- Create (failing): `apps/api/src/work-orders/work-orders.service.spec.ts`
- Create (make pass): `apps/api/src/work-orders/work-orders.service.ts`

- [ ] **Step 1: Write failing service spec**

`woRepo.setItemsGetter` connects the two in-memory repos so `findById` returns items. Tests call `woRepo.updateStatus` directly to pre-set state without going through service validation.

```typescript
// apps/api/src/work-orders/work-orders.service.spec.ts
import { ConflictException, NotFoundException } from '@nestjs/common'
import { Test } from '@nestjs/testing'

import { WorkOrderStatus, WorkOrderType } from '@glossops/database'

import { InMemoryWorkOrderItemRepository } from './infrastructure/in-memory-work-order-item.repository'
import { InMemoryWorkOrderRepository } from './infrastructure/in-memory-work-order.repository'
import {
  WORK_ORDER_ITEM_REPOSITORY,
  WORK_ORDER_REPOSITORY,
} from './work-orders.tokens'
import { WorkOrdersService } from './work-orders.service'

const ORG = 'org-1'
const BRANCH = 'branch-1'
const ASSET = 'asset-1'
const SERVICE = 'service-1'

describe('WorkOrdersService', () => {
  let service: WorkOrdersService
  let woRepo: InMemoryWorkOrderRepository
  let itemRepo: InMemoryWorkOrderItemRepository

  beforeEach(async () => {
    woRepo = new InMemoryWorkOrderRepository()
    itemRepo = new InMemoryWorkOrderItemRepository()
    woRepo.seedBranches([{ id: BRANCH, organizationId: ORG }])
    woRepo.setItemsGetter(id => itemRepo.findAllByWorkOrder(id))

    const module = await Test.createTestingModule({
      providers: [
        WorkOrdersService,
        { provide: WORK_ORDER_REPOSITORY, useValue: woRepo },
        { provide: WORK_ORDER_ITEM_REPOSITORY, useValue: itemRepo },
      ],
    }).compile()

    service = module.get(WorkOrdersService)
  })

  describe('create', () => {
    it('creates a DRAFT work order with defaults', async () => {
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET })
      expect(wo.status).toBe(WorkOrderStatus.DRAFT)
      expect(wo.type).toBe(WorkOrderType.STANDARD)
      expect(wo.branchId).toBe(BRANCH)
      expect(Number(wo.totalAmount)).toBe(0)
    })

    it('uses provided type and scheduledAt', async () => {
      const wo = await service.create(BRANCH, ORG, {
        assetId: ASSET,
        type: WorkOrderType.WARRANTY_CLAIM,
        scheduledAt: '2026-06-01T09:00:00Z',
      })
      expect(wo.type).toBe(WorkOrderType.WARRANTY_CLAIM)
      expect(wo.scheduledAt).not.toBeNull()
    })
  })

  describe('findAll', () => {
    it('returns paginated work orders for the organization', async () => {
      await service.create(BRANCH, ORG, { assetId: ASSET })
      await service.create(BRANCH, ORG, { assetId: ASSET })
      const page = await service.findAll(ORG, {})
      expect(page.data).toHaveLength(2)
      expect(page.meta.total).toBe(2)
      expect(page.meta.page).toBe(1)
      expect(page.meta.limit).toBe(20)
    })

    it('filters by status', async () => {
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET })
      await service.create(BRANCH, ORG, { assetId: ASSET })
      await woRepo.updateStatus(wo.id, ORG, WorkOrderStatus.CONFIRMED)
      const page = await service.findAll(ORG, {
        status: WorkOrderStatus.CONFIRMED,
      })
      expect(page.data).toHaveLength(1)
      expect(page.data[0].status).toBe(WorkOrderStatus.CONFIRMED)
    })

    it('does not return work orders from other orgs', async () => {
      woRepo.seedBranches([{ id: 'branch-other', organizationId: 'org-other' }])
      await service.create('branch-other', 'org-other', { assetId: ASSET })
      const page = await service.findAll(ORG, {})
      expect(page.data).toHaveLength(0)
    })
  })

  describe('findOne', () => {
    it('returns the work order with items', async () => {
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET })
      await service.addItem(wo.id, ORG, {
        serviceId: SERVICE,
        unitPrice: 100,
        quantity: 1,
      })
      const found = await service.findOne(wo.id, ORG)
      expect(found.id).toBe(wo.id)
      expect(found.items).toHaveLength(1)
    })

    it('throws NotFoundException for unknown id', async () => {
      await expect(service.findOne('unknown', ORG)).rejects.toThrow(
        NotFoundException
      )
    })

    it('throws NotFoundException for another org', async () => {
      woRepo.seedBranches([{ id: 'branch-other', organizationId: 'org-other' }])
      const wo = await service.create('branch-other', 'org-other', {
        assetId: ASSET,
      })
      await expect(service.findOne(wo.id, ORG)).rejects.toThrow(
        NotFoundException
      )
    })
  })

  describe('update', () => {
    it('updates note', async () => {
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET })
      const updated = await service.update(wo.id, ORG, { note: 'VIP customer' })
      expect(updated.note).toBe('VIP customer')
    })

    it('clears scheduledAt when passed null', async () => {
      const wo = await service.create(BRANCH, ORG, {
        assetId: ASSET,
        scheduledAt: '2026-06-01T09:00:00Z',
      })
      const updated = await service.update(wo.id, ORG, { scheduledAt: null })
      expect(updated.scheduledAt).toBeNull()
    })

    it('throws NotFoundException when not found', async () => {
      await expect(
        service.update('unknown', ORG, { note: 'x' })
      ).rejects.toThrow(NotFoundException)
    })
  })

  describe('transition', () => {
    it('transitions DRAFT → CONFIRMED', async () => {
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET })
      const updated = await service.transition(
        wo.id,
        ORG,
        WorkOrderStatus.CONFIRMED
      )
      expect(updated.status).toBe(WorkOrderStatus.CONFIRMED)
    })

    it('transitions CONFIRMED → DRAFT (revert)', async () => {
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET })
      await woRepo.updateStatus(wo.id, ORG, WorkOrderStatus.CONFIRMED)
      const reverted = await service.transition(
        wo.id,
        ORG,
        WorkOrderStatus.DRAFT
      )
      expect(reverted.status).toBe(WorkOrderStatus.DRAFT)
    })

    it('transitions IN_PROGRESS → COMPLETED and sets completedAt', async () => {
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET })
      await woRepo.updateStatus(wo.id, ORG, WorkOrderStatus.CONFIRMED)
      await woRepo.updateStatus(wo.id, ORG, WorkOrderStatus.IN_PROGRESS)
      const completed = await service.transition(
        wo.id,
        ORG,
        WorkOrderStatus.COMPLETED
      )
      expect(completed.status).toBe(WorkOrderStatus.COMPLETED)
      expect(completed.completedAt).not.toBeNull()
    })

    it('throws ConflictException for invalid transition DRAFT → COMPLETED', async () => {
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET })
      await expect(
        service.transition(wo.id, ORG, WorkOrderStatus.COMPLETED)
      ).rejects.toThrow(ConflictException)
    })

    it('throws ConflictException when COMPLETED is terminal', async () => {
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET })
      await woRepo.updateStatus(wo.id, ORG, WorkOrderStatus.CONFIRMED)
      await woRepo.updateStatus(wo.id, ORG, WorkOrderStatus.IN_PROGRESS)
      await woRepo.updateStatus(wo.id, ORG, WorkOrderStatus.COMPLETED)
      await expect(
        service.transition(wo.id, ORG, WorkOrderStatus.CANCELLED)
      ).rejects.toThrow(ConflictException)
    })

    it('throws NotFoundException when not found', async () => {
      await expect(
        service.transition('unknown', ORG, WorkOrderStatus.CONFIRMED)
      ).rejects.toThrow(NotFoundException)
    })
  })

  describe('remove', () => {
    it('removes a DRAFT work order', async () => {
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET })
      await expect(service.remove(wo.id, ORG)).resolves.toBeUndefined()
      await expect(service.findOne(wo.id, ORG)).rejects.toThrow(
        NotFoundException
      )
    })

    it('throws ConflictException when status is not DRAFT', async () => {
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET })
      await woRepo.updateStatus(wo.id, ORG, WorkOrderStatus.CONFIRMED)
      await expect(service.remove(wo.id, ORG)).rejects.toThrow(
        ConflictException
      )
    })

    it('throws NotFoundException when not found', async () => {
      await expect(service.remove('unknown', ORG)).rejects.toThrow(
        NotFoundException
      )
    })
  })

  describe('addItem', () => {
    it('adds an item and updates totalAmount', async () => {
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET })
      await service.addItem(wo.id, ORG, {
        serviceId: SERVICE,
        unitPrice: 500,
        quantity: 2,
      })
      const found = await service.findOne(wo.id, ORG)
      expect(found.items).toHaveLength(1)
      expect(Number(found.totalAmount)).toBe(1000)
    })

    it('applies discount to subtotal and totalAmount', async () => {
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET })
      await service.addItem(wo.id, ORG, {
        serviceId: SERVICE,
        unitPrice: 100,
        quantity: 1,
        discount: 20,
      })
      const found = await service.findOne(wo.id, ORG)
      expect(Number(found.totalAmount)).toBe(80)
    })

    it('accumulates totalAmount across multiple items', async () => {
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET })
      await service.addItem(wo.id, ORG, {
        serviceId: SERVICE,
        unitPrice: 200,
        quantity: 1,
      })
      await service.addItem(wo.id, ORG, {
        serviceId: 'svc-2',
        unitPrice: 300,
        quantity: 2,
      })
      const found = await service.findOne(wo.id, ORG)
      expect(Number(found.totalAmount)).toBe(800)
    })

    it('throws ConflictException when work order is not DRAFT', async () => {
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET })
      await woRepo.updateStatus(wo.id, ORG, WorkOrderStatus.CONFIRMED)
      await expect(
        service.addItem(wo.id, ORG, {
          serviceId: SERVICE,
          unitPrice: 100,
          quantity: 1,
        })
      ).rejects.toThrow(ConflictException)
    })

    it('throws NotFoundException for unknown work order', async () => {
      await expect(
        service.addItem('unknown', ORG, {
          serviceId: SERVICE,
          unitPrice: 100,
          quantity: 1,
        })
      ).rejects.toThrow(NotFoundException)
    })
  })

  describe('getItems', () => {
    it('returns all items for the work order', async () => {
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET })
      await service.addItem(wo.id, ORG, {
        serviceId: SERVICE,
        unitPrice: 100,
        quantity: 1,
      })
      await service.addItem(wo.id, ORG, {
        serviceId: 'svc-2',
        unitPrice: 200,
        quantity: 1,
      })
      const items = await service.getItems(wo.id, ORG)
      expect(items).toHaveLength(2)
    })

    it('throws NotFoundException for unknown work order', async () => {
      await expect(service.getItems('unknown', ORG)).rejects.toThrow(
        NotFoundException
      )
    })
  })

  describe('updateItem', () => {
    it('updates item quantity and recalculates totalAmount', async () => {
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET })
      const item = await service.addItem(wo.id, ORG, {
        serviceId: SERVICE,
        unitPrice: 100,
        quantity: 1,
      })
      await service.updateItem(wo.id, item.id, ORG, { quantity: 3 })
      const found = await service.findOne(wo.id, ORG)
      expect(Number(found.totalAmount)).toBe(300)
    })

    it('throws NotFoundException for unknown item', async () => {
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET })
      await expect(
        service.updateItem(wo.id, 'unknown-item', ORG, { quantity: 2 })
      ).rejects.toThrow(NotFoundException)
    })

    it('throws ConflictException when work order is not DRAFT', async () => {
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET })
      const item = await service.addItem(wo.id, ORG, {
        serviceId: SERVICE,
        unitPrice: 100,
        quantity: 1,
      })
      await woRepo.updateStatus(wo.id, ORG, WorkOrderStatus.CONFIRMED)
      await expect(
        service.updateItem(wo.id, item.id, ORG, { quantity: 2 })
      ).rejects.toThrow(ConflictException)
    })
  })

  describe('removeItem', () => {
    it('removes item and recalculates totalAmount', async () => {
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET })
      const item = await service.addItem(wo.id, ORG, {
        serviceId: SERVICE,
        unitPrice: 100,
        quantity: 1,
      })
      await service.addItem(wo.id, ORG, {
        serviceId: 'svc-2',
        unitPrice: 200,
        quantity: 1,
      })
      await service.removeItem(wo.id, item.id, ORG)
      const found = await service.findOne(wo.id, ORG)
      expect(Number(found.totalAmount)).toBe(200)
    })

    it('throws NotFoundException for unknown item', async () => {
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET })
      await expect(
        service.removeItem(wo.id, 'unknown-item', ORG)
      ).rejects.toThrow(NotFoundException)
    })

    it('throws ConflictException when work order is not DRAFT', async () => {
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET })
      const item = await service.addItem(wo.id, ORG, {
        serviceId: SERVICE,
        unitPrice: 100,
        quantity: 1,
      })
      await woRepo.updateStatus(wo.id, ORG, WorkOrderStatus.CONFIRMED)
      await expect(service.removeItem(wo.id, item.id, ORG)).rejects.toThrow(
        ConflictException
      )
    })
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd apps/api && npx jest work-orders.service.spec.ts --no-coverage
```

Expected: FAIL — `Cannot find module './work-orders.service'`

- [ ] **Step 3: Implement WorkOrdersService**

Valid transitions: `DRAFT → CONFIRMED | CANCELLED`, `CONFIRMED → DRAFT | IN_PROGRESS | CANCELLED`, `IN_PROGRESS → COMPLETED | CANCELLED`. `COMPLETED` and `CANCELLED` are terminal.

```typescript
// apps/api/src/work-orders/work-orders.service.ts
import {
  ConflictException,
  Injectable,
  Inject,
  NotFoundException,
} from '@nestjs/common'

import { WorkOrderStatus, WorkOrderType, type Prisma } from '@glossops/database'

import type {
  WorkOrderRepositoryInterface,
  WorkOrderItemRepositoryInterface,
  WorkOrderWithItems,
  WorkOrderPage,
} from '@work-orders/interfaces'

import type {
  CreateWorkOrderDto,
  UpdateWorkOrderDto,
  ListWorkOrdersDto,
  CreateWorkOrderItemDto,
  UpdateWorkOrderItemDto,
} from './dto'
import {
  WORK_ORDER_ITEM_REPOSITORY,
  WORK_ORDER_REPOSITORY,
} from './work-orders.tokens'

const VALID_TRANSITIONS: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  [WorkOrderStatus.DRAFT]: [
    WorkOrderStatus.CONFIRMED,
    WorkOrderStatus.CANCELLED,
  ],
  [WorkOrderStatus.CONFIRMED]: [
    WorkOrderStatus.DRAFT,
    WorkOrderStatus.IN_PROGRESS,
    WorkOrderStatus.CANCELLED,
  ],
  [WorkOrderStatus.IN_PROGRESS]: [
    WorkOrderStatus.COMPLETED,
    WorkOrderStatus.CANCELLED,
  ],
  [WorkOrderStatus.COMPLETED]: [],
  [WorkOrderStatus.CANCELLED]: [],
}

@Injectable()
export class WorkOrdersService {
  constructor(
    @Inject(WORK_ORDER_REPOSITORY)
    private readonly workOrders: WorkOrderRepositoryInterface,
    @Inject(WORK_ORDER_ITEM_REPOSITORY)
    private readonly workOrderItems: WorkOrderItemRepositoryInterface
  ) {}

  create(
    branchId: string,
    _organizationId: string,
    dto: CreateWorkOrderDto
  ): Promise<Prisma.WorkOrderModel> {
    return this.workOrders.create({
      branchId,
      assetId: dto.assetId,
      type: dto.type ?? WorkOrderType.STANDARD,
      warrantyClaimId: dto.warrantyClaimId,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      note: dto.note,
    })
  }

  findAll(
    organizationId: string,
    dto: ListWorkOrdersDto
  ): Promise<WorkOrderPage> {
    return this.workOrders.findAll(organizationId, {
      status: dto.status,
      assetId: dto.assetId,
      page: dto.page ?? 1,
      limit: dto.limit ?? 20,
    })
  }

  async findOne(
    id: string,
    organizationId: string
  ): Promise<WorkOrderWithItems> {
    const wo = await this.workOrders.findById(id, organizationId)
    if (!wo) throw new NotFoundException({ error: 'work_order_not_found' })
    return wo
  }

  async update(
    id: string,
    organizationId: string,
    dto: UpdateWorkOrderDto
  ): Promise<Prisma.WorkOrderModel> {
    await this.findOne(id, organizationId)
    return this.workOrders.update(id, organizationId, {
      scheduledAt:
        dto.scheduledAt === null
          ? null
          : dto.scheduledAt
            ? new Date(dto.scheduledAt)
            : undefined,
      note: dto.note,
    })
  }

  async transition(
    id: string,
    organizationId: string,
    newStatus: WorkOrderStatus
  ): Promise<Prisma.WorkOrderModel> {
    const wo = await this.findOne(id, organizationId)
    if (!VALID_TRANSITIONS[wo.status].includes(newStatus)) {
      throw new ConflictException({ error: 'invalid_status_transition' })
    }
    const completedAt =
      newStatus === WorkOrderStatus.COMPLETED ? new Date() : undefined
    return this.workOrders.updateStatus(
      id,
      organizationId,
      newStatus,
      completedAt
    )
  }

  async remove(id: string, organizationId: string): Promise<void> {
    const wo = await this.findOne(id, organizationId)
    if (wo.status !== WorkOrderStatus.DRAFT) {
      throw new ConflictException({ error: 'work_order_not_deletable' })
    }
    await this.workOrders.delete(id, organizationId)
  }

  async addItem(
    workOrderId: string,
    organizationId: string,
    dto: CreateWorkOrderItemDto
  ): Promise<Prisma.WorkOrderItemModel> {
    const wo = await this.findOne(workOrderId, organizationId)
    if (wo.status !== WorkOrderStatus.DRAFT) {
      throw new ConflictException({ error: 'work_order_not_editable' })
    }
    const item = await this.workOrderItems.create({
      workOrderId,
      serviceId: dto.serviceId,
      description: dto.description,
      quantity: dto.quantity ?? 1,
      unitPrice: dto.unitPrice,
      discount: dto.discount ?? 0,
      isBillable: dto.isBillable ?? true,
    })
    await this.syncTotal(workOrderId, organizationId)
    return item
  }

  async getItems(
    workOrderId: string,
    organizationId: string
  ): Promise<Prisma.WorkOrderItemModel[]> {
    await this.findOne(workOrderId, organizationId)
    return this.workOrderItems.findAllByWorkOrder(workOrderId)
  }

  async updateItem(
    workOrderId: string,
    itemId: string,
    organizationId: string,
    dto: UpdateWorkOrderItemDto
  ): Promise<Prisma.WorkOrderItemModel> {
    const wo = await this.findOne(workOrderId, organizationId)
    if (wo.status !== WorkOrderStatus.DRAFT) {
      throw new ConflictException({ error: 'work_order_not_editable' })
    }
    const existing = await this.workOrderItems.findById(itemId, workOrderId)
    if (!existing)
      throw new NotFoundException({ error: 'work_order_item_not_found' })

    const updated = await this.workOrderItems.update(itemId, workOrderId, {
      serviceId: dto.serviceId,
      description: dto.description,
      quantity: dto.quantity,
      unitPrice: dto.unitPrice,
      discount: dto.discount,
      isBillable: dto.isBillable,
    })
    await this.syncTotal(workOrderId, organizationId)
    return updated
  }

  async removeItem(
    workOrderId: string,
    itemId: string,
    organizationId: string
  ): Promise<void> {
    const wo = await this.findOne(workOrderId, organizationId)
    if (wo.status !== WorkOrderStatus.DRAFT) {
      throw new ConflictException({ error: 'work_order_not_editable' })
    }
    const existing = await this.workOrderItems.findById(itemId, workOrderId)
    if (!existing)
      throw new NotFoundException({ error: 'work_order_item_not_found' })

    await this.workOrderItems.delete(itemId, workOrderId)
    await this.syncTotal(workOrderId, organizationId)
  }

  private async syncTotal(
    workOrderId: string,
    organizationId: string
  ): Promise<void> {
    const items = await this.workOrderItems.findAllByWorkOrder(workOrderId)
    const total = items.reduce((acc, i) => acc + Number(i.subtotal), 0)
    await this.workOrders.update(workOrderId, organizationId, {
      totalAmount: total,
    })
  }
}
```

- [ ] **Step 4: Run test to confirm they pass**

```bash
cd apps/api && npx jest work-orders.service.spec.ts --no-coverage
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/work-orders/work-orders.service.ts \
        apps/api/src/work-orders/work-orders.service.spec.ts
git commit -m "feat(work-orders): add service with TDD (CRUD, status transitions, items management)"
```

---

## Task 5: WorkOrdersController — TDD

**Files:**

- Create (failing): `apps/api/src/work-orders/work-orders.controller.spec.ts`
- Create (make pass): `apps/api/src/work-orders/work-orders.controller.ts`

- [ ] **Step 1: Write failing controller spec**

```typescript
// apps/api/src/work-orders/work-orders.controller.spec.ts
import { Test } from '@nestjs/testing'

import { Role, WorkOrderStatus } from '@glossops/database'

import type { AuthContext } from '@auth/interfaces'

import { WorkOrdersController } from './work-orders.controller'
import { WorkOrdersService } from './work-orders.service'

const makeAccount = (role: Role, branchId = 'branch-1'): AuthContext => ({
  sub: 'acc-1',
  memberId: 'mem-1',
  email: 'test@test.com',
  branchId,
  organizationId: 'org-1',
  role,
})

const OWNER = makeAccount(Role.OWNER)
const MANAGER = makeAccount(Role.MANAGER)

describe('WorkOrdersController', () => {
  let controller: WorkOrdersController
  let service: {
    create: jest.Mock
    findAll: jest.Mock
    findOne: jest.Mock
    update: jest.Mock
    transition: jest.Mock
    remove: jest.Mock
  }

  beforeEach(async () => {
    service = {
      create: jest.fn().mockResolvedValue({}),
      findAll: jest.fn().mockResolvedValue({ data: [], meta: {} }),
      findOne: jest.fn().mockResolvedValue({ items: [] }),
      update: jest.fn().mockResolvedValue({}),
      transition: jest.fn().mockResolvedValue({}),
      remove: jest.fn().mockResolvedValue(undefined),
    }
    const module = await Test.createTestingModule({
      controllers: [WorkOrdersController],
      providers: [{ provide: WorkOrdersService, useValue: service }],
    }).compile()
    controller = module.get(WorkOrdersController)
  })

  describe('create', () => {
    it('passes branchId and organizationId from account', async () => {
      const dto = { assetId: 'asset-1' } as never
      await controller.create(OWNER, dto)
      expect(service.create).toHaveBeenCalledWith('branch-1', 'org-1', dto)
    })
  })

  describe('findAll', () => {
    it('passes organizationId from account', async () => {
      await controller.findAll(MANAGER, {} as never)
      expect(service.findAll).toHaveBeenCalledWith('org-1', {})
    })
  })

  describe('findOne', () => {
    it('passes id and organizationId', async () => {
      await controller.findOne(OWNER, 'wo-1')
      expect(service.findOne).toHaveBeenCalledWith('wo-1', 'org-1')
    })
  })

  describe('update', () => {
    it('passes id, organizationId, and dto', async () => {
      await controller.update(MANAGER, 'wo-1', { note: 'updated' } as never)
      expect(service.update).toHaveBeenCalledWith('wo-1', 'org-1', {
        note: 'updated',
      })
    })
  })

  describe('transition', () => {
    it('passes id, organizationId, and new status', async () => {
      await controller.transition(MANAGER, 'wo-1', {
        status: WorkOrderStatus.CONFIRMED,
      } as never)
      expect(service.transition).toHaveBeenCalledWith(
        'wo-1',
        'org-1',
        WorkOrderStatus.CONFIRMED
      )
    })
  })

  describe('remove', () => {
    it('passes id and organizationId', async () => {
      await controller.remove(OWNER, 'wo-1')
      expect(service.remove).toHaveBeenCalledWith('wo-1', 'org-1')
    })
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd apps/api && npx jest work-orders.controller.spec.ts --no-coverage
```

Expected: FAIL — `Cannot find module './work-orders.controller'`

- [ ] **Step 3: Implement WorkOrdersController**

All roles can read (`findAll`, `findOne`). Create/update require OWNER, MANAGER, or FRONT_DESK. Delete requires OWNER or MANAGER. Status transitions are open to all roles (state machine in service enforces validity).

```typescript
// apps/api/src/work-orders/work-orders.controller.ts
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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'

import { Role } from '@glossops/database'

import { CurrentAccount, Roles } from '@auth/decorators'
import type { AuthContext } from '@auth/interfaces'

import {
  CreateWorkOrderDto,
  ListWorkOrdersDto,
  TransitionStatusDto,
  UpdateWorkOrderDto,
} from './dto'
import { WorkOrdersService } from './work-orders.service'

@ApiTags('Work Orders')
@ApiBearerAuth()
@Controller('work-orders')
export class WorkOrdersController {
  constructor(private readonly service: WorkOrdersService) {}

  @Post()
  @HttpCode(201)
  @Roles(Role.OWNER, Role.MANAGER, Role.FRONT_DESK)
  @ApiOperation({ summary: 'Create a new work order' })
  create(
    @CurrentAccount() account: AuthContext,
    @Body() dto: CreateWorkOrderDto
  ) {
    return this.service.create(account.branchId!, account.organizationId!, dto)
  }

  @Get()
  @ApiOperation({ summary: 'List work orders for the organization' })
  findAll(
    @CurrentAccount() account: AuthContext,
    @Query() dto: ListWorkOrdersDto
  ) {
    return this.service.findAll(account.organizationId!, dto)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a work order with its items' })
  findOne(@CurrentAccount() account: AuthContext, @Param('id') id: string) {
    return this.service.findOne(id, account.organizationId!)
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.MANAGER, Role.FRONT_DESK)
  @ApiOperation({ summary: 'Update work order metadata' })
  update(
    @CurrentAccount() account: AuthContext,
    @Param('id') id: string,
    @Body() dto: UpdateWorkOrderDto
  ) {
    return this.service.update(id, account.organizationId!, dto)
  }

  @Patch(':id/status')
  @Roles(Role.OWNER, Role.MANAGER, Role.TECHNICIAN, Role.FRONT_DESK)
  @ApiOperation({ summary: 'Transition work order status' })
  transition(
    @CurrentAccount() account: AuthContext,
    @Param('id') id: string,
    @Body() dto: TransitionStatusDto
  ) {
    return this.service.transition(id, account.organizationId!, dto.status)
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Delete a DRAFT work order' })
  remove(@CurrentAccount() account: AuthContext, @Param('id') id: string) {
    return this.service.remove(id, account.organizationId!)
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd apps/api && npx jest work-orders.controller.spec.ts --no-coverage
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/work-orders/work-orders.controller.ts \
        apps/api/src/work-orders/work-orders.controller.spec.ts
git commit -m "feat(work-orders): add WorkOrdersController with TDD"
```

---

## Task 6: WorkOrderItemsController — TDD

**Files:**

- Create (failing): `apps/api/src/work-orders/work-order-items.controller.spec.ts`
- Create (make pass): `apps/api/src/work-orders/work-order-items.controller.ts`

- [ ] **Step 1: Write failing controller spec**

```typescript
// apps/api/src/work-orders/work-order-items.controller.spec.ts
import { Test } from '@nestjs/testing'

import { Role } from '@glossops/database'

import type { AuthContext } from '@auth/interfaces'

import { WorkOrderItemsController } from './work-order-items.controller'
import { WorkOrdersService } from './work-orders.service'

const makeAccount = (role: Role): AuthContext => ({
  sub: 'acc-1',
  memberId: 'mem-1',
  email: 'test@test.com',
  branchId: 'branch-1',
  organizationId: 'org-1',
  role,
})

const OWNER = makeAccount(Role.OWNER)
const MANAGER = makeAccount(Role.MANAGER)

describe('WorkOrderItemsController', () => {
  let controller: WorkOrderItemsController
  let service: {
    getItems: jest.Mock
    addItem: jest.Mock
    updateItem: jest.Mock
    removeItem: jest.Mock
  }

  beforeEach(async () => {
    service = {
      getItems: jest.fn().mockResolvedValue([]),
      addItem: jest.fn().mockResolvedValue({}),
      updateItem: jest.fn().mockResolvedValue({}),
      removeItem: jest.fn().mockResolvedValue(undefined),
    }
    const module = await Test.createTestingModule({
      controllers: [WorkOrderItemsController],
      providers: [{ provide: WorkOrdersService, useValue: service }],
    }).compile()
    controller = module.get(WorkOrderItemsController)
  })

  describe('getItems', () => {
    it('passes workOrderId and organizationId to service', async () => {
      await controller.getItems(OWNER, 'wo-1')
      expect(service.getItems).toHaveBeenCalledWith('wo-1', 'org-1')
    })
  })

  describe('addItem', () => {
    it('passes workOrderId, organizationId, and dto', async () => {
      const dto = { serviceId: 'svc-1', unitPrice: 100, quantity: 1 } as never
      await controller.addItem(MANAGER, 'wo-1', dto)
      expect(service.addItem).toHaveBeenCalledWith('wo-1', 'org-1', dto)
    })
  })

  describe('updateItem', () => {
    it('passes workOrderId, itemId, organizationId, and dto', async () => {
      const dto = { quantity: 2 } as never
      await controller.updateItem(MANAGER, 'wo-1', 'item-1', dto)
      expect(service.updateItem).toHaveBeenCalledWith(
        'wo-1',
        'item-1',
        'org-1',
        dto
      )
    })
  })

  describe('removeItem', () => {
    it('passes workOrderId, itemId, and organizationId', async () => {
      await controller.removeItem(OWNER, 'wo-1', 'item-1')
      expect(service.removeItem).toHaveBeenCalledWith('wo-1', 'item-1', 'org-1')
    })
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd apps/api && npx jest work-order-items.controller.spec.ts --no-coverage
```

Expected: FAIL — `Cannot find module './work-order-items.controller'`

- [ ] **Step 3: Implement WorkOrderItemsController**

```typescript
// apps/api/src/work-orders/work-order-items.controller.ts
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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'

import { Role } from '@glossops/database'

import { CurrentAccount, Roles } from '@auth/decorators'
import type { AuthContext } from '@auth/interfaces'

import { CreateWorkOrderItemDto, UpdateWorkOrderItemDto } from './dto'
import { WorkOrdersService } from './work-orders.service'

@ApiTags('Work Order Items')
@ApiBearerAuth()
@Controller('work-orders/:workOrderId/items')
export class WorkOrderItemsController {
  constructor(private readonly service: WorkOrdersService) {}

  @Get()
  @ApiOperation({ summary: 'List all items in a work order' })
  getItems(
    @CurrentAccount() account: AuthContext,
    @Param('workOrderId') workOrderId: string
  ) {
    return this.service.getItems(workOrderId, account.organizationId!)
  }

  @Post()
  @HttpCode(201)
  @Roles(Role.OWNER, Role.MANAGER, Role.FRONT_DESK)
  @ApiOperation({ summary: 'Add an item to a DRAFT work order' })
  addItem(
    @CurrentAccount() account: AuthContext,
    @Param('workOrderId') workOrderId: string,
    @Body() dto: CreateWorkOrderItemDto
  ) {
    return this.service.addItem(workOrderId, account.organizationId!, dto)
  }

  @Patch(':itemId')
  @Roles(Role.OWNER, Role.MANAGER, Role.FRONT_DESK)
  @ApiOperation({ summary: 'Update an item in a DRAFT work order' })
  updateItem(
    @CurrentAccount() account: AuthContext,
    @Param('workOrderId') workOrderId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateWorkOrderItemDto
  ) {
    return this.service.updateItem(
      workOrderId,
      itemId,
      account.organizationId!,
      dto
    )
  }

  @Delete(':itemId')
  @HttpCode(204)
  @Roles(Role.OWNER, Role.MANAGER, Role.FRONT_DESK)
  @ApiOperation({ summary: 'Remove an item from a DRAFT work order' })
  removeItem(
    @CurrentAccount() account: AuthContext,
    @Param('workOrderId') workOrderId: string,
    @Param('itemId') itemId: string
  ) {
    return this.service.removeItem(workOrderId, itemId, account.organizationId!)
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd apps/api && npx jest work-order-items.controller.spec.ts --no-coverage
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/work-orders/work-order-items.controller.ts \
        apps/api/src/work-orders/work-order-items.controller.spec.ts
git commit -m "feat(work-orders): add WorkOrderItemsController with TDD"
```

---

## Task 7: Prisma Work Order Repository

**Files:**

- Create: `apps/api/src/work-orders/infrastructure/prisma-work-order.repository.ts`

- [ ] **Step 1: Implement PrismaWorkOrderRepository**

All queries filter `branch: { organizationId }` for tenant isolation. `findById` uses `include: { items: true }`. `findAll` runs a `$transaction` to get data and count in one round trip.

```typescript
// apps/api/src/work-orders/infrastructure/prisma-work-order.repository.ts
import { Injectable } from '@nestjs/common'

import { WorkOrderStatus, type Prisma } from '@glossops/database'

import { PrismaService } from '@prisma'
import type {
  WorkOrderRepositoryInterface,
  CreateWorkOrderData,
  UpdateWorkOrderData,
  WorkOrderQuery,
  WorkOrderPage,
  WorkOrderWithItems,
} from '@work-orders/interfaces'

@Injectable()
export class PrismaWorkOrderRepository implements WorkOrderRepositoryInterface {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateWorkOrderData): Promise<Prisma.WorkOrderModel> {
    return this.prisma.workOrder.create({
      data: {
        branchId: data.branchId,
        assetId: data.assetId,
        type: data.type,
        warrantyClaimId: data.warrantyClaimId,
        scheduledAt: data.scheduledAt,
        note: data.note,
      },
    })
  }

  findById(
    id: string,
    organizationId: string
  ): Promise<WorkOrderWithItems | null> {
    return this.prisma.workOrder.findFirst({
      where: { id, branch: { organizationId } },
      include: { items: true },
    }) as Promise<WorkOrderWithItems | null>
  }

  async findAll(
    organizationId: string,
    query: WorkOrderQuery
  ): Promise<WorkOrderPage> {
    const where = {
      branch: { organizationId },
      ...(query.status && { status: query.status }),
      ...(query.assetId && { assetId: query.assetId }),
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.workOrder.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.workOrder.count({ where }),
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

  update(
    id: string,
    organizationId: string,
    data: UpdateWorkOrderData
  ): Promise<Prisma.WorkOrderModel> {
    return this.prisma.workOrder.update({
      where: { id, branch: { organizationId } },
      data: {
        ...(data.scheduledAt !== undefined && {
          scheduledAt: data.scheduledAt,
        }),
        ...(data.note !== undefined && { note: data.note }),
        ...(data.totalAmount !== undefined && {
          totalAmount: data.totalAmount,
        }),
      },
    })
  }

  updateStatus(
    id: string,
    organizationId: string,
    status: WorkOrderStatus,
    completedAt?: Date
  ): Promise<Prisma.WorkOrderModel> {
    return this.prisma.workOrder.update({
      where: { id, branch: { organizationId } },
      data: {
        status,
        ...(completedAt && { completedAt }),
      },
    })
  }

  async delete(id: string, organizationId: string): Promise<void> {
    await this.prisma.workOrder.delete({
      where: { id, branch: { organizationId } },
    })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/work-orders/infrastructure/prisma-work-order.repository.ts
git commit -m "feat(work-orders): add Prisma work order repository"
```

---

## Task 8: Prisma Work Order Item Repository

**Files:**

- Create: `apps/api/src/work-orders/infrastructure/prisma-work-order-item.repository.ts`

- [ ] **Step 1: Implement PrismaWorkOrderItemRepository**

`create` computes `subtotal = unitPrice * quantity - discount` before persisting. `update` wraps in `$transaction` to read current values before recomputing subtotal.

```typescript
// apps/api/src/work-orders/infrastructure/prisma-work-order-item.repository.ts
import { Injectable } from '@nestjs/common'

import type { Prisma } from '@glossops/database'

import { PrismaService } from '@prisma'
import type {
  WorkOrderItemRepositoryInterface,
  CreateWorkOrderItemData,
  UpdateWorkOrderItemData,
} from '@work-orders/interfaces'

@Injectable()
export class PrismaWorkOrderItemRepository implements WorkOrderItemRepositoryInterface {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateWorkOrderItemData): Promise<Prisma.WorkOrderItemModel> {
    const subtotal = data.unitPrice * data.quantity - data.discount
    return this.prisma.workOrderItem.create({
      data: {
        workOrderId: data.workOrderId,
        serviceId: data.serviceId,
        description: data.description,
        quantity: data.quantity,
        unitPrice: data.unitPrice,
        discount: data.discount,
        subtotal,
        isBillable: data.isBillable,
      },
    })
  }

  findById(
    id: string,
    workOrderId: string
  ): Promise<Prisma.WorkOrderItemModel | null> {
    return this.prisma.workOrderItem.findFirst({ where: { id, workOrderId } })
  }

  findAllByWorkOrder(
    workOrderId: string
  ): Promise<Prisma.WorkOrderItemModel[]> {
    return this.prisma.workOrderItem.findMany({ where: { workOrderId } })
  }

  update(
    id: string,
    workOrderId: string,
    data: UpdateWorkOrderItemData
  ): Promise<Prisma.WorkOrderItemModel> {
    return this.prisma.$transaction(async tx => {
      const existing = await tx.workOrderItem.findFirst({
        where: { id, workOrderId },
      })
      const quantity = data.quantity ?? existing!.quantity
      const unitPrice =
        data.unitPrice !== undefined
          ? data.unitPrice
          : Number(existing!.unitPrice)
      const discount =
        data.discount !== undefined ? data.discount : Number(existing!.discount)
      const subtotal = unitPrice * quantity - discount

      return tx.workOrderItem.update({
        where: { id },
        data: {
          ...(data.serviceId !== undefined && { serviceId: data.serviceId }),
          ...(data.description !== undefined && {
            description: data.description,
          }),
          ...(data.isBillable !== undefined && { isBillable: data.isBillable }),
          quantity,
          unitPrice,
          discount,
          subtotal,
        },
      })
    })
  }

  async delete(id: string, _workOrderId: string): Promise<void> {
    await this.prisma.workOrderItem.delete({ where: { id } })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/work-orders/infrastructure/prisma-work-order-item.repository.ts
git commit -m "feat(work-orders): add Prisma work order item repository"
```

---

## Task 9: Module Wiring, Path Aliases, and AppModule Registration

**Files:**

- Create: `apps/api/src/work-orders/work-orders.module.ts`
- Create: `apps/api/src/work-orders/index.ts`
- Modify: `apps/api/tsconfig.paths.json`
- Modify: `apps/api/package.json`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Create WorkOrdersModule**

```typescript
// apps/api/src/work-orders/work-orders.module.ts
import { Module } from '@nestjs/common'

import { PrismaModule } from '@prisma'

import { PrismaWorkOrderItemRepository } from './infrastructure/prisma-work-order-item.repository'
import { PrismaWorkOrderRepository } from './infrastructure/prisma-work-order.repository'
import { WorkOrderItemsController } from './work-order-items.controller'
import { WorkOrdersController } from './work-orders.controller'
import {
  WORK_ORDER_ITEM_REPOSITORY,
  WORK_ORDER_REPOSITORY,
} from './work-orders.tokens'
import { WorkOrdersService } from './work-orders.service'

@Module({
  imports: [PrismaModule],
  controllers: [WorkOrdersController, WorkOrderItemsController],
  providers: [
    { provide: WORK_ORDER_REPOSITORY, useClass: PrismaWorkOrderRepository },
    {
      provide: WORK_ORDER_ITEM_REPOSITORY,
      useClass: PrismaWorkOrderItemRepository,
    },
    WorkOrdersService,
  ],
})
export class WorkOrdersModule {}
```

- [ ] **Step 2: Create module barrel**

Ordered by line length, longest first:

```typescript
// apps/api/src/work-orders/index.ts
export { WorkOrdersModule } from './work-orders.module'
export { WorkOrdersService } from './work-orders.service'
```

- [ ] **Step 3: Add path aliases to tsconfig.paths.json**

Inside `"paths"`, add after the last `@brands/*` entry:

```json
"@work-orders": ["./src/work-orders/index.ts"],
"@work-orders/dto": ["./src/work-orders/dto/index.ts"],
"@work-orders/interfaces": ["./src/work-orders/interfaces/index.ts"]
```

- [ ] **Step 4: Add jest moduleNameMapper entries to package.json**

Inside `"jest"."moduleNameMapper"`, add after the last `@brands/*` entry:

```json
"^@work-orders$": "<rootDir>/work-orders/index.ts",
"^@work-orders/dto$": "<rootDir>/work-orders/dto/index.ts",
"^@work-orders/interfaces$": "<rootDir>/work-orders/interfaces/index.ts"
```

- [ ] **Step 5: Register WorkOrdersModule in AppModule**

Add import at the top of `apps/api/src/app.module.ts` (maintaining alphabetical/tier order after `SuppliersModule`):

```typescript
import { WorkOrdersModule } from './work-orders/work-orders.module'
```

Add `WorkOrdersModule` to the `@Module` imports array after `SuppliersModule`:

```typescript
SuppliersModule,
WorkOrdersModule,
```

- [ ] **Step 6: Run all work-orders tests to verify everything passes**

```bash
cd apps/api && npx jest --testPathPattern=work-orders --no-coverage
```

Expected: All tests PASS (service spec + both controller specs).

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/work-orders/work-orders.module.ts \
        apps/api/src/work-orders/index.ts \
        apps/api/tsconfig.paths.json \
        apps/api/package.json \
        apps/api/src/app.module.ts
git commit -m "feat(work-orders): wire WorkOrdersModule and register in AppModule"
```

---

## Self-Review

### Spec Coverage

| Requirement                                               | Covered in                                     |
| --------------------------------------------------------- | ---------------------------------------------- |
| WorkOrder CRUD (create, list, get, update, delete)        | Tasks 1–5, 7                                   |
| Nested WorkOrderItem CRUD (add, list, update, remove)     | Tasks 1–4, 6, 8                                |
| Status transitions with state machine validation          | Task 4 (service `VALID_TRANSITIONS`)           |
| `totalAmount` recalculation after item mutations          | Task 4 (`syncTotal` in service)                |
| `subtotal = unitPrice × quantity − discount`              | Tasks 3, 8                                     |
| Org-scoped queries via `branchId → branch.organizationId` | Tasks 3, 7                                     |
| `branchId` from `account.branchId`, not from DTO          | Task 5 (controller)                            |
| Hard delete only for DRAFT work orders                    | Task 4 (`remove` guard)                        |
| Item CRUD blocked on non-DRAFT work orders                | Task 4 (`addItem`, `updateItem`, `removeItem`) |
| Prisma tenant-safe implementations                        | Tasks 7, 8                                     |
| NestJS module wiring                                      | Task 9                                         |
| Path aliases and jest moduleNameMapper                    | Task 9                                         |

### Placeholder Scan

No TBDs, TODOs, or "fill in later" patterns. All steps contain the full code an implementer needs.

### Type Consistency

- `WorkOrderWithItems` defined in Task 1, returned by `service.findOne` in Task 4 — consistent.
- `WORK_ORDER_REPOSITORY` / `WORK_ORDER_ITEM_REPOSITORY` defined in Task 1, injected in Tasks 4, 9 — consistent.
- `CreateWorkOrderItemDto` fields (`serviceId`, `unitPrice`, `quantity`, `discount`, `isBillable`) used in Task 4 `addItem` match Task 2 DTO — consistent.
- `UpdateWorkOrderData.totalAmount` used in `syncTotal` (Task 4) matches interface definition in Task 1 — consistent.
- `InMemoryWorkOrderRepository.setItemsGetter` defined in Task 3, called in Task 4 spec — consistent.
- `woRepo.updateStatus` called directly in service spec (Task 4) is a public method on the InMemory repo (Task 3) — consistent.
