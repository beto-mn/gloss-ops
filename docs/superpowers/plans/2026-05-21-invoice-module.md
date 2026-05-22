# Invoice Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the NestJS invoice module — repository interface, Prisma implementation, service, and controllers — with per-branch folio generation via `InvoiceCounter`, status transitions, and full CRUD. No CFDI timbrado.

**Architecture:** `InvoicesModule` imports `WorkOrdersModule` (to verify WO ownership) and `ActivityLogsModule`. A dedicated `WorkOrderInvoiceController` (inside `InvoicesModule`) handles `GET /work-orders/:workOrderId/invoice` to avoid circular dependency. Folio generation happens inside the Prisma repository via a `$transaction` that upserts `InvoiceCounter` and inserts the invoice atomically.

**Tech Stack:** NestJS, Prisma 7, PostgreSQL 16, `class-validator`, `class-transformer`, Jest + InMemoryInvoiceRepository (no Prisma in unit tests).

---

## File Map

| Action | Path                                                                   |
| ------ | ---------------------------------------------------------------------- |
| Modify | `packages/database/prisma/schema.prisma`                               |
| Create | migration (auto-generated)                                             |
| Modify | `apps/api/tsconfig.paths.json`                                         |
| Create | `apps/api/src/invoices/interfaces/invoice.repository.interface.ts`     |
| Create | `apps/api/src/invoices/interfaces/index.ts`                            |
| Create | `apps/api/src/invoices/invoices.tokens.ts`                             |
| Create | `apps/api/src/invoices/infrastructure/in-memory-invoice.repository.ts` |
| Create | `apps/api/src/invoices/dto/create-invoice.dto.ts`                      |
| Create | `apps/api/src/invoices/dto/update-invoice.dto.ts`                      |
| Create | `apps/api/src/invoices/dto/transition-invoice.dto.ts`                  |
| Create | `apps/api/src/invoices/dto/list-invoices.dto.ts`                       |
| Create | `apps/api/src/invoices/dto/index.ts`                                   |
| Create | `apps/api/src/invoices/invoices.service.spec.ts`                       |
| Create | `apps/api/src/invoices/invoices.service.ts`                            |
| Create | `apps/api/src/invoices/infrastructure/prisma-invoice.repository.ts`    |
| Create | `apps/api/src/invoices/invoices.controller.spec.ts`                    |
| Create | `apps/api/src/invoices/work-order-invoice.controller.spec.ts`          |
| Create | `apps/api/src/invoices/invoices.controller.ts`                         |
| Create | `apps/api/src/invoices/work-order-invoice.controller.ts`               |
| Create | `apps/api/src/invoices/invoices.module.ts`                             |
| Create | `apps/api/src/invoices/index.ts`                                       |
| Modify | `apps/api/src/app.module.ts`                                           |

---

## Task 1: Add `InvoiceCounter` to Prisma schema and migrate

**Files:**

- Modify: `packages/database/prisma/schema.prisma`

- [ ] **Step 1: Add `InvoiceCounter` model and `Branch` relation**

Open `packages/database/prisma/schema.prisma`. After the `Invoice` model block (around line 435), add:

```prisma
model InvoiceCounter {
  branchId String @id @map("branch_id") @db.Uuid
  lastSeq  Int    @default(0) @map("last_seq")

  branch Branch @relation(fields: [branchId], references: [id])

  @@map("invoice_counter")
}
```

In the existing `Branch` model (around line 191), add the inverse relation inside the model body (after the existing `invoices Invoice[]` line):

```prisma
  invoiceCounter InvoiceCounter?
```

- [ ] **Step 2: Run migration**

```bash
cd packages/database && pnpm prisma migrate dev --name add-invoice-counter
```

Expected: migration file created in `packages/database/prisma/migrations/`, Prisma client regenerated.

- [ ] **Step 3: Verify the generated client**

```bash
cd packages/database && pnpm prisma generate
```

Expected: no errors. The `InvoiceCounter` model is now available as `prisma.invoiceCounter`.

- [ ] **Step 4: Commit**

```bash
git add packages/database/prisma/schema.prisma packages/database/prisma/migrations/
git commit -m "✨ feat(database): add invoice_counter table for per-branch folio sequences"
```

---

## Task 2: Add path aliases

**Files:**

- Modify: `apps/api/tsconfig.paths.json`

- [ ] **Step 1: Add `@invoices` aliases**

In `apps/api/tsconfig.paths.json`, inside the `"paths"` object, add these three entries after the existing `@warranties` block:

```json
"@invoices": ["./src/invoices/index.ts"],
"@invoices/dto": ["./src/invoices/dto/index.ts"],
"@invoices/interfaces": ["./src/invoices/interfaces/index.ts"]
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/tsconfig.paths.json
git commit -m "🔧 chore(tsconfig): add @invoices path aliases"
```

---

## Task 3: Create interfaces

**Files:**

- Create: `apps/api/src/invoices/interfaces/invoice.repository.interface.ts`
- Create: `apps/api/src/invoices/interfaces/index.ts`

- [ ] **Step 1: Create `invoice.repository.interface.ts`**

```ts
import type {
  CfdiPaymentMethod,
  InvoiceStatus,
  WorkOrderStatus,
} from '@glossops/database'

export interface InvoiceWorkOrderEmbed {
  id: string
  status: WorkOrderStatus
  totalAmount: number
  asset: {
    id: string
    assetType: string
    model: string | null
    year: number | null
  }
}

export interface InvoiceRecord {
  id: string
  branchId: string
  workOrderId: string
  status: InvoiceStatus
  folio: string
  subtotal: number
  taxRate: number
  taxAmount: number
  total: number
  customerTaxId: string | null
  customerName: string | null
  customerAddress: string | null
  customerZipCode: string | null
  customerFiscalRegime: string | null
  cfdiUse: string | null
  paymentMethod: CfdiPaymentMethod | null
  paymentForm: string | null
  cfdiUuid: string | null
  cfdiXml: string | null
  cfdiSealedAt: Date | null
  issuedAt: Date | null
  createdAt: Date
  updatedAt: Date
  workOrder: InvoiceWorkOrderEmbed
}

export interface CreateInvoiceData {
  branchId: string
  workOrderId: string
  subtotal: number
  taxRate: number
  taxAmount: number
  total: number
  customerTaxId: string | null
  customerName: string | null
  customerAddress: string | null
  customerZipCode: string | null
  customerFiscalRegime: string | null
  cfdiUse: string | null
  paymentMethod: CfdiPaymentMethod | null
  paymentForm: string | null
}

export interface UpdateInvoiceData {
  customerTaxId?: string | null
  customerName?: string | null
  customerAddress?: string | null
  customerZipCode?: string | null
  customerFiscalRegime?: string | null
  cfdiUse?: string | null
  paymentMethod?: CfdiPaymentMethod | null
  paymentForm?: string | null
}

export interface InvoiceFilters {
  status?: InvoiceStatus
  page: number
  limit: number
}

export interface InvoicePage {
  data: InvoiceRecord[]
  total: number
  page: number
  limit: number
}

export interface InvoiceRepositoryInterface {
  create(data: CreateInvoiceData): Promise<InvoiceRecord>
  findById(id: string, branchId: string): Promise<InvoiceRecord | null>
  findByWorkOrder(workOrderId: string): Promise<InvoiceRecord | null>
  findAll(branchId: string, filters: InvoiceFilters): Promise<InvoicePage>
  update(
    id: string,
    branchId: string,
    data: UpdateInvoiceData
  ): Promise<InvoiceRecord>
  updateStatus(
    id: string,
    branchId: string,
    status: InvoiceStatus,
    issuedAt?: Date
  ): Promise<InvoiceRecord>
}
```

- [ ] **Step 2: Create `interfaces/index.ts`**

```ts
export type { InvoiceRepositoryInterface } from './invoice.repository.interface'
export type { InvoiceWorkOrderEmbed } from './invoice.repository.interface'
export type { CreateInvoiceData } from './invoice.repository.interface'
export type { UpdateInvoiceData } from './invoice.repository.interface'
export type { InvoiceFilters } from './invoice.repository.interface'
export type { InvoiceRecord } from './invoice.repository.interface'
export type { InvoicePage } from './invoice.repository.interface'
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/invoices/interfaces/
git commit -m "✨ feat(invoices): add repository interface and types"
```

---

## Task 4: Create token

**Files:**

- Create: `apps/api/src/invoices/invoices.tokens.ts`

- [ ] **Step 1: Create `invoices.tokens.ts`**

```ts
export const INVOICE_REPOSITORY = Symbol('InvoiceRepositoryInterface')
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/invoices/invoices.tokens.ts
git commit -m "✨ feat(invoices): add DI token"
```

---

## Task 5: Create in-memory repository

**Files:**

- Create: `apps/api/src/invoices/infrastructure/in-memory-invoice.repository.ts`

- [ ] **Step 1: Create the file**

```ts
import { randomUUID } from 'crypto'

import { Injectable } from '@nestjs/common'
import { InvoiceStatus } from '@glossops/database'

import type {
  InvoiceRepositoryInterface,
  InvoiceWorkOrderEmbed,
  CreateInvoiceData,
  UpdateInvoiceData,
  InvoiceFilters,
  InvoiceRecord,
  InvoicePage,
} from '@invoices/interfaces'

@Injectable()
export class InMemoryInvoiceRepository implements InvoiceRepositoryInterface {
  readonly store = new Map<string, InvoiceRecord>()
  private readonly counters = new Map<string, number>()
  private readonly workOrderEmbeds = new Map<string, InvoiceWorkOrderEmbed>()

  seedWorkOrder(workOrderId: string, embed: InvoiceWorkOrderEmbed): void {
    this.workOrderEmbeds.set(workOrderId, embed)
  }

  create(data: CreateInvoiceData): Promise<InvoiceRecord> {
    const seq = (this.counters.get(data.branchId) ?? 0) + 1
    this.counters.set(data.branchId, seq)
    const year = new Date().getFullYear()
    const folio = `INV-${year}-${String(seq).padStart(4, '0')}`
    const embed = this.workOrderEmbeds.get(data.workOrderId)!
    const record: InvoiceRecord = {
      id: randomUUID(),
      branchId: data.branchId,
      workOrderId: data.workOrderId,
      status: InvoiceStatus.DRAFT,
      folio,
      subtotal: data.subtotal,
      taxRate: data.taxRate,
      taxAmount: data.taxAmount,
      total: data.total,
      customerTaxId: data.customerTaxId,
      customerName: data.customerName,
      customerAddress: data.customerAddress,
      customerZipCode: data.customerZipCode,
      customerFiscalRegime: data.customerFiscalRegime,
      cfdiUse: data.cfdiUse,
      paymentMethod: data.paymentMethod,
      paymentForm: data.paymentForm,
      cfdiUuid: null,
      cfdiXml: null,
      cfdiSealedAt: null,
      issuedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      workOrder: embed,
    }
    this.store.set(record.id, record)
    return Promise.resolve(record)
  }

  findById(id: string, branchId: string): Promise<InvoiceRecord | null> {
    const record = this.store.get(id)
    if (!record || record.branchId !== branchId) return Promise.resolve(null)
    return Promise.resolve(record)
  }

  findByWorkOrder(workOrderId: string): Promise<InvoiceRecord | null> {
    const record = Array.from(this.store.values()).find(
      r => r.workOrderId === workOrderId
    )
    return Promise.resolve(record ?? null)
  }

  findAll(branchId: string, filters: InvoiceFilters): Promise<InvoicePage> {
    let records = Array.from(this.store.values()).filter(
      r => r.branchId === branchId
    )
    if (filters.status) {
      records = records.filter(r => r.status === filters.status)
    }
    const total = records.length
    const start = (filters.page - 1) * filters.limit
    const data = records.slice(start, start + filters.limit)
    return Promise.resolve({
      data,
      total,
      page: filters.page,
      limit: filters.limit,
    })
  }

  update(
    id: string,
    branchId: string,
    data: UpdateInvoiceData
  ): Promise<InvoiceRecord> {
    const record = this.store.get(id)!
    const updated: InvoiceRecord = {
      ...record,
      customerTaxId:
        data.customerTaxId !== undefined
          ? (data.customerTaxId ?? null)
          : record.customerTaxId,
      customerName:
        data.customerName !== undefined
          ? (data.customerName ?? null)
          : record.customerName,
      customerAddress:
        data.customerAddress !== undefined
          ? (data.customerAddress ?? null)
          : record.customerAddress,
      customerZipCode:
        data.customerZipCode !== undefined
          ? (data.customerZipCode ?? null)
          : record.customerZipCode,
      customerFiscalRegime:
        data.customerFiscalRegime !== undefined
          ? (data.customerFiscalRegime ?? null)
          : record.customerFiscalRegime,
      cfdiUse:
        data.cfdiUse !== undefined ? (data.cfdiUse ?? null) : record.cfdiUse,
      paymentMethod:
        data.paymentMethod !== undefined
          ? (data.paymentMethod ?? null)
          : record.paymentMethod,
      paymentForm:
        data.paymentForm !== undefined
          ? (data.paymentForm ?? null)
          : record.paymentForm,
      updatedAt: new Date(),
    }
    this.store.set(id, updated)
    return Promise.resolve(updated)
  }

  updateStatus(
    id: string,
    branchId: string,
    status: InvoiceStatus,
    issuedAt?: Date
  ): Promise<InvoiceRecord> {
    const record = this.store.get(id)!
    const updated: InvoiceRecord = {
      ...record,
      status,
      issuedAt: issuedAt ?? record.issuedAt,
      updatedAt: new Date(),
    }
    this.store.set(id, updated)
    return Promise.resolve(updated)
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/invoices/infrastructure/in-memory-invoice.repository.ts
git commit -m "✨ feat(invoices): add in-memory repository for tests"
```

---

## Task 6: Create DTOs

**Files:**

- Create: `apps/api/src/invoices/dto/create-invoice.dto.ts`
- Create: `apps/api/src/invoices/dto/update-invoice.dto.ts`
- Create: `apps/api/src/invoices/dto/transition-invoice.dto.ts`
- Create: `apps/api/src/invoices/dto/list-invoices.dto.ts`
- Create: `apps/api/src/invoices/dto/index.ts`

- [ ] **Step 1: Create `create-invoice.dto.ts`**

```ts
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator'

import { CfdiPaymentMethod } from '@glossops/database'

export class CreateInvoiceDto {
  @IsUUID()
  workOrderId: string

  @IsOptional()
  @IsString()
  customerTaxId?: string

  @IsOptional()
  @IsString()
  customerName?: string

  @IsOptional()
  @IsString()
  customerAddress?: string

  @IsOptional()
  @IsString()
  customerZipCode?: string

  @IsOptional()
  @IsString()
  customerFiscalRegime?: string

  @IsOptional()
  @IsString()
  cfdiUse?: string

  @IsOptional()
  @IsEnum(CfdiPaymentMethod)
  paymentMethod?: CfdiPaymentMethod

  @IsOptional()
  @IsString()
  paymentForm?: string
}
```

- [ ] **Step 2: Create `update-invoice.dto.ts`**

```ts
import { IsEnum, IsOptional, IsString } from 'class-validator'

import { CfdiPaymentMethod } from '@glossops/database'

export class UpdateInvoiceDto {
  @IsOptional()
  @IsString()
  customerTaxId?: string

  @IsOptional()
  @IsString()
  customerName?: string

  @IsOptional()
  @IsString()
  customerAddress?: string

  @IsOptional()
  @IsString()
  customerZipCode?: string

  @IsOptional()
  @IsString()
  customerFiscalRegime?: string

  @IsOptional()
  @IsString()
  cfdiUse?: string

  @IsOptional()
  @IsEnum(CfdiPaymentMethod)
  paymentMethod?: CfdiPaymentMethod

  @IsOptional()
  @IsString()
  paymentForm?: string
}
```

- [ ] **Step 3: Create `transition-invoice.dto.ts`**

```ts
import { IsEnum } from 'class-validator'

import { InvoiceStatus } from '@glossops/database'

export class TransitionInvoiceDto {
  @IsEnum(InvoiceStatus)
  status: InvoiceStatus
}
```

- [ ] **Step 4: Create `list-invoices.dto.ts`**

```ts
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator'
import { Type } from 'class-transformer'

import { InvoiceStatus } from '@glossops/database'

export class ListInvoicesDto {
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number
}
```

- [ ] **Step 5: Create `dto/index.ts`**

```ts
export { CreateInvoiceDto } from './create-invoice.dto'
export { UpdateInvoiceDto } from './update-invoice.dto'
export { TransitionInvoiceDto } from './transition-invoice.dto'
export { ListInvoicesDto } from './list-invoices.dto'
```

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/invoices/dto/
git commit -m "✨ feat(invoices): add DTOs"
```

---

## Task 7: Write failing service tests

**Files:**

- Create: `apps/api/src/invoices/invoices.service.spec.ts`

- [ ] **Step 1: Write the full spec**

```ts
import { Test, type TestingModule } from '@nestjs/testing'
import { ConflictException, NotFoundException } from '@nestjs/common'
import {
  ActivityAction,
  InvoiceStatus,
  WorkOrderStatus,
} from '@glossops/database'

import { InMemoryInvoiceRepository } from './infrastructure/in-memory-invoice.repository'
import { ActivityLogsService } from '../activity-logs/activity-logs.service'
import { WorkOrdersService } from '../work-orders/work-orders.service'
import { INVOICE_REPOSITORY } from './invoices.tokens'
import { InvoicesService } from './invoices.service'
import type { InvoiceRecord } from './interfaces'

const BRANCH_ID = 'branch-1'
const ORG_ID = 'org-1'
const ACCOUNT_ID = 'acc-1'
const WO_ID = 'wo-1'
const ASSET_ID = 'asset-1'

const makeWoEmbed = (status = WorkOrderStatus.COMPLETED) => ({
  id: WO_ID,
  status,
  totalAmount: 1000,
  asset: { id: ASSET_ID, assetType: 'VEHICLE', model: 'Civic', year: 2020 },
})

const makeWoRecord = (status = WorkOrderStatus.COMPLETED) => ({
  id: WO_ID,
  branchId: BRANCH_ID,
  status,
  totalAmount: 1000,
  assetId: ASSET_ID,
})

const seedInvoice = (
  repo: InMemoryInvoiceRepository,
  status = InvoiceStatus.DRAFT
): InvoiceRecord => {
  const id = 'inv-1'
  const record: InvoiceRecord = {
    id,
    branchId: BRANCH_ID,
    workOrderId: WO_ID,
    status,
    folio: `INV-2026-0001`,
    subtotal: 1000,
    taxRate: 0.16,
    taxAmount: 160,
    total: 1160,
    customerTaxId: null,
    customerName: null,
    customerAddress: null,
    customerZipCode: null,
    customerFiscalRegime: null,
    cfdiUse: null,
    paymentMethod: null,
    paymentForm: null,
    cfdiUuid: null,
    cfdiXml: null,
    cfdiSealedAt: null,
    issuedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    workOrder: makeWoEmbed(
      status === InvoiceStatus.DRAFT
        ? WorkOrderStatus.COMPLETED
        : WorkOrderStatus.COMPLETED
    ),
  }
  repo.store.set(id, record)
  return record
}

describe('InvoicesService', () => {
  let service: InvoicesService
  let repo: InMemoryInvoiceRepository
  let workOrdersService: jest.Mocked<Pick<WorkOrdersService, 'findOne'>>
  let activityLogs: jest.Mocked<Pick<ActivityLogsService, 'record'>>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesService,
        { provide: INVOICE_REPOSITORY, useClass: InMemoryInvoiceRepository },
        {
          provide: WorkOrdersService,
          useValue: { findOne: jest.fn() },
        },
        {
          provide: ActivityLogsService,
          useValue: { record: jest.fn() },
        },
      ],
    }).compile()

    service = module.get(InvoicesService)
    repo = module.get(INVOICE_REPOSITORY)
    workOrdersService = module.get(WorkOrdersService)
    activityLogs = module.get(ActivityLogsService)
  })

  afterEach(() => {
    repo.store.clear()
    jest.clearAllMocks()
  })

  // ── create ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates invoice in DRAFT with correct folio and computed totals', async () => {
      workOrdersService.findOne.mockResolvedValue(makeWoRecord() as any)
      repo.seedWorkOrder(WO_ID, makeWoEmbed())

      const result = await service.create(
        BRANCH_ID,
        ORG_ID,
        { workOrderId: WO_ID },
        ACCOUNT_ID
      )

      expect(result.status).toBe(InvoiceStatus.DRAFT)
      expect(result.folio).toMatch(/^INV-\d{4}-0001$/)
      expect(result.subtotal).toBe(1000)
      expect(result.taxRate).toBe(0.16)
      expect(result.taxAmount).toBe(160)
      expect(result.total).toBe(1160)
    })

    it('records activity log on creation', async () => {
      workOrdersService.findOne.mockResolvedValue(makeWoRecord() as any)
      repo.seedWorkOrder(WO_ID, makeWoEmbed())
      activityLogs.record.mockResolvedValue(undefined)

      const result = await service.create(
        BRANCH_ID,
        ORG_ID,
        { workOrderId: WO_ID },
        ACCOUNT_ID
      )

      expect(activityLogs.record).toHaveBeenCalledWith({
        organizationId: ORG_ID,
        branchId: BRANCH_ID,
        accountId: ACCOUNT_ID,
        action: ActivityAction.CREATED,
        entity: 'Invoice',
        entityId: result.id,
      })
    })

    it('throws 404 work_order_not_found when WO belongs to a different branch', async () => {
      workOrdersService.findOne.mockResolvedValue({
        ...makeWoRecord(),
        branchId: 'other-branch',
      } as any)

      await expect(
        service.create(BRANCH_ID, ORG_ID, { workOrderId: WO_ID }, ACCOUNT_ID)
      ).rejects.toMatchObject({ response: { error: 'work_order_not_found' } })
    })

    it('throws 404 work_order_not_found when WO does not exist', async () => {
      workOrdersService.findOne.mockRejectedValue(
        new NotFoundException({ error: 'work_order_not_found' })
      )

      await expect(
        service.create(BRANCH_ID, ORG_ID, { workOrderId: WO_ID }, ACCOUNT_ID)
      ).rejects.toBeInstanceOf(NotFoundException)
    })

    it('throws 409 invoice_already_exists when WO already has an invoice', async () => {
      workOrdersService.findOne.mockResolvedValue(makeWoRecord() as any)
      seedInvoice(repo)

      await expect(
        service.create(BRANCH_ID, ORG_ID, { workOrderId: WO_ID }, ACCOUNT_ID)
      ).rejects.toMatchObject({ response: { error: 'invoice_already_exists' } })
    })
  })

  // ── findAll ────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns paginated invoices for the branch', async () => {
      seedInvoice(repo)

      const result = await service.findAll(BRANCH_ID, { page: 1, limit: 20 })

      expect(result.data).toHaveLength(1)
      expect(result.total).toBe(1)
    })
  })

  // ── findOne ────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('returns the invoice', async () => {
      const seeded = seedInvoice(repo)

      const result = await service.findOne(seeded.id, BRANCH_ID)

      expect(result.id).toBe(seeded.id)
    })

    it('throws 404 invoice_not_found when not found', async () => {
      await expect(
        service.findOne('nonexistent', BRANCH_ID)
      ).rejects.toMatchObject({ response: { error: 'invoice_not_found' } })
    })
  })

  // ── findByWorkOrder ────────────────────────────────────────────────────────

  describe('findByWorkOrder', () => {
    it('returns the invoice for the work order', async () => {
      seedInvoice(repo)

      const result = await service.findByWorkOrder(WO_ID, BRANCH_ID)

      expect(result.workOrderId).toBe(WO_ID)
    })

    it('throws 404 invoice_not_found when no invoice exists for the WO', async () => {
      await expect(
        service.findByWorkOrder(WO_ID, BRANCH_ID)
      ).rejects.toMatchObject({ response: { error: 'invoice_not_found' } })
    })
  })

  // ── update ─────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('updates fiscal data on a DRAFT invoice', async () => {
      const seeded = seedInvoice(repo, InvoiceStatus.DRAFT)

      const result = await service.update(seeded.id, BRANCH_ID, {
        customerName: 'Empresa SA',
        customerTaxId: 'RFC123',
      })

      expect(result.customerName).toBe('Empresa SA')
      expect(result.customerTaxId).toBe('RFC123')
    })

    it('throws 409 invoice_not_editable when invoice is not DRAFT', async () => {
      const seeded = seedInvoice(repo, InvoiceStatus.ISSUED)

      await expect(
        service.update(seeded.id, BRANCH_ID, { customerName: 'X' })
      ).rejects.toMatchObject({ response: { error: 'invoice_not_editable' } })
    })
  })

  // ── transition ─────────────────────────────────────────────────────────────

  describe('transition', () => {
    it('transitions DRAFT → ISSUED when WO is COMPLETED and sets issuedAt', async () => {
      const seeded = seedInvoice(repo, InvoiceStatus.DRAFT)

      const result = await service.transition(
        seeded.id,
        BRANCH_ID,
        ORG_ID,
        InvoiceStatus.ISSUED,
        ACCOUNT_ID
      )

      expect(result.status).toBe(InvoiceStatus.ISSUED)
      expect(result.issuedAt).toBeInstanceOf(Date)
    })

    it('throws 409 work_order_not_completed when DRAFT → ISSUED and WO is not COMPLETED', async () => {
      const invoice: InvoiceRecord = {
        ...seedInvoice(repo, InvoiceStatus.DRAFT),
        workOrder: makeWoEmbed(WorkOrderStatus.IN_PROGRESS),
      }
      repo.store.set(invoice.id, invoice)

      await expect(
        service.transition(
          invoice.id,
          BRANCH_ID,
          ORG_ID,
          InvoiceStatus.ISSUED,
          ACCOUNT_ID
        )
      ).rejects.toMatchObject({
        response: { error: 'work_order_not_completed' },
      })
    })

    it('transitions DRAFT → CANCELLED', async () => {
      const seeded = seedInvoice(repo, InvoiceStatus.DRAFT)

      const result = await service.transition(
        seeded.id,
        BRANCH_ID,
        ORG_ID,
        InvoiceStatus.CANCELLED,
        ACCOUNT_ID
      )

      expect(result.status).toBe(InvoiceStatus.CANCELLED)
    })

    it('transitions ISSUED → PAID', async () => {
      const seeded = seedInvoice(repo, InvoiceStatus.ISSUED)

      const result = await service.transition(
        seeded.id,
        BRANCH_ID,
        ORG_ID,
        InvoiceStatus.PAID,
        ACCOUNT_ID
      )

      expect(result.status).toBe(InvoiceStatus.PAID)
    })

    it('transitions ISSUED → CANCELLED', async () => {
      const seeded = seedInvoice(repo, InvoiceStatus.ISSUED)

      const result = await service.transition(
        seeded.id,
        BRANCH_ID,
        ORG_ID,
        InvoiceStatus.CANCELLED,
        ACCOUNT_ID
      )

      expect(result.status).toBe(InvoiceStatus.CANCELLED)
    })

    it('throws 409 invalid_status_transition for PAID → any', async () => {
      const seeded = seedInvoice(repo, InvoiceStatus.PAID)

      await expect(
        service.transition(
          seeded.id,
          BRANCH_ID,
          ORG_ID,
          InvoiceStatus.CANCELLED,
          ACCOUNT_ID
        )
      ).rejects.toMatchObject({
        response: { error: 'invalid_status_transition' },
      })
    })

    it('throws 409 invalid_status_transition for CANCELLED → any', async () => {
      const seeded = seedInvoice(repo, InvoiceStatus.CANCELLED)

      await expect(
        service.transition(
          seeded.id,
          BRANCH_ID,
          ORG_ID,
          InvoiceStatus.ISSUED,
          ACCOUNT_ID
        )
      ).rejects.toMatchObject({
        response: { error: 'invalid_status_transition' },
      })
    })

    it('throws 409 invalid_status_transition for DRAFT → PAID (skipping ISSUED)', async () => {
      const seeded = seedInvoice(repo, InvoiceStatus.DRAFT)

      await expect(
        service.transition(
          seeded.id,
          BRANCH_ID,
          ORG_ID,
          InvoiceStatus.PAID,
          ACCOUNT_ID
        )
      ).rejects.toMatchObject({
        response: { error: 'invalid_status_transition' },
      })
    })

    it('records activity log with STATUS_CHANGED on transition', async () => {
      const seeded = seedInvoice(repo, InvoiceStatus.DRAFT)
      activityLogs.record.mockResolvedValue(undefined)

      await service.transition(
        seeded.id,
        BRANCH_ID,
        ORG_ID,
        InvoiceStatus.CANCELLED,
        ACCOUNT_ID
      )

      expect(activityLogs.record).toHaveBeenCalledWith({
        organizationId: ORG_ID,
        branchId: BRANCH_ID,
        accountId: ACCOUNT_ID,
        action: ActivityAction.STATUS_CHANGED,
        entity: 'Invoice',
        entityId: seeded.id,
        metadata: { from: InvoiceStatus.DRAFT, to: InvoiceStatus.CANCELLED },
      })
    })
  })
})
```

- [ ] **Step 2: Run the tests — expect them all to fail**

```bash
cd apps/api && pnpm test invoices.service.spec.ts --no-coverage
```

Expected: FAIL — `Cannot find module './invoices.service'`

---

## Task 8: Implement `InvoicesService`

**Files:**

- Create: `apps/api/src/invoices/invoices.service.ts`

- [ ] **Step 1: Create the service**

```ts
import {
  ConflictException,
  NotFoundException,
  Injectable,
  Inject,
} from '@nestjs/common'
import {
  ActivityAction,
  InvoiceStatus,
  WorkOrderStatus,
} from '@glossops/database'

import type {
  InvoiceRepositoryInterface,
  InvoiceRecord,
  InvoicePage,
} from '@invoices/interfaces'

import { ActivityLogsService } from '../activity-logs/activity-logs.service'
import { WorkOrdersService } from '../work-orders/work-orders.service'
import type { CreateInvoiceDto, ListInvoicesDto, UpdateInvoiceDto } from './dto'
import { INVOICE_REPOSITORY } from './invoices.tokens'

const TAX_RATE = 0.16

const VALID_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  [InvoiceStatus.DRAFT]: [InvoiceStatus.ISSUED, InvoiceStatus.CANCELLED],
  [InvoiceStatus.ISSUED]: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED],
  [InvoiceStatus.PAID]: [],
  [InvoiceStatus.CANCELLED]: [],
}

@Injectable()
export class InvoicesService {
  constructor(
    @Inject(INVOICE_REPOSITORY)
    private readonly repo: InvoiceRepositoryInterface,
    private readonly workOrdersService: WorkOrdersService,
    private readonly activityLogs: ActivityLogsService
  ) {}

  async create(
    branchId: string,
    organizationId: string,
    dto: CreateInvoiceDto,
    accountId: string
  ): Promise<InvoiceRecord> {
    const wo = await this.workOrdersService.findOne(
      dto.workOrderId,
      organizationId
    )
    if (wo.branchId !== branchId) {
      throw new NotFoundException({ error: 'work_order_not_found' })
    }
    const existing = await this.repo.findByWorkOrder(dto.workOrderId)
    if (existing) {
      throw new ConflictException({ error: 'invoice_already_exists' })
    }
    const subtotal = Number(wo.totalAmount)
    const taxAmount = Math.round(subtotal * TAX_RATE * 100) / 100
    const total = Math.round((subtotal + taxAmount) * 100) / 100

    const invoice = await this.repo.create({
      branchId,
      workOrderId: dto.workOrderId,
      subtotal,
      taxRate: TAX_RATE,
      taxAmount,
      total,
      customerTaxId: dto.customerTaxId ?? null,
      customerName: dto.customerName ?? null,
      customerAddress: dto.customerAddress ?? null,
      customerZipCode: dto.customerZipCode ?? null,
      customerFiscalRegime: dto.customerFiscalRegime ?? null,
      cfdiUse: dto.cfdiUse ?? null,
      paymentMethod: dto.paymentMethod ?? null,
      paymentForm: dto.paymentForm ?? null,
    })
    await this.activityLogs.record({
      organizationId,
      branchId,
      accountId,
      action: ActivityAction.CREATED,
      entity: 'Invoice',
      entityId: invoice.id,
    })
    return invoice
  }

  findAll(branchId: string, dto: ListInvoicesDto): Promise<InvoicePage> {
    return this.repo.findAll(branchId, {
      status: dto.status,
      page: dto.page ?? 1,
      limit: dto.limit ?? 20,
    })
  }

  async findOne(id: string, branchId: string): Promise<InvoiceRecord> {
    const invoice = await this.repo.findById(id, branchId)
    if (!invoice) throw new NotFoundException({ error: 'invoice_not_found' })
    return invoice
  }

  async findByWorkOrder(
    workOrderId: string,
    branchId: string
  ): Promise<InvoiceRecord> {
    const invoice = await this.repo.findByWorkOrder(workOrderId)
    if (!invoice || invoice.branchId !== branchId) {
      throw new NotFoundException({ error: 'invoice_not_found' })
    }
    return invoice
  }

  async update(
    id: string,
    branchId: string,
    dto: UpdateInvoiceDto
  ): Promise<InvoiceRecord> {
    const invoice = await this.findOne(id, branchId)
    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new ConflictException({ error: 'invoice_not_editable' })
    }
    return this.repo.update(id, branchId, {
      customerTaxId: dto.customerTaxId,
      customerName: dto.customerName,
      customerAddress: dto.customerAddress,
      customerZipCode: dto.customerZipCode,
      customerFiscalRegime: dto.customerFiscalRegime,
      cfdiUse: dto.cfdiUse,
      paymentMethod: dto.paymentMethod,
      paymentForm: dto.paymentForm,
    })
  }

  async transition(
    id: string,
    branchId: string,
    organizationId: string,
    newStatus: InvoiceStatus,
    accountId: string
  ): Promise<InvoiceRecord> {
    const invoice = await this.findOne(id, branchId)
    if (!VALID_TRANSITIONS[invoice.status].includes(newStatus)) {
      throw new ConflictException({ error: 'invalid_status_transition' })
    }
    if (
      newStatus === InvoiceStatus.ISSUED &&
      invoice.workOrder.status !== WorkOrderStatus.COMPLETED
    ) {
      throw new ConflictException({ error: 'work_order_not_completed' })
    }
    const issuedAt = newStatus === InvoiceStatus.ISSUED ? new Date() : undefined
    const updated = await this.repo.updateStatus(
      id,
      branchId,
      newStatus,
      issuedAt
    )
    await this.activityLogs.record({
      organizationId,
      branchId,
      accountId,
      action: ActivityAction.STATUS_CHANGED,
      entity: 'Invoice',
      entityId: id,
      metadata: { from: invoice.status, to: newStatus },
    })
    return updated
  }
}
```

- [ ] **Step 2: Run the tests — expect them all to pass**

```bash
cd apps/api && pnpm test invoices.service.spec.ts --no-coverage
```

Expected: all tests PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/invoices/invoices.service.ts apps/api/src/invoices/invoices.service.spec.ts
git commit -m "✨ feat(invoices): add InvoicesService with tests"
```

---

## Task 9: Create Prisma repository

**Files:**

- Create: `apps/api/src/invoices/infrastructure/prisma-invoice.repository.ts`

- [ ] **Step 1: Create the file**

```ts
import { Injectable } from '@nestjs/common'
import type { Prisma } from '@glossops/database'
import { InvoiceStatus } from '@glossops/database'

import { PrismaService } from '@prisma'
import type {
  InvoiceRepositoryInterface,
  CreateInvoiceData,
  UpdateInvoiceData,
  InvoiceFilters,
  InvoiceRecord,
  InvoicePage,
} from '@invoices/interfaces'

const includeForRecord = {
  workOrder: {
    include: {
      asset: { select: { id: true, assetType: true, model: true, year: true } },
    },
  },
} as const

@Injectable()
export class PrismaInvoiceRepository implements InvoiceRepositoryInterface {
  constructor(private readonly prisma: PrismaService) {}

  private toRecord(
    row: Prisma.InvoiceGetPayload<{ include: typeof includeForRecord }>
  ): InvoiceRecord {
    return {
      id: row.id,
      branchId: row.branchId,
      workOrderId: row.workOrderId,
      status: row.status,
      folio: row.folio,
      subtotal: Number(row.subtotal),
      taxRate: Number(row.taxRate),
      taxAmount: Number(row.taxAmount),
      total: Number(row.total),
      customerTaxId: row.customerTaxId,
      customerName: row.customerName,
      customerAddress: row.customerAddress,
      customerZipCode: row.customerZipCode,
      customerFiscalRegime: row.customerFiscalRegime,
      cfdiUse: row.cfdiUse,
      paymentMethod: row.paymentMethod,
      paymentForm: row.paymentForm,
      cfdiUuid: row.cfdiUuid,
      cfdiXml: row.cfdiXml,
      cfdiSealedAt: row.cfdiSealedAt,
      issuedAt: row.issuedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      workOrder: {
        id: row.workOrder.id,
        status: row.workOrder.status,
        totalAmount: Number(row.workOrder.totalAmount),
        asset: {
          id: row.workOrder.asset.id,
          assetType: row.workOrder.asset.assetType,
          model: row.workOrder.asset.model,
          year: row.workOrder.asset.year,
        },
      },
    }
  }

  async create(data: CreateInvoiceData): Promise<InvoiceRecord> {
    return this.prisma.$transaction(async tx => {
      const counter = await tx.invoiceCounter.upsert({
        where: { branchId: data.branchId },
        create: { branchId: data.branchId, lastSeq: 1 },
        update: { lastSeq: { increment: 1 } },
      })
      const year = new Date().getFullYear()
      const folio = `INV-${year}-${String(counter.lastSeq).padStart(4, '0')}`
      const row = await tx.invoice.create({
        data: {
          branchId: data.branchId,
          workOrderId: data.workOrderId,
          folio,
          subtotal: data.subtotal,
          taxRate: data.taxRate,
          taxAmount: data.taxAmount,
          total: data.total,
          customerTaxId: data.customerTaxId,
          customerName: data.customerName,
          customerAddress: data.customerAddress,
          customerZipCode: data.customerZipCode,
          customerFiscalRegime: data.customerFiscalRegime,
          cfdiUse: data.cfdiUse,
          paymentMethod: data.paymentMethod,
          paymentForm: data.paymentForm,
        },
        include: includeForRecord,
      })
      return this.toRecord(row)
    })
  }

  async findById(id: string, branchId: string): Promise<InvoiceRecord | null> {
    const row = await this.prisma.invoice.findFirst({
      where: { id, branchId },
      include: includeForRecord,
    })
    return row ? this.toRecord(row) : null
  }

  async findByWorkOrder(workOrderId: string): Promise<InvoiceRecord | null> {
    const row = await this.prisma.invoice.findUnique({
      where: { workOrderId },
      include: includeForRecord,
    })
    return row ? this.toRecord(row) : null
  }

  async findAll(
    branchId: string,
    filters: InvoiceFilters
  ): Promise<InvoicePage> {
    const where: Prisma.InvoiceWhereInput = {
      branchId,
      ...(filters.status ? { status: filters.status } : {}),
    }
    const [data, total] = await this.prisma.$transaction([
      this.prisma.invoice.findMany({
        where,
        include: includeForRecord,
        orderBy: { createdAt: 'desc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      this.prisma.invoice.count({ where }),
    ])
    return {
      data: data.map(row => this.toRecord(row)),
      total,
      page: filters.page,
      limit: filters.limit,
    }
  }

  async update(
    id: string,
    branchId: string,
    data: UpdateInvoiceData
  ): Promise<InvoiceRecord> {
    const row = await this.prisma.invoice.update({
      where: { id },
      data: {
        customerTaxId: data.customerTaxId,
        customerName: data.customerName,
        customerAddress: data.customerAddress,
        customerZipCode: data.customerZipCode,
        customerFiscalRegime: data.customerFiscalRegime,
        cfdiUse: data.cfdiUse,
        paymentMethod: data.paymentMethod,
        paymentForm: data.paymentForm,
      },
      include: includeForRecord,
    })
    return this.toRecord(row)
  }

  async updateStatus(
    id: string,
    branchId: string,
    status: InvoiceStatus,
    issuedAt?: Date
  ): Promise<InvoiceRecord> {
    const row = await this.prisma.invoice.update({
      where: { id },
      data: { status, ...(issuedAt ? { issuedAt } : {}) },
      include: includeForRecord,
    })
    return this.toRecord(row)
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/invoices/infrastructure/prisma-invoice.repository.ts
git commit -m "✨ feat(invoices): add Prisma invoice repository"
```

---

## Task 10: Write failing controller tests

**Files:**

- Create: `apps/api/src/invoices/invoices.controller.spec.ts`
- Create: `apps/api/src/invoices/work-order-invoice.controller.spec.ts`

- [ ] **Step 1: Create `invoices.controller.spec.ts`**

```ts
import { Test } from '@nestjs/testing'
import { Role } from '@glossops/database'

import type { AuthContext } from '@auth/interfaces'

import { InvoicesController } from './invoices.controller'
import { InvoicesService } from './invoices.service'

const makeAccount = (role: Role): AuthContext => ({
  sub: 'acc-1',
  memberId: 'mem-1',
  email: 'test@test.com',
  branchId: 'branch-1',
  organizationId: 'org-1',
  role,
})
const OWNER = makeAccount(Role.OWNER)

describe('InvoicesController', () => {
  let controller: InvoicesController
  let service: {
    create: jest.Mock
    findAll: jest.Mock
    findOne: jest.Mock
    update: jest.Mock
    transition: jest.Mock
  }

  beforeEach(async () => {
    service = {
      create: jest.fn().mockResolvedValue({}),
      findAll: jest
        .fn()
        .mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 }),
      findOne: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
      transition: jest.fn().mockResolvedValue({}),
    }
    const module = await Test.createTestingModule({
      controllers: [InvoicesController],
      providers: [{ provide: InvoicesService, useValue: service }],
    }).compile()
    controller = module.get(InvoicesController)
  })

  describe('create', () => {
    it('calls service.create with branchId, organizationId, dto, and accountId', async () => {
      const dto = { workOrderId: 'wo-1' }
      await controller.create(OWNER, dto as any)
      expect(service.create).toHaveBeenCalledWith(
        'branch-1',
        'org-1',
        dto,
        'acc-1'
      )
    })
  })

  describe('findAll', () => {
    it('calls service.findAll with branchId and dto', async () => {
      const dto = { page: 1, limit: 20 }
      await controller.findAll(OWNER, dto as any)
      expect(service.findAll).toHaveBeenCalledWith('branch-1', dto)
    })
  })

  describe('findOne', () => {
    it('calls service.findOne with id and branchId', async () => {
      await controller.findOne('inv-1', OWNER)
      expect(service.findOne).toHaveBeenCalledWith('inv-1', 'branch-1')
    })
  })

  describe('update', () => {
    it('calls service.update with id, branchId, and dto', async () => {
      const dto = { customerName: 'Empresa SA' }
      await controller.update('inv-1', OWNER, dto as any)
      expect(service.update).toHaveBeenCalledWith('inv-1', 'branch-1', dto)
    })
  })

  describe('transition', () => {
    it('calls service.transition with id, branchId, organizationId, status, and accountId', async () => {
      const dto = { status: 'ISSUED' as any }
      await controller.transition('inv-1', OWNER, dto)
      expect(service.transition).toHaveBeenCalledWith(
        'inv-1',
        'branch-1',
        'org-1',
        'ISSUED',
        'acc-1'
      )
    })
  })
})
```

- [ ] **Step 2: Create `work-order-invoice.controller.spec.ts`**

```ts
import { Test } from '@nestjs/testing'
import { Role } from '@glossops/database'

import type { AuthContext } from '@auth/interfaces'

import { WorkOrderInvoiceController } from './work-order-invoice.controller'
import { InvoicesService } from './invoices.service'

const makeAccount = (role: Role): AuthContext => ({
  sub: 'acc-1',
  memberId: 'mem-1',
  email: 'test@test.com',
  branchId: 'branch-1',
  organizationId: 'org-1',
  role,
})
const OWNER = makeAccount(Role.OWNER)

describe('WorkOrderInvoiceController', () => {
  let controller: WorkOrderInvoiceController
  let service: { findByWorkOrder: jest.Mock }

  beforeEach(async () => {
    service = { findByWorkOrder: jest.fn().mockResolvedValue({}) }
    const module = await Test.createTestingModule({
      controllers: [WorkOrderInvoiceController],
      providers: [{ provide: InvoicesService, useValue: service }],
    }).compile()
    controller = module.get(WorkOrderInvoiceController)
  })

  describe('findByWorkOrder', () => {
    it('calls service.findByWorkOrder with workOrderId and branchId', async () => {
      await controller.findByWorkOrder('wo-1', OWNER)
      expect(service.findByWorkOrder).toHaveBeenCalledWith('wo-1', 'branch-1')
    })
  })
})
```

- [ ] **Step 3: Run both specs — expect FAIL**

```bash
cd apps/api && pnpm test invoices.controller.spec.ts work-order-invoice.controller.spec.ts --no-coverage
```

Expected: FAIL — `Cannot find module './invoices.controller'`

---

## Task 11: Implement controllers

**Files:**

- Create: `apps/api/src/invoices/invoices.controller.ts`
- Create: `apps/api/src/invoices/work-order-invoice.controller.ts`

- [ ] **Step 1: Create `invoices.controller.ts`**

```ts
import {
  Body,
  Controller,
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

import { InvoicesService } from './invoices.service'
import {
  CreateInvoiceDto,
  ListInvoicesDto,
  TransitionInvoiceDto,
  UpdateInvoiceDto,
} from './dto'

@ApiTags('Invoices')
@ApiBearerAuth()
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly service: InvoicesService) {}

  @Post()
  @HttpCode(201)
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Create an invoice for a completed work order' })
  create(
    @CurrentAccount() account: AuthContext,
    @Body() dto: CreateInvoiceDto
  ) {
    return this.service.create(
      account.branchId!,
      account.organizationId!,
      dto,
      account.sub
    )
  }

  @Get()
  @ApiOperation({ summary: 'List invoices for the branch' })
  findAll(
    @CurrentAccount() account: AuthContext,
    @Query() dto: ListInvoicesDto
  ) {
    return this.service.findAll(account.branchId!, dto)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get invoice detail' })
  findOne(@Param('id') id: string, @CurrentAccount() account: AuthContext) {
    return this.service.findOne(id, account.branchId!)
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Update fiscal data on a DRAFT invoice' })
  update(
    @Param('id') id: string,
    @CurrentAccount() account: AuthContext,
    @Body() dto: UpdateInvoiceDto
  ) {
    return this.service.update(id, account.branchId!, dto)
  }

  @Patch(':id/status')
  @HttpCode(200)
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Transition invoice status' })
  transition(
    @Param('id') id: string,
    @CurrentAccount() account: AuthContext,
    @Body() dto: TransitionInvoiceDto
  ) {
    return this.service.transition(
      id,
      account.branchId!,
      account.organizationId!,
      dto.status,
      account.sub
    )
  }
}
```

- [ ] **Step 2: Create `work-order-invoice.controller.ts`**

```ts
import { Controller, Get, Param } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'

import { CurrentAccount } from '@auth/decorators'
import type { AuthContext } from '@auth/interfaces'

import { InvoicesService } from './invoices.service'

@ApiTags('Work Orders')
@ApiBearerAuth()
@Controller('work-orders')
export class WorkOrderInvoiceController {
  constructor(private readonly service: InvoicesService) {}

  @Get(':workOrderId/invoice')
  @ApiOperation({ summary: 'Get the invoice for a specific work order' })
  findByWorkOrder(
    @Param('workOrderId') workOrderId: string,
    @CurrentAccount() account: AuthContext
  ) {
    return this.service.findByWorkOrder(workOrderId, account.branchId!)
  }
}
```

- [ ] **Step 3: Run both controller specs — expect PASS**

```bash
cd apps/api && pnpm test invoices.controller.spec.ts work-order-invoice.controller.spec.ts --no-coverage
```

Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/invoices/invoices.controller.ts apps/api/src/invoices/invoices.controller.spec.ts apps/api/src/invoices/work-order-invoice.controller.ts apps/api/src/invoices/work-order-invoice.controller.spec.ts
git commit -m "✨ feat(invoices): add InvoicesController and WorkOrderInvoiceController with tests"
```

---

## Task 12: Create module and barrel

**Files:**

- Create: `apps/api/src/invoices/invoices.module.ts`
- Create: `apps/api/src/invoices/index.ts`

- [ ] **Step 1: Create `invoices.module.ts`**

```ts
import { Module } from '@nestjs/common'

import { PrismaModule } from '@prisma'

import { ActivityLogsModule } from '../activity-logs/activity-logs.module'
import { WorkOrdersModule } from '../work-orders/work-orders.module'
import { PrismaInvoiceRepository } from './infrastructure/prisma-invoice.repository'
import { WorkOrderInvoiceController } from './work-order-invoice.controller'
import { InvoicesController } from './invoices.controller'
import { INVOICE_REPOSITORY } from './invoices.tokens'
import { InvoicesService } from './invoices.service'

@Module({
  imports: [PrismaModule, WorkOrdersModule, ActivityLogsModule],
  controllers: [InvoicesController, WorkOrderInvoiceController],
  providers: [
    { provide: INVOICE_REPOSITORY, useClass: PrismaInvoiceRepository },
    InvoicesService,
  ],
  exports: [InvoicesService],
})
export class InvoicesModule {}
```

- [ ] **Step 2: Create `index.ts`**

```ts
export { InvoicesModule } from './invoices.module'
export { InvoicesService } from './invoices.service'
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/invoices/invoices.module.ts apps/api/src/invoices/index.ts
git commit -m "✨ feat(invoices): wire module and barrel"
```

---

## Task 13: Register in `AppModule` and run full test suite

**Files:**

- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Add `InvoicesModule` to `AppModule`**

In `apps/api/src/app.module.ts`, add the import at the top of the file (after the existing `WarrantiesModule` import, maintaining alphabetical/length ordering):

```ts
import { InvoicesModule } from './invoices/invoices.module'
```

Then add `InvoicesModule` to the `imports` array in `@Module`, after `WarrantiesModule`:

```ts
    WarrantiesModule,
    InvoicesModule,
```

- [ ] **Step 2: Run the full API test suite**

```bash
cd apps/api && pnpm test --no-coverage
```

Expected: all existing tests still pass, all new invoice tests pass.

- [ ] **Step 3: Build to verify TypeScript**

```bash
cd apps/api && pnpm build
```

Expected: no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/app.module.ts
git commit -m "✨ feat(invoices): register InvoicesModule in AppModule"
```
