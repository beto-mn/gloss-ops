# Warranties Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the `warranties` module — auto-generate warranty records on WO completion, expose read/void HTTP endpoints, and validate WARRANTY_CLAIM references in the work orders flow.

**Architecture:** Repository pattern identical to all other domain modules. `WarrantyService` is exported from `WarrantiesModule` and injected into `WorkOrdersService` (same pattern as `InventoryService`). The warranty repository owns all cross-table queries (items+services join for generation; org-scoping joins for reads) — `WarrantiesModule` never imports `WorkOrdersModule`, avoiding circular deps.

**Tech Stack:** NestJS, TypeScript, Prisma ORM, Jest with in-memory repositories.

---

## File Map

**Create:**

- `apps/api/src/warranties/interfaces/warranty.repository.interface.ts`
- `apps/api/src/warranties/interfaces/index.ts`
- `apps/api/src/warranties/infrastructure/in-memory-warranty.repository.ts`
- `apps/api/src/warranties/infrastructure/prisma-warranty.repository.ts`
- `apps/api/src/warranties/dto/void-warranty.dto.ts`
- `apps/api/src/warranties/dto/index.ts`
- `apps/api/src/warranties/warranties.tokens.ts`
- `apps/api/src/warranties/warranties.service.ts`
- `apps/api/src/warranties/warranties.service.spec.ts`
- `apps/api/src/warranties/warranties.controller.ts`
- `apps/api/src/warranties/warranties.controller.spec.ts`
- `apps/api/src/warranties/work-order-warranties.controller.ts`
- `apps/api/src/warranties/work-order-warranties.controller.spec.ts`
- `apps/api/src/warranties/asset-warranties.controller.ts`
- `apps/api/src/warranties/asset-warranties.controller.spec.ts`
- `apps/api/src/warranties/warranties.module.ts`
- `apps/api/src/warranties/index.ts`

**Modify:**

- `apps/api/tsconfig.paths.json` — add `@warranties`, `@warranties/dto`, `@warranties/interfaces`
- `apps/api/package.json` — add same three entries to `jest.moduleNameMapper`
- `apps/api/src/app.module.ts` — import `WarrantiesModule`
- `apps/api/src/work-orders/work-orders.service.ts` — inject `WarrantyService`, add two call sites
- `apps/api/src/work-orders/work-orders.module.ts` — import `WarrantiesModule`
- `apps/api/src/work-orders/work-orders.service.spec.ts` — add `WarrantyService` mock + new test cases

---

## Task 1: Foundation — interface, in-memory repository, DTO, tokens

**Files:**

- Create: `apps/api/src/warranties/interfaces/warranty.repository.interface.ts`
- Create: `apps/api/src/warranties/interfaces/index.ts`
- Create: `apps/api/src/warranties/infrastructure/in-memory-warranty.repository.ts`
- Create: `apps/api/src/warranties/dto/void-warranty.dto.ts`
- Create: `apps/api/src/warranties/dto/index.ts`
- Create: `apps/api/src/warranties/warranties.tokens.ts`

- [ ] **Step 1: Create `warranty.repository.interface.ts`**

```typescript
// apps/api/src/warranties/interfaces/warranty.repository.interface.ts
export interface WarrantyRecord {
  id: string
  workOrderItemId: string
  serviceId: string
  branchId: string
  description: string
  term: string | null
  validFrom: Date
  validUntil: Date
  isVoid: boolean
  voidReason: string | null
  createdAt: Date
  updatedAt: Date
}

export interface WarrantyWithAsset {
  id: string
  isVoid: boolean
  validUntil: Date
  assetId: string
}

export interface ItemForGeneration {
  id: string
  serviceId: string
  service: {
    warrantyDays: number | null
    warrantyDescription: string | null
    warrantyTerm: string | null
    name: string
  }
}

export interface CreateWarrantyData {
  workOrderItemId: string
  serviceId: string
  description: string
  term: string | null
  validFrom: Date
  validUntil: Date
}

export interface WarrantyRepositoryInterface {
  createMany(data: CreateWarrantyData[]): Promise<WarrantyRecord[]>
  findItemsForGeneration(workOrderId: string): Promise<ItemForGeneration[]>
  findById(id: string, organizationId: string): Promise<WarrantyRecord | null>
  findByWorkOrder(
    workOrderId: string,
    organizationId: string
  ): Promise<WarrantyRecord[]>
  findByAsset(
    assetId: string,
    organizationId: string
  ): Promise<WarrantyRecord[]>
  findForClaimValidation(
    warrantyId: string,
    organizationId: string
  ): Promise<WarrantyWithAsset | null>
  void(id: string, reason: string): Promise<WarrantyRecord>
}
```

- [ ] **Step 2: Create `interfaces/index.ts`**

```typescript
// apps/api/src/warranties/interfaces/index.ts
export type { WarrantyRepositoryInterface } from './warranty.repository.interface'
export type { ItemForGeneration } from './warranty.repository.interface'
export type { CreateWarrantyData } from './warranty.repository.interface'
export type { WarrantyWithAsset } from './warranty.repository.interface'
export type { WarrantyRecord } from './warranty.repository.interface'
```

- [ ] **Step 3: Create `in-memory-warranty.repository.ts`**

```typescript
// apps/api/src/warranties/infrastructure/in-memory-warranty.repository.ts
import { randomUUID } from 'crypto'

import { Injectable } from '@nestjs/common'

import type {
  WarrantyRepositoryInterface,
  ItemForGeneration,
  CreateWarrantyData,
  WarrantyWithAsset,
  WarrantyRecord,
} from '@warranties/interfaces'

interface ItemContext {
  workOrderId: string
  assetId: string
  branchId: string
  organizationId: string
}

@Injectable()
export class InMemoryWarrantyRepository implements WarrantyRepositoryInterface {
  readonly store = new Map<string, WarrantyRecord>()
  private readonly itemContexts = new Map<string, ItemContext>()
  private readonly itemsForGeneration = new Map<string, ItemForGeneration[]>()

  seedItemContext(workOrderItemId: string, ctx: ItemContext): void {
    this.itemContexts.set(workOrderItemId, ctx)
  }

  seedItemsForGeneration(
    workOrderId: string,
    items: ItemForGeneration[]
  ): void {
    this.itemsForGeneration.set(workOrderId, items)
  }

  async createMany(data: CreateWarrantyData[]): Promise<WarrantyRecord[]> {
    return data.map(d => {
      const ctx = this.itemContexts.get(d.workOrderItemId)
      const record: WarrantyRecord = {
        id: randomUUID(),
        workOrderItemId: d.workOrderItemId,
        serviceId: d.serviceId,
        branchId: ctx?.branchId ?? '',
        description: d.description,
        term: d.term,
        validFrom: d.validFrom,
        validUntil: d.validUntil,
        isVoid: false,
        voidReason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      this.store.set(record.id, record)
      return record
    })
  }

  findItemsForGeneration(workOrderId: string): Promise<ItemForGeneration[]> {
    return Promise.resolve(this.itemsForGeneration.get(workOrderId) ?? [])
  }

  async findById(
    id: string,
    organizationId: string
  ): Promise<WarrantyRecord | null> {
    const record = this.store.get(id)
    if (!record) return null
    const ctx = this.itemContexts.get(record.workOrderItemId)
    if (!ctx || ctx.organizationId !== organizationId) return null
    return record
  }

  findByWorkOrder(
    workOrderId: string,
    organizationId: string
  ): Promise<WarrantyRecord[]> {
    return Promise.resolve(
      Array.from(this.store.values()).filter(r => {
        const ctx = this.itemContexts.get(r.workOrderItemId)
        return (
          ctx &&
          ctx.workOrderId === workOrderId &&
          ctx.organizationId === organizationId
        )
      })
    )
  }

  findByAsset(
    assetId: string,
    organizationId: string
  ): Promise<WarrantyRecord[]> {
    return Promise.resolve(
      Array.from(this.store.values()).filter(r => {
        const ctx = this.itemContexts.get(r.workOrderItemId)
        return (
          ctx &&
          ctx.assetId === assetId &&
          ctx.organizationId === organizationId
        )
      })
    )
  }

  async findForClaimValidation(
    warrantyId: string,
    organizationId: string
  ): Promise<WarrantyWithAsset | null> {
    const record = this.store.get(warrantyId)
    if (!record) return null
    const ctx = this.itemContexts.get(record.workOrderItemId)
    if (!ctx || ctx.organizationId !== organizationId) return null
    return {
      id: record.id,
      isVoid: record.isVoid,
      validUntil: record.validUntil,
      assetId: ctx.assetId,
    }
  }

  async void(id: string, reason: string): Promise<WarrantyRecord> {
    const record = this.store.get(id)!
    const updated: WarrantyRecord = {
      ...record,
      isVoid: true,
      voidReason: reason,
      updatedAt: new Date(),
    }
    this.store.set(id, updated)
    return updated
  }
}
```

- [ ] **Step 4: Create `dto/void-warranty.dto.ts` and `dto/index.ts`**

```typescript
// apps/api/src/warranties/dto/void-warranty.dto.ts
import { IsNotEmpty, IsString } from 'class-validator'

export class VoidWarrantyDto {
  @IsString()
  @IsNotEmpty()
  reason!: string
}
```

```typescript
// apps/api/src/warranties/dto/index.ts
export { VoidWarrantyDto } from './void-warranty.dto'
```

- [ ] **Step 5: Create `warranties.tokens.ts`**

```typescript
// apps/api/src/warranties/warranties.tokens.ts
export const WARRANTY_REPOSITORY = Symbol('WarrantyRepositoryInterface')
```

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/warranties/interfaces/ \
        apps/api/src/warranties/infrastructure/in-memory-warranty.repository.ts \
        apps/api/src/warranties/dto/ \
        apps/api/src/warranties/warranties.tokens.ts
```

Run the commit skill (`/commit`).

---

## Task 2: WarrantyService — tests first, then implementation

**Files:**

- Create: `apps/api/src/warranties/warranties.service.spec.ts`
- Create: `apps/api/src/warranties/warranties.service.ts`

- [ ] **Step 1: Add path aliases so the spec can resolve `@warranties/interfaces`**

In `apps/api/tsconfig.paths.json`, add inside the `paths` object (after the last `@work-order-assignments` entries):

```json
"@warranties": ["./src/warranties/index.ts"],
"@warranties/dto": ["./src/warranties/dto/index.ts"],
"@warranties/interfaces": ["./src/warranties/interfaces/index.ts"]
```

In `apps/api/package.json`, inside `"jest"."moduleNameMapper"`, add after the last `@work-order-assignments` entries:

```json
"^@warranties$": "<rootDir>/warranties/index.ts",
"^@warranties/dto$": "<rootDir>/warranties/dto/index.ts",
"^@warranties/interfaces$": "<rootDir>/warranties/interfaces/index.ts"
```

- [ ] **Step 2: Write the failing service spec**

```typescript
// apps/api/src/warranties/warranties.service.spec.ts
import { Test, type TestingModule } from '@nestjs/testing'
import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { ActivityAction } from '@glossops/database'

import { InMemoryWarrantyRepository } from './infrastructure/in-memory-warranty.repository'
import { WARRANTY_REPOSITORY } from './warranties.tokens'
import { ActivityLogsService } from '../activity-logs/activity-logs.service'
import { WarrantyService } from './warranties.service'

const ORG_ID = 'org-1'
const BRANCH_ID = 'branch-1'
const ACCOUNT_ID = 'acc-1'
const WO_ID = 'wo-1'
const ASSET_ID = 'asset-1'
const ITEM_ID = 'item-1'
const SERVICE_ID = 'svc-1'

const makeItemCtx = () => ({
  workOrderId: WO_ID,
  assetId: ASSET_ID,
  branchId: BRANCH_ID,
  organizationId: ORG_ID,
})

describe('WarrantyService', () => {
  let service: WarrantyService
  let repo: InMemoryWarrantyRepository
  let activityLogs: jest.Mocked<Pick<ActivityLogsService, 'record'>>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WarrantyService,
        {
          provide: WARRANTY_REPOSITORY,
          useClass: InMemoryWarrantyRepository,
        },
        {
          provide: ActivityLogsService,
          useValue: { record: jest.fn() },
        },
      ],
    }).compile()

    service = module.get(WarrantyService)
    repo = module.get(WARRANTY_REPOSITORY)
    activityLogs = module.get(ActivityLogsService)
  })

  afterEach(() => {
    repo.store.clear()
    jest.clearAllMocks()
  })

  // ── generateForWorkOrder ───────────────────────────────────────────────────

  describe('generateForWorkOrder', () => {
    const completedAt = new Date('2026-05-20T10:00:00Z')

    it('creates warranties for items with warrantyDays > 0', async () => {
      repo.seedItemsForGeneration(WO_ID, [
        {
          id: ITEM_ID,
          serviceId: SERVICE_ID,
          service: {
            warrantyDays: 365,
            warrantyDescription: 'Full wrap warranty',
            warrantyTerm: '12 months',
            name: 'Full Wrap',
          },
        },
      ])
      repo.seedItemContext(ITEM_ID, makeItemCtx())

      await service.generateForWorkOrder(WO_ID, ORG_ID, completedAt)

      expect(repo.store.size).toBe(1)
      const [w] = Array.from(repo.store.values())
      expect(w.workOrderItemId).toBe(ITEM_ID)
      expect(w.serviceId).toBe(SERVICE_ID)
      expect(w.description).toBe('Full wrap warranty')
      expect(w.term).toBe('12 months')
      expect(w.validFrom).toEqual(completedAt)
      expect(w.validUntil).toEqual(new Date('2027-05-20T10:00:00Z'))
      expect(w.isVoid).toBe(false)
    })

    it('uses service.name as fallback when warrantyDescription is null', async () => {
      repo.seedItemsForGeneration(WO_ID, [
        {
          id: ITEM_ID,
          serviceId: SERVICE_ID,
          service: {
            warrantyDays: 90,
            warrantyDescription: null,
            warrantyTerm: null,
            name: 'Ceramic Coating',
          },
        },
      ])
      repo.seedItemContext(ITEM_ID, makeItemCtx())

      await service.generateForWorkOrder(WO_ID, ORG_ID, completedAt)

      const [w] = Array.from(repo.store.values())
      expect(w.description).toBe('Ceramic Coating')
      expect(w.term).toBeNull()
    })

    it('skips items with warrantyDays = null', async () => {
      repo.seedItemsForGeneration(WO_ID, [
        {
          id: ITEM_ID,
          serviceId: SERVICE_ID,
          service: {
            warrantyDays: null,
            warrantyDescription: null,
            warrantyTerm: null,
            name: 'Detail',
          },
        },
      ])

      await service.generateForWorkOrder(WO_ID, ORG_ID, completedAt)

      expect(repo.store.size).toBe(0)
    })

    it('skips items with warrantyDays = 0', async () => {
      repo.seedItemsForGeneration(WO_ID, [
        {
          id: ITEM_ID,
          serviceId: SERVICE_ID,
          service: {
            warrantyDays: 0,
            warrantyDescription: null,
            warrantyTerm: null,
            name: 'Tint',
          },
        },
      ])

      await service.generateForWorkOrder(WO_ID, ORG_ID, completedAt)

      expect(repo.store.size).toBe(0)
    })

    it('returns without error when no items qualify', async () => {
      repo.seedItemsForGeneration(WO_ID, [])

      await expect(
        service.generateForWorkOrder(WO_ID, ORG_ID, completedAt)
      ).resolves.toBeUndefined()
    })
  })

  // ── validateClaim ──────────────────────────────────────────────────────────

  describe('validateClaim', () => {
    const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
    const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24)

    const seedValidWarranty = (
      overrides: Partial<{
        isVoid: boolean
        validUntil: Date
        assetId: string
      }> = {}
    ) => {
      repo.seedItemContext(ITEM_ID, makeItemCtx())
      const warrantyId = 'w-1'
      repo.store.set(warrantyId, {
        id: warrantyId,
        workOrderItemId: ITEM_ID,
        serviceId: SERVICE_ID,
        branchId: BRANCH_ID,
        description: 'Warranty',
        term: null,
        validFrom: new Date(),
        validUntil: overrides.validUntil ?? futureDate,
        isVoid: overrides.isVoid ?? false,
        voidReason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      const assetId = overrides.assetId ?? ASSET_ID
      if (assetId !== ASSET_ID) {
        repo.seedItemContext(ITEM_ID, { ...makeItemCtx(), assetId })
      }
      return warrantyId
    }

    it('resolves without error for a valid warranty', async () => {
      const warrantyId = seedValidWarranty()
      await expect(
        service.validateClaim(warrantyId, ASSET_ID, ORG_ID)
      ).resolves.toBeUndefined()
    })

    it('throws 404 warranty_not_found when warranty does not exist', async () => {
      await expect(
        service.validateClaim('nonexistent', ASSET_ID, ORG_ID)
      ).rejects.toBeInstanceOf(NotFoundException)
      await expect(
        service.validateClaim('nonexistent', ASSET_ID, ORG_ID)
      ).rejects.toMatchObject({ response: { error: 'warranty_not_found' } })
    })

    it('throws 422 warranty_voided when isVoid = true', async () => {
      const warrantyId = seedValidWarranty({ isVoid: true })
      await expect(
        service.validateClaim(warrantyId, ASSET_ID, ORG_ID)
      ).rejects.toBeInstanceOf(UnprocessableEntityException)
      await expect(
        service.validateClaim(warrantyId, ASSET_ID, ORG_ID)
      ).rejects.toMatchObject({ response: { error: 'warranty_voided' } })
    })

    it('throws 422 warranty_expired when validUntil < now', async () => {
      const warrantyId = seedValidWarranty({ validUntil: pastDate })
      await expect(
        service.validateClaim(warrantyId, ASSET_ID, ORG_ID)
      ).rejects.toBeInstanceOf(UnprocessableEntityException)
      await expect(
        service.validateClaim(warrantyId, ASSET_ID, ORG_ID)
      ).rejects.toMatchObject({ response: { error: 'warranty_expired' } })
    })

    it('throws 422 warranty_asset_mismatch when assetId differs', async () => {
      const warrantyId = seedValidWarranty()
      await expect(
        service.validateClaim(warrantyId, 'other-asset', ORG_ID)
      ).rejects.toBeInstanceOf(UnprocessableEntityException)
      await expect(
        service.validateClaim(warrantyId, 'other-asset', ORG_ID)
      ).rejects.toMatchObject({
        response: { error: 'warranty_asset_mismatch' },
      })
    })
  })

  // ── findOne ────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('returns the warranty record', async () => {
      repo.seedItemContext(ITEM_ID, makeItemCtx())
      const id = 'w-1'
      repo.store.set(id, {
        id,
        workOrderItemId: ITEM_ID,
        serviceId: SERVICE_ID,
        branchId: BRANCH_ID,
        description: 'W',
        term: null,
        validFrom: new Date(),
        validUntil: new Date(),
        isVoid: false,
        voidReason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await service.findOne(id, ORG_ID)
      expect(result.id).toBe(id)
    })

    it('throws 404 warranty_not_found when not found', async () => {
      await expect(
        service.findOne('nonexistent', ORG_ID)
      ).rejects.toMatchObject({ response: { error: 'warranty_not_found' } })
    })
  })

  // ── findByWorkOrder ────────────────────────────────────────────────────────

  describe('findByWorkOrder', () => {
    it('returns warranties for the work order', async () => {
      repo.seedItemContext(ITEM_ID, makeItemCtx())
      repo.seedItemsForGeneration(WO_ID, [
        {
          id: ITEM_ID,
          serviceId: SERVICE_ID,
          service: {
            warrantyDays: 30,
            warrantyDescription: 'W',
            warrantyTerm: null,
            name: 'Svc',
          },
        },
      ])
      await service.generateForWorkOrder(WO_ID, ORG_ID, new Date())

      const results = await service.findByWorkOrder(WO_ID, ORG_ID)
      expect(results).toHaveLength(1)
    })
  })

  // ── findByAsset ────────────────────────────────────────────────────────────

  describe('findByAsset', () => {
    it('returns warranties for the asset', async () => {
      repo.seedItemContext(ITEM_ID, makeItemCtx())
      repo.seedItemsForGeneration(WO_ID, [
        {
          id: ITEM_ID,
          serviceId: SERVICE_ID,
          service: {
            warrantyDays: 30,
            warrantyDescription: 'W',
            warrantyTerm: null,
            name: 'Svc',
          },
        },
      ])
      await service.generateForWorkOrder(WO_ID, ORG_ID, new Date())

      const results = await service.findByAsset(ASSET_ID, ORG_ID)
      expect(results).toHaveLength(1)
    })
  })

  // ── void ───────────────────────────────────────────────────────────────────

  describe('void', () => {
    const seedWarranty = () => {
      repo.seedItemContext(ITEM_ID, makeItemCtx())
      const id = 'w-1'
      repo.store.set(id, {
        id,
        workOrderItemId: ITEM_ID,
        serviceId: SERVICE_ID,
        branchId: BRANCH_ID,
        description: 'W',
        term: null,
        validFrom: new Date(),
        validUntil: new Date(),
        isVoid: false,
        voidReason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      return id
    }

    it('voids the warranty and returns updated record', async () => {
      const id = seedWarranty()
      activityLogs.record.mockResolvedValue(undefined)

      const result = await service.void(
        id,
        'Customer request',
        ORG_ID,
        ACCOUNT_ID
      )

      expect(result.isVoid).toBe(true)
      expect(result.voidReason).toBe('Customer request')
    })

    it('calls activityLogs.record with UPDATED action', async () => {
      const id = seedWarranty()
      activityLogs.record.mockResolvedValue(undefined)

      await service.void(id, 'Damage', ORG_ID, ACCOUNT_ID)

      expect(activityLogs.record).toHaveBeenCalledWith({
        organizationId: ORG_ID,
        branchId: BRANCH_ID,
        accountId: ACCOUNT_ID,
        action: ActivityAction.UPDATED,
        entity: 'Warranty',
        entityId: id,
        metadata: { isVoid: true, reason: 'Damage' },
      })
    })

    it('throws 409 warranty_already_voided when already voided', async () => {
      const id = seedWarranty()
      repo.store.set(id, { ...repo.store.get(id)!, isVoid: true })

      await expect(
        service.void(id, 'reason', ORG_ID, ACCOUNT_ID)
      ).rejects.toMatchObject({
        response: { error: 'warranty_already_voided' },
      })
      expect(activityLogs.record).not.toHaveBeenCalled()
    })

    it('throws 404 warranty_not_found when warranty does not exist', async () => {
      await expect(
        service.void('nonexistent', 'reason', ORG_ID, ACCOUNT_ID)
      ).rejects.toMatchObject({ response: { error: 'warranty_not_found' } })
      expect(activityLogs.record).not.toHaveBeenCalled()
    })
  })
})
```

- [ ] **Step 3: Run the spec and confirm it fails**

```bash
cd apps/api && pnpm test warranties.service.spec.ts --no-coverage 2>&1 | tail -20
```

Expected: tests fail with `Cannot find module` or `WarrantyService is not defined`.

- [ ] **Step 4: Create `warranties.service.ts`**

```typescript
// apps/api/src/warranties/warranties.service.ts
import {
  UnprocessableEntityException,
  ConflictException,
  NotFoundException,
  Injectable,
  Inject,
} from '@nestjs/common'
import { ActivityAction } from '@glossops/database'

import type {
  WarrantyRepositoryInterface,
  CreateWarrantyData,
  WarrantyRecord,
} from '@warranties/interfaces'

import { ActivityLogsService } from '../activity-logs/activity-logs.service'
import { WARRANTY_REPOSITORY } from './warranties.tokens'

@Injectable()
export class WarrantyService {
  constructor(
    @Inject(WARRANTY_REPOSITORY)
    private readonly repo: WarrantyRepositoryInterface,
    private readonly activityLogs: ActivityLogsService
  ) {}

  async generateForWorkOrder(
    workOrderId: string,
    organizationId: string,
    completedAt: Date
  ): Promise<void> {
    const items = await this.repo.findItemsForGeneration(workOrderId)
    const qualifying = items.filter(
      item => item.service.warrantyDays != null && item.service.warrantyDays > 0
    )
    if (qualifying.length === 0) return

    const data: CreateWarrantyData[] = qualifying.map(item => {
      const validUntil = new Date(completedAt)
      validUntil.setDate(validUntil.getDate() + item.service.warrantyDays!)
      return {
        workOrderItemId: item.id,
        serviceId: item.serviceId,
        description: item.service.warrantyDescription ?? item.service.name,
        term: item.service.warrantyTerm ?? null,
        validFrom: completedAt,
        validUntil,
      }
    })
    await this.repo.createMany(data)
  }

  async validateClaim(
    warrantyClaimId: string,
    assetId: string,
    organizationId: string
  ): Promise<void> {
    const warranty = await this.repo.findForClaimValidation(
      warrantyClaimId,
      organizationId
    )
    if (!warranty) throw new NotFoundException({ error: 'warranty_not_found' })
    if (warranty.isVoid)
      throw new UnprocessableEntityException({ error: 'warranty_voided' })
    if (warranty.validUntil < new Date())
      throw new UnprocessableEntityException({ error: 'warranty_expired' })
    if (warranty.assetId !== assetId)
      throw new UnprocessableEntityException({
        error: 'warranty_asset_mismatch',
      })
  }

  async findOne(id: string, organizationId: string): Promise<WarrantyRecord> {
    const record = await this.repo.findById(id, organizationId)
    if (!record) throw new NotFoundException({ error: 'warranty_not_found' })
    return record
  }

  findByWorkOrder(
    workOrderId: string,
    organizationId: string
  ): Promise<WarrantyRecord[]> {
    return this.repo.findByWorkOrder(workOrderId, organizationId)
  }

  findByAsset(
    assetId: string,
    organizationId: string
  ): Promise<WarrantyRecord[]> {
    return this.repo.findByAsset(assetId, organizationId)
  }

  async void(
    id: string,
    reason: string,
    organizationId: string,
    accountId: string
  ): Promise<WarrantyRecord> {
    const record = await this.findOne(id, organizationId)
    if (record.isVoid)
      throw new ConflictException({ error: 'warranty_already_voided' })
    const updated = await this.repo.void(id, reason)
    await this.activityLogs.record({
      organizationId,
      branchId: record.branchId,
      accountId,
      action: ActivityAction.UPDATED,
      entity: 'Warranty',
      entityId: id,
      metadata: { isVoid: true, reason },
    })
    return updated
  }
}
```

- [ ] **Step 5: Run spec and confirm all tests pass**

```bash
cd apps/api && pnpm test warranties.service.spec.ts --no-coverage 2>&1 | tail -20
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

Stage `tsconfig.paths.json`, `package.json`, `warranties.service.ts`, `warranties.service.spec.ts` and run the commit skill (`/commit`).

---

## Task 3: Controllers — tests first, then implementations

**Files:**

- Create: `apps/api/src/warranties/warranties.controller.spec.ts`
- Create: `apps/api/src/warranties/warranties.controller.ts`
- Create: `apps/api/src/warranties/work-order-warranties.controller.spec.ts`
- Create: `apps/api/src/warranties/work-order-warranties.controller.ts`
- Create: `apps/api/src/warranties/asset-warranties.controller.spec.ts`
- Create: `apps/api/src/warranties/asset-warranties.controller.ts`

- [ ] **Step 1: Write the failing specs for all three controllers**

```typescript
// apps/api/src/warranties/warranties.controller.spec.ts
import { Test } from '@nestjs/testing'
import { Role } from '@glossops/database'
import type { AuthContext } from '@auth/interfaces'
import { WarrantiesController } from './warranties.controller'
import { WarrantyService } from './warranties.service'

const makeAccount = (role: Role): AuthContext => ({
  sub: 'acc-1',
  memberId: 'mem-1',
  email: 'test@test.com',
  branchId: 'branch-1',
  organizationId: 'org-1',
  role,
})
const OWNER = makeAccount(Role.OWNER)

describe('WarrantiesController', () => {
  let controller: WarrantiesController
  let service: { findOne: jest.Mock; void: jest.Mock }

  beforeEach(async () => {
    service = {
      findOne: jest.fn().mockResolvedValue({}),
      void: jest.fn().mockResolvedValue({}),
    }
    const module = await Test.createTestingModule({
      controllers: [WarrantiesController],
      providers: [{ provide: WarrantyService, useValue: service }],
    }).compile()
    controller = module.get(WarrantiesController)
  })

  describe('findOne', () => {
    it('calls service.findOne with id and organizationId', async () => {
      await controller.findOne('w-1', OWNER)
      expect(service.findOne).toHaveBeenCalledWith('w-1', 'org-1')
    })
  })

  describe('void', () => {
    it('calls service.void with id, reason, organizationId, and accountId', async () => {
      await controller.void('w-1', { reason: 'Damage' }, OWNER)
      expect(service.void).toHaveBeenCalledWith(
        'w-1',
        'Damage',
        'org-1',
        'acc-1'
      )
    })
  })
})
```

```typescript
// apps/api/src/warranties/work-order-warranties.controller.spec.ts
import { Test } from '@nestjs/testing'
import { Role } from '@glossops/database'
import type { AuthContext } from '@auth/interfaces'
import { WorkOrderWarrantiesController } from './work-order-warranties.controller'
import { WarrantyService } from './warranties.service'

const makeAccount = (role: Role): AuthContext => ({
  sub: 'acc-1',
  memberId: 'mem-1',
  email: 'test@test.com',
  branchId: 'branch-1',
  organizationId: 'org-1',
  role,
})
const OWNER = makeAccount(Role.OWNER)

describe('WorkOrderWarrantiesController', () => {
  let controller: WorkOrderWarrantiesController
  let service: { findByWorkOrder: jest.Mock }

  beforeEach(async () => {
    service = { findByWorkOrder: jest.fn().mockResolvedValue([]) }
    const module = await Test.createTestingModule({
      controllers: [WorkOrderWarrantiesController],
      providers: [{ provide: WarrantyService, useValue: service }],
    }).compile()
    controller = module.get(WorkOrderWarrantiesController)
  })

  describe('findAll', () => {
    it('calls service.findByWorkOrder with workOrderId and organizationId', async () => {
      await controller.findAll('wo-1', OWNER)
      expect(service.findByWorkOrder).toHaveBeenCalledWith('wo-1', 'org-1')
    })
  })
})
```

```typescript
// apps/api/src/warranties/asset-warranties.controller.spec.ts
import { Test } from '@nestjs/testing'
import { Role } from '@glossops/database'
import type { AuthContext } from '@auth/interfaces'
import { AssetWarrantiesController } from './asset-warranties.controller'
import { WarrantyService } from './warranties.service'

const makeAccount = (role: Role): AuthContext => ({
  sub: 'acc-1',
  memberId: 'mem-1',
  email: 'test@test.com',
  branchId: 'branch-1',
  organizationId: 'org-1',
  role,
})
const OWNER = makeAccount(Role.OWNER)

describe('AssetWarrantiesController', () => {
  let controller: AssetWarrantiesController
  let service: { findByAsset: jest.Mock }

  beforeEach(async () => {
    service = { findByAsset: jest.fn().mockResolvedValue([]) }
    const module = await Test.createTestingModule({
      controllers: [AssetWarrantiesController],
      providers: [{ provide: WarrantyService, useValue: service }],
    }).compile()
    controller = module.get(AssetWarrantiesController)
  })

  describe('findAll', () => {
    it('calls service.findByAsset with assetId and organizationId', async () => {
      await controller.findAll('asset-1', OWNER)
      expect(service.findByAsset).toHaveBeenCalledWith('asset-1', 'org-1')
    })
  })
})
```

- [ ] **Step 2: Run specs and confirm they fail**

```bash
cd apps/api && pnpm test warranties.controller.spec.ts work-order-warranties.controller.spec.ts asset-warranties.controller.spec.ts --no-coverage 2>&1 | tail -20
```

Expected: fail with `Cannot find module`.

- [ ] **Step 3: Implement all three controllers**

```typescript
// apps/api/src/warranties/warranties.controller.ts
import { Controller, HttpCode, Param, Body, Post, Get } from '@nestjs/common'
import { Role } from '@glossops/database'

import { CurrentAccount, Roles } from '@auth/decorators'
import type { AuthContext } from '@auth/interfaces'

import { VoidWarrantyDto } from './dto/void-warranty.dto'
import { WarrantyService } from './warranties.service'

@Controller('warranties')
export class WarrantiesController {
  constructor(private readonly service: WarrantyService) {}

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentAccount() account: AuthContext) {
    return this.service.findOne(id, account.organizationId!)
  }

  @Post(':id/void')
  @HttpCode(200)
  @Roles(Role.OWNER, Role.MANAGER)
  void(
    @Param('id') id: string,
    @Body() dto: VoidWarrantyDto,
    @CurrentAccount() account: AuthContext
  ) {
    return this.service.void(
      id,
      dto.reason,
      account.organizationId!,
      account.sub
    )
  }
}
```

```typescript
// apps/api/src/warranties/work-order-warranties.controller.ts
import { Controller, Get, Param } from '@nestjs/common'

import { CurrentAccount } from '@auth/decorators'
import type { AuthContext } from '@auth/interfaces'

import { WarrantyService } from './warranties.service'

@Controller('work-orders/:workOrderId/warranties')
export class WorkOrderWarrantiesController {
  constructor(private readonly service: WarrantyService) {}

  @Get()
  findAll(
    @Param('workOrderId') workOrderId: string,
    @CurrentAccount() account: AuthContext
  ) {
    return this.service.findByWorkOrder(workOrderId, account.organizationId!)
  }
}
```

```typescript
// apps/api/src/warranties/asset-warranties.controller.ts
import { Controller, Get, Param } from '@nestjs/common'

import { CurrentAccount } from '@auth/decorators'
import type { AuthContext } from '@auth/interfaces'

import { WarrantyService } from './warranties.service'

@Controller('customer-assets/:assetId/warranties')
export class AssetWarrantiesController {
  constructor(private readonly service: WarrantyService) {}

  @Get()
  findAll(
    @Param('assetId') assetId: string,
    @CurrentAccount() account: AuthContext
  ) {
    return this.service.findByAsset(assetId, account.organizationId!)
  }
}
```

- [ ] **Step 4: Run specs and confirm all pass**

```bash
cd apps/api && pnpm test warranties.controller.spec.ts work-order-warranties.controller.spec.ts asset-warranties.controller.spec.ts --no-coverage 2>&1 | tail -20
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

Stage all controller files and run the commit skill (`/commit`).

---

## Task 4: Prisma repository implementation

**Files:**

- Create: `apps/api/src/warranties/infrastructure/prisma-warranty.repository.ts`

- [ ] **Step 1: Create `prisma-warranty.repository.ts`**

```typescript
// apps/api/src/warranties/infrastructure/prisma-warranty.repository.ts
import { Injectable } from '@nestjs/common'

import { PrismaService } from '@prisma'
import type {
  WarrantyRepositoryInterface,
  ItemForGeneration,
  CreateWarrantyData,
  WarrantyWithAsset,
  WarrantyRecord,
} from '@warranties/interfaces'

@Injectable()
export class PrismaWarrantyRepository implements WarrantyRepositoryInterface {
  constructor(private readonly prisma: PrismaService) {}

  private toRecord(row: {
    id: string
    workOrderItemId: string
    serviceId: string
    description: string
    term: string | null
    validFrom: Date
    validUntil: Date
    isVoid: boolean
    voidReason: string | null
    createdAt: Date
    updatedAt: Date
    workOrderItem: { workOrder: { branchId: string } }
  }): WarrantyRecord {
    return {
      id: row.id,
      workOrderItemId: row.workOrderItemId,
      serviceId: row.serviceId,
      branchId: row.workOrderItem.workOrder.branchId,
      description: row.description,
      term: row.term,
      validFrom: row.validFrom,
      validUntil: row.validUntil,
      isVoid: row.isVoid,
      voidReason: row.voidReason,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  }

  private readonly includeForRecord = {
    workOrderItem: { include: { workOrder: { select: { branchId: true } } } },
  } as const

  async createMany(data: CreateWarrantyData[]): Promise<WarrantyRecord[]> {
    return this.prisma.$transaction(
      data.map(d =>
        this.prisma.warranty.create({
          data: {
            workOrderItemId: d.workOrderItemId,
            serviceId: d.serviceId,
            description: d.description,
            term: d.term,
            validFrom: d.validFrom,
            validUntil: d.validUntil,
          },
          include: this.includeForRecord,
        })
      )
    )
  }

  async findItemsForGeneration(
    workOrderId: string
  ): Promise<ItemForGeneration[]> {
    const rows = await this.prisma.workOrderItem.findMany({
      where: { workOrderId },
      include: {
        service: {
          select: {
            warrantyDays: true,
            warrantyDescription: true,
            warrantyTerm: true,
            name: true,
          },
        },
      },
    })
    return rows.map(r => ({
      id: r.id,
      serviceId: r.serviceId,
      service: {
        warrantyDays: r.service.warrantyDays,
        warrantyDescription: r.service.warrantyDescription,
        warrantyTerm: r.service.warrantyTerm,
        name: r.service.name,
      },
    }))
  }

  async findById(
    id: string,
    organizationId: string
  ): Promise<WarrantyRecord | null> {
    const row = await this.prisma.warranty.findFirst({
      where: {
        id,
        workOrderItem: { workOrder: { branch: { organizationId } } },
      },
      include: this.includeForRecord,
    })
    return row ? this.toRecord(row) : null
  }

  async findByWorkOrder(
    workOrderId: string,
    organizationId: string
  ): Promise<WarrantyRecord[]> {
    const rows = await this.prisma.warranty.findMany({
      where: {
        workOrderItem: {
          workOrderId,
          workOrder: { branch: { organizationId } },
        },
      },
      include: this.includeForRecord,
      orderBy: { createdAt: 'asc' },
    })
    return rows.map(r => this.toRecord(r))
  }

  async findByAsset(
    assetId: string,
    organizationId: string
  ): Promise<WarrantyRecord[]> {
    const rows = await this.prisma.warranty.findMany({
      where: {
        workOrderItem: {
          workOrder: { assetId, branch: { organizationId } },
        },
      },
      include: this.includeForRecord,
      orderBy: { createdAt: 'desc' },
    })
    return rows.map(r => this.toRecord(r))
  }

  async findForClaimValidation(
    warrantyId: string,
    organizationId: string
  ): Promise<WarrantyWithAsset | null> {
    const row = await this.prisma.warranty.findFirst({
      where: {
        id: warrantyId,
        workOrderItem: { workOrder: { branch: { organizationId } } },
      },
      include: {
        workOrderItem: {
          include: { workOrder: { select: { assetId: true } } },
        },
      },
    })
    if (!row) return null
    return {
      id: row.id,
      isVoid: row.isVoid,
      validUntil: row.validUntil,
      assetId: row.workOrderItem.workOrder.assetId,
    }
  }

  async void(id: string, reason: string): Promise<WarrantyRecord> {
    const row = await this.prisma.warranty.update({
      where: { id },
      data: { isVoid: true, voidReason: reason },
      include: this.includeForRecord,
    })
    return this.toRecord(row)
  }
}
```

- [ ] **Step 2: Run all warranty tests to confirm nothing broke**

```bash
cd apps/api && pnpm test --testPathPattern="warranties" --no-coverage 2>&1 | tail -20
```

Expected: all passing.

- [ ] **Step 3: Commit**

Stage `infrastructure/prisma-warranty.repository.ts` and run the commit skill (`/commit`).

---

## Task 5: Module wiring — WarrantiesModule + AppModule registration

**Files:**

- Create: `apps/api/src/warranties/warranties.module.ts`
- Create: `apps/api/src/warranties/index.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Create `warranties.module.ts`**

```typescript
// apps/api/src/warranties/warranties.module.ts
import { Module } from '@nestjs/common'

import { ActivityLogsModule } from '@activity-logs'
import { PrismaModule } from '@prisma'

import { PrismaWarrantyRepository } from './infrastructure/prisma-warranty.repository'
import { WorkOrderWarrantiesController } from './work-order-warranties.controller'
import { AssetWarrantiesController } from './asset-warranties.controller'
import { WarrantiesController } from './warranties.controller'
import { WARRANTY_REPOSITORY } from './warranties.tokens'
import { WarrantyService } from './warranties.service'

@Module({
  imports: [PrismaModule, ActivityLogsModule],
  controllers: [
    WarrantiesController,
    WorkOrderWarrantiesController,
    AssetWarrantiesController,
  ],
  providers: [
    { provide: WARRANTY_REPOSITORY, useClass: PrismaWarrantyRepository },
    WarrantyService,
  ],
  exports: [WarrantyService],
})
export class WarrantiesModule {}
```

- [ ] **Step 2: Create `index.ts`**

```typescript
// apps/api/src/warranties/index.ts
export { WarrantiesModule } from './warranties.module'
export { WarrantyService } from './warranties.service'
export type { WarrantyRecord } from './interfaces'
```

- [ ] **Step 3: Register in `app.module.ts`**

Add `WarrantiesModule` to the imports. Add the import statement at the top (Tier 5 — relative import, after `WorkOrderAssignmentsModule`):

```typescript
import { WarrantiesModule } from './warranties/warranties.module'
```

Add to the `imports` array in `@Module`, after `WorkOrderAssignmentsModule`:

```typescript
WarrantiesModule,
```

- [ ] **Step 4: Run all warranty tests once more**

```bash
cd apps/api && pnpm test --testPathPattern="warranties" --no-coverage 2>&1 | tail -20
```

Expected: all passing.

- [ ] **Step 5: Commit**

Stage `warranties.module.ts`, `index.ts`, and `app.module.ts` changes and run the commit skill (`/commit`).

---

## Task 6: WorkOrders integration — inject WarrantyService + new test cases

**Files:**

- Modify: `apps/api/src/work-orders/work-orders.service.ts`
- Modify: `apps/api/src/work-orders/work-orders.module.ts`
- Modify: `apps/api/src/work-orders/work-orders.service.spec.ts`

- [ ] **Step 1: Add `WarrantyService` mock to `work-orders.service.spec.ts`**

Open `apps/api/src/work-orders/work-orders.service.spec.ts`.

The existing file uses constants `ORG`, `BRANCH`, `ASSET`, `ACCOUNT` and the status method is named `transition`. Adapt accordingly.

Add `WarrantyService` import (Tier 5 — relative, after existing relative imports):

```typescript
import { WarrantyService } from '../warranties/warranties.service'
```

Add `warrantyService` to the test-scoped variables block (after `activityLogs`):

```typescript
let warrantyService: {
  generateForWorkOrder: jest.Mock
  validateClaim: jest.Mock
}
```

In `beforeEach`, initialize before `Test.createTestingModule`:

```typescript
warrantyService = {
  generateForWorkOrder: jest.fn().mockResolvedValue(undefined),
  validateClaim: jest.fn().mockResolvedValue(undefined),
}
```

In the `providers` array of `Test.createTestingModule`, add after the `ActivityLogsService` entry:

```typescript
{ provide: WarrantyService, useValue: warrantyService },
```

Then add the following new test cases.

**Inside the `transition` describe block**, add after the existing COMPLETED test:

```typescript
it('calls warrantyService.generateForWorkOrder when transitioning to COMPLETED', async () => {
  const wo = await service.create(BRANCH, ORG, { assetId: ASSET }, ACCOUNT)
  await woRepo.updateStatus(wo.id, ORG, WorkOrderStatus.CONFIRMED)
  await woRepo.updateStatus(wo.id, ORG, WorkOrderStatus.IN_PROGRESS)

  await service.transition(wo.id, ORG, WorkOrderStatus.COMPLETED, ACCOUNT)

  expect(warrantyService.generateForWorkOrder).toHaveBeenCalledWith(
    wo.id,
    ORG,
    expect.any(Date)
  )
})

it('does not call warrantyService.generateForWorkOrder on non-COMPLETED transitions', async () => {
  const wo = await service.create(BRANCH, ORG, { assetId: ASSET }, ACCOUNT)

  await service.transition(wo.id, ORG, WorkOrderStatus.CONFIRMED, ACCOUNT)

  expect(warrantyService.generateForWorkOrder).not.toHaveBeenCalled()
})
```

**Inside the `create` describe block**, add:

```typescript
it('calls warrantyService.validateClaim when type is WARRANTY_CLAIM', async () => {
  await service.create(
    BRANCH,
    ORG,
    {
      assetId: ASSET,
      type: WorkOrderType.WARRANTY_CLAIM,
      warrantyClaimId: 'warranty-1',
    },
    ACCOUNT
  )

  expect(warrantyService.validateClaim).toHaveBeenCalledWith(
    'warranty-1',
    ASSET,
    ORG
  )
})

it('does not call warrantyService.validateClaim for STANDARD type', async () => {
  await service.create(BRANCH, ORG, { assetId: ASSET }, ACCOUNT)

  expect(warrantyService.validateClaim).not.toHaveBeenCalled()
})
```

- [ ] **Step 2: Run the existing work-orders service spec to confirm the new tests fail**

```bash
cd apps/api && pnpm test work-orders.service.spec.ts --no-coverage 2>&1 | tail -30
```

Expected: new test cases fail (service doesn't call warrantyService yet); existing tests should still pass.

- [ ] **Step 3: Update `work-orders.service.ts`**

Add the import (Tier 5, relative — sort by line length with existing relative imports):

```typescript
import { WarrantyService } from '../warranties/warranties.service'
```

In the constructor, add after `private readonly activityLogs: ActivityLogsService`:

```typescript
private readonly warrantyService: WarrantyService,
```

In `create()`, add before `const wo = await this.workOrders.create(...)`:

```typescript
if (dto.type === WorkOrderType.WARRANTY_CLAIM && dto.warrantyClaimId) {
  await this.warrantyService.validateClaim(
    dto.warrantyClaimId,
    dto.assetId,
    organizationId
  )
}
```

In `transition()` (the method at line ~128), after `await this.inventoryService.commitUsages(id)`:

```typescript
await this.warrantyService.generateForWorkOrder(
  id,
  organizationId,
  completedAt!
)
```

- [ ] **Step 4: Update `work-orders.module.ts`**

Add the import (Tier 5, relative — sorted by length with existing relative imports):

```typescript
import { WarrantiesModule } from '../warranties/warranties.module'
```

Add `WarrantiesModule` to the `imports` array:

```typescript
imports: [PrismaModule, InventoryModule, ActivityLogsModule, WarrantiesModule],
```

- [ ] **Step 5: Run the work-orders service spec and confirm all tests pass**

```bash
cd apps/api && pnpm test work-orders.service.spec.ts --no-coverage 2>&1 | tail -30
```

Expected: all tests pass including the new WARRANTY_CLAIM and COMPLETED transition cases.

- [ ] **Step 6: Run the full test suite to confirm no regressions**

```bash
cd apps/api && pnpm test --no-coverage 2>&1 | tail -30
```

Expected: all suites pass.

- [ ] **Step 7: Commit**

Stage all modified files and run the commit skill (`/commit`).
