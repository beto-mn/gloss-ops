# Asset Checkpoints Module — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `AssetCheckpointsModule` — CRUD for vehicle checkpoints (RECEPTION / DELIVERY) scoped to a work order, with status-based creation guards and ownership validation.

**Architecture:** Repository pattern — one repository, one service, one controller. `AssetCheckpointsModule` imports `WorkOrdersModule` (which must be updated to export `WorkOrdersService`) to validate work order ownership and status before writes. All endpoints are nested under `/work-orders/:workOrderId/checkpoints`.

**Tech Stack:** NestJS, TypeScript, Prisma, class-validator, Jest, in-memory repository for unit tests.

**Spec:** `docs/superpowers/specs/2026-05-19-asset-checkpoints-design.md`

---

### Task 1: Path aliases + WorkOrdersModule export

Adds the three `@asset-checkpoints` path aliases to both TypeScript and Jest configs, and adds `exports: [WorkOrdersService]` to `WorkOrdersModule` so the upcoming `AssetCheckpointsModule` can inject it.

**Files:**

- Modify: `apps/api/tsconfig.paths.json`
- Modify: `apps/api/package.json` (jest `moduleNameMapper`)
- Modify: `apps/api/src/work-orders/work-orders.module.ts`

- [ ] **Step 1: Add path aliases to `tsconfig.paths.json`**

  Add after the `@purchase-orders/interfaces` entry:

  ```json
  "@asset-checkpoints": ["./src/asset-checkpoints/index.ts"],
  "@asset-checkpoints/dto": ["./src/asset-checkpoints/dto/index.ts"],
  "@asset-checkpoints/interfaces": ["./src/asset-checkpoints/interfaces/index.ts"]
  ```

  Full resulting block (last entries of `paths`):

  ```json
  "@purchase-orders": ["./src/purchase-orders/index.ts"],
  "@purchase-orders/dto": ["./src/purchase-orders/dto/index.ts"],
  "@purchase-orders/interfaces": [
    "./src/purchase-orders/interfaces/index.ts"
  ],
  "@asset-checkpoints": ["./src/asset-checkpoints/index.ts"],
  "@asset-checkpoints/dto": ["./src/asset-checkpoints/dto/index.ts"],
  "@asset-checkpoints/interfaces": [
    "./src/asset-checkpoints/interfaces/index.ts"
  ]
  ```

- [ ] **Step 2: Add entries to jest `moduleNameMapper` in `apps/api/package.json`**

  Inside the `"jest"."moduleNameMapper"` object, after the `@purchase-orders/interfaces` entry add:

  ```json
  "^@asset-checkpoints$": "<rootDir>/asset-checkpoints/index.ts",
  "^@asset-checkpoints/dto$": "<rootDir>/asset-checkpoints/dto/index.ts",
  "^@asset-checkpoints/interfaces$": "<rootDir>/asset-checkpoints/interfaces/index.ts"
  ```

- [ ] **Step 3: Export `WorkOrdersService` from `WorkOrdersModule`**

  In `apps/api/src/work-orders/work-orders.module.ts`, add an `exports` array to the `@Module` decorator:

  ```typescript
  @Module({
    imports: [PrismaModule, InventoryModule],
    controllers: [
      WorkOrdersController,
      WorkOrderItemsController,
      WorkOrderUsagesController,
    ],
    providers: [
      { provide: WORK_ORDER_REPOSITORY, useClass: PrismaWorkOrderRepository },
      {
        provide: WORK_ORDER_ITEM_REPOSITORY,
        useClass: PrismaWorkOrderItemRepository,
      },
      WorkOrdersService,
    ],
    exports: [WorkOrdersService],
  })
  export class WorkOrdersModule {}
  ```

- [ ] **Step 4: Run existing tests to verify nothing broke**

  Run from `apps/api/`:

  ```bash
  npm test
  ```

  Expected: all existing specs pass.

- [ ] **Step 5: Commit**

  ```bash
  git add apps/api/tsconfig.paths.json apps/api/package.json apps/api/src/work-orders/work-orders.module.ts
  ```

  Commit message (use gitmoji commit skill):
  `🔧 chore(asset-checkpoints): add path aliases and export WorkOrdersService`

---

### Task 2: DI tokens + repository interface

Creates the injection token and the repository contract (interface + data types).

**Files:**

- Create: `apps/api/src/asset-checkpoints/asset-checkpoints.tokens.ts`
- Create: `apps/api/src/asset-checkpoints/interfaces/asset-checkpoint.repository.interface.ts`
- Create: `apps/api/src/asset-checkpoints/interfaces/index.ts`

- [ ] **Step 1: Create `asset-checkpoints.tokens.ts`**

  ```typescript
  export const ASSET_CHECKPOINT_REPOSITORY = Symbol(
    'AssetCheckpointRepositoryInterface'
  )
  ```

- [ ] **Step 2: Create `interfaces/asset-checkpoint.repository.interface.ts`**

  ```typescript
  import type {
    AssetCondition,
    CheckpointType,
    FuelLevel,
  } from '@glossops/database'

  export interface AssetCheckpointRecord {
    id: string
    workOrderId: string
    type: CheckpointType
    mileage: number | null
    fuelLevel: FuelLevel | null
    generalCondition: AssetCondition
    note: string | null
    photo: string[]
    customerSignatureUrl: string | null
    recordedAt: Date
    recordedById: string
  }

  export interface CreateAssetCheckpointData {
    workOrderId: string
    type: CheckpointType
    mileage?: number
    fuelLevel?: FuelLevel
    generalCondition: AssetCondition
    note?: string
    photo?: string[]
    customerSignatureUrl?: string
    recordedById: string
  }

  export interface UpdateAssetCheckpointData {
    mileage?: number | null
    fuelLevel?: FuelLevel | null
    generalCondition?: AssetCondition
    note?: string | null
    photo?: string[]
    customerSignatureUrl?: string | null
  }

  export interface AssetCheckpointRepositoryInterface {
    create(data: CreateAssetCheckpointData): Promise<AssetCheckpointRecord>
    findAllByWorkOrder(workOrderId: string): Promise<AssetCheckpointRecord[]>
    findById(id: string): Promise<AssetCheckpointRecord | null>
    existsByWorkOrderAndType(
      workOrderId: string,
      type: CheckpointType
    ): Promise<boolean>
    update(
      id: string,
      data: UpdateAssetCheckpointData
    ): Promise<AssetCheckpointRecord>
    delete(id: string): Promise<void>
  }
  ```

- [ ] **Step 3: Create `interfaces/index.ts`**

  ```typescript
  export type { AssetCheckpointRepositoryInterface } from './asset-checkpoint.repository.interface'
  export type { UpdateAssetCheckpointData } from './asset-checkpoint.repository.interface'
  export type { CreateAssetCheckpointData } from './asset-checkpoint.repository.interface'
  export type { AssetCheckpointRecord } from './asset-checkpoint.repository.interface'
  ```

- [ ] **Step 4: Verify TypeScript compiles**

  ```bash
  cd apps/api && npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 5: Commit**

  ```bash
  git add apps/api/src/asset-checkpoints/
  ```

  Commit message: `✨ feat(asset-checkpoints): add DI token and repository interface`

---

### Task 3: DTOs

Creates the two request DTOs with class-validator decorators.

**Files:**

- Create: `apps/api/src/asset-checkpoints/dto/create-asset-checkpoint.dto.ts`
- Create: `apps/api/src/asset-checkpoints/dto/update-asset-checkpoint.dto.ts`
- Create: `apps/api/src/asset-checkpoints/dto/index.ts`

- [ ] **Step 1: Create `dto/create-asset-checkpoint.dto.ts`**

  ```typescript
  import {
    IsArray,
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    IsUrl,
    Min,
  } from 'class-validator'
  import { AssetCondition, CheckpointType, FuelLevel } from '@glossops/database'

  export class CreateAssetCheckpointDto {
    @IsEnum(CheckpointType)
    type: CheckpointType

    @IsOptional()
    @IsInt()
    @Min(0)
    mileage?: number

    @IsOptional()
    @IsEnum(FuelLevel)
    fuelLevel?: FuelLevel

    @IsEnum(AssetCondition)
    generalCondition: AssetCondition

    @IsOptional()
    @IsString()
    note?: string

    @IsOptional()
    @IsArray()
    @IsUrl({}, { each: true })
    photo?: string[]

    @IsOptional()
    @IsUrl()
    customerSignatureUrl?: string
  }
  ```

- [ ] **Step 2: Create `dto/update-asset-checkpoint.dto.ts`**

  `type` is intentionally absent — a checkpoint's type is immutable after creation.

  ```typescript
  import {
    IsArray,
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    IsUrl,
    Min,
  } from 'class-validator'
  import { AssetCondition, FuelLevel } from '@glossops/database'

  export class UpdateAssetCheckpointDto {
    @IsOptional()
    @IsInt()
    @Min(0)
    mileage?: number | null

    @IsOptional()
    @IsEnum(FuelLevel)
    fuelLevel?: FuelLevel | null

    @IsOptional()
    @IsEnum(AssetCondition)
    generalCondition?: AssetCondition

    @IsOptional()
    @IsString()
    note?: string | null

    @IsOptional()
    @IsArray()
    @IsUrl({}, { each: true })
    photo?: string[]

    @IsOptional()
    @IsUrl()
    customerSignatureUrl?: string | null
  }
  ```

- [ ] **Step 3: Create `dto/index.ts`**

  Sorted longest → shortest line length:

  ```typescript
  export { CreateAssetCheckpointDto } from './create-asset-checkpoint.dto'
  export { UpdateAssetCheckpointDto } from './update-asset-checkpoint.dto'
  ```

- [ ] **Step 4: Verify TypeScript compiles**

  ```bash
  cd apps/api && npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 5: Commit**

  ```bash
  git add apps/api/src/asset-checkpoints/dto/
  ```

  Commit message: `✨ feat(asset-checkpoints): add CreateAssetCheckpointDto and UpdateAssetCheckpointDto`

---

### Task 4: In-memory repository

Creates the in-memory implementation used exclusively in service tests. No dedicated spec — it will be exercised thoroughly by the service spec in Task 5.

**Files:**

- Create: `apps/api/src/asset-checkpoints/infrastructure/in-memory-asset-checkpoint.repository.ts`

- [ ] **Step 1: Create `infrastructure/in-memory-asset-checkpoint.repository.ts`**

  ```typescript
  import { randomUUID } from 'crypto'

  import { Injectable } from '@nestjs/common'
  import { CheckpointType } from '@glossops/database'

  import type { AssetCheckpointRepositoryInterface } from '@asset-checkpoints/interfaces'
  import type {
    UpdateAssetCheckpointData,
    CreateAssetCheckpointData,
    AssetCheckpointRecord,
  } from '@asset-checkpoints/interfaces'

  @Injectable()
  export class InMemoryAssetCheckpointRepository implements AssetCheckpointRepositoryInterface {
    readonly store = new Map<string, AssetCheckpointRecord>()

    async create(
      data: CreateAssetCheckpointData
    ): Promise<AssetCheckpointRecord> {
      const record: AssetCheckpointRecord = {
        id: randomUUID(),
        workOrderId: data.workOrderId,
        type: data.type,
        mileage: data.mileage ?? null,
        fuelLevel: data.fuelLevel ?? null,
        generalCondition: data.generalCondition,
        note: data.note ?? null,
        photo: data.photo ?? [],
        customerSignatureUrl: data.customerSignatureUrl ?? null,
        recordedAt: new Date(),
        recordedById: data.recordedById,
      }
      this.store.set(record.id, record)
      return record
    }

    async findAllByWorkOrder(
      workOrderId: string
    ): Promise<AssetCheckpointRecord[]> {
      return Array.from(this.store.values()).filter(
        r => r.workOrderId === workOrderId
      )
    }

    async findById(id: string): Promise<AssetCheckpointRecord | null> {
      return this.store.get(id) ?? null
    }

    async existsByWorkOrderAndType(
      workOrderId: string,
      type: CheckpointType
    ): Promise<boolean> {
      return Array.from(this.store.values()).some(
        r => r.workOrderId === workOrderId && r.type === type
      )
    }

    async update(
      id: string,
      data: UpdateAssetCheckpointData
    ): Promise<AssetCheckpointRecord> {
      const existing = this.store.get(id)!
      const updated: AssetCheckpointRecord = {
        ...existing,
        ...(data.mileage !== undefined ? { mileage: data.mileage } : {}),
        ...(data.fuelLevel !== undefined ? { fuelLevel: data.fuelLevel } : {}),
        ...(data.generalCondition !== undefined
          ? { generalCondition: data.generalCondition }
          : {}),
        ...(data.note !== undefined ? { note: data.note } : {}),
        ...(data.photo !== undefined ? { photo: data.photo } : {}),
        ...(data.customerSignatureUrl !== undefined
          ? { customerSignatureUrl: data.customerSignatureUrl }
          : {}),
      }
      this.store.set(id, updated)
      return updated
    }

    async delete(id: string): Promise<void> {
      this.store.delete(id)
    }
  }
  ```

- [ ] **Step 2: Verify TypeScript compiles**

  ```bash
  cd apps/api && npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 3: Commit**

  ```bash
  git add apps/api/src/asset-checkpoints/infrastructure/
  ```

  Commit message: `✨ feat(asset-checkpoints): add InMemoryAssetCheckpointRepository`

---

### Task 5: AssetCheckpointsService — TDD

Writes the spec first (all tests fail), then implements the service to make them pass. `WorkOrdersService` is a jest mock; the repository is the in-memory implementation.

**Files:**

- Create: `apps/api/src/asset-checkpoints/asset-checkpoints.service.spec.ts`
- Create: `apps/api/src/asset-checkpoints/asset-checkpoints.service.ts`

- [ ] **Step 1: Write the failing spec**

  Create `apps/api/src/asset-checkpoints/asset-checkpoints.service.spec.ts`:

  ```typescript
  import { ConflictException, NotFoundException } from '@nestjs/common'
  import { Test, type TestingModule } from '@nestjs/testing'
  import {
    AssetCondition,
    CheckpointType,
    FuelLevel,
    WorkOrderStatus,
  } from '@glossops/database'

  import { ASSET_CHECKPOINT_REPOSITORY } from './asset-checkpoints.tokens'
  import { AssetCheckpointsService } from './asset-checkpoints.service'
  import { InMemoryAssetCheckpointRepository } from './infrastructure/in-memory-asset-checkpoint.repository'
  import { WorkOrdersService } from '../work-orders/work-orders.service'

  const WO_ID = 'wo-1'
  const ORG_ID = 'org-1'
  const ACCOUNT_ID = 'acc-1'

  const activeWo = { id: WO_ID, status: WorkOrderStatus.IN_PROGRESS } as any
  const completedWo = { id: WO_ID, status: WorkOrderStatus.COMPLETED } as any
  const cancelledWo = { id: WO_ID, status: WorkOrderStatus.CANCELLED } as any

  const baseDto = {
    type: CheckpointType.RECEPTION,
    generalCondition: AssetCondition.GOOD,
  }

  describe('AssetCheckpointsService', () => {
    let service: AssetCheckpointsService
    let repo: InMemoryAssetCheckpointRepository
    let workOrdersService: jest.Mocked<Pick<WorkOrdersService, 'findOne'>>

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AssetCheckpointsService,
          {
            provide: ASSET_CHECKPOINT_REPOSITORY,
            useClass: InMemoryAssetCheckpointRepository,
          },
          {
            provide: WorkOrdersService,
            useValue: { findOne: jest.fn() },
          },
        ],
      }).compile()

      service = module.get(AssetCheckpointsService)
      repo = module.get(ASSET_CHECKPOINT_REPOSITORY)
      workOrdersService = module.get(WorkOrdersService)
    })

    afterEach(() => {
      repo.store.clear()
      jest.clearAllMocks()
    })

    // ── create ─────────────────────────────────────────────────────────────────

    describe('create', () => {
      it('creates a RECEPTION checkpoint on an active WO', async () => {
        workOrdersService.findOne.mockResolvedValue(activeWo)

        const result = await service.create(WO_ID, baseDto, ACCOUNT_ID, ORG_ID)

        expect(result.workOrderId).toBe(WO_ID)
        expect(result.type).toBe(CheckpointType.RECEPTION)
        expect(result.recordedById).toBe(ACCOUNT_ID)
        expect(result.generalCondition).toBe(AssetCondition.GOOD)
      })

      it('creates a DELIVERY checkpoint on an active WO', async () => {
        workOrdersService.findOne.mockResolvedValue(activeWo)

        const result = await service.create(
          WO_ID,
          { ...baseDto, type: CheckpointType.DELIVERY },
          ACCOUNT_ID,
          ORG_ID
        )

        expect(result.type).toBe(CheckpointType.DELIVERY)
      })

      it('creates a DELIVERY checkpoint on a COMPLETED WO', async () => {
        workOrdersService.findOne.mockResolvedValue(completedWo)

        const result = await service.create(
          WO_ID,
          { ...baseDto, type: CheckpointType.DELIVERY },
          ACCOUNT_ID,
          ORG_ID
        )

        expect(result.type).toBe(CheckpointType.DELIVERY)
      })

      it('throws 409 work_order_cancelled when WO is CANCELLED', async () => {
        workOrdersService.findOne.mockResolvedValue(cancelledWo)

        await expect(
          service.create(WO_ID, baseDto, ACCOUNT_ID, ORG_ID)
        ).rejects.toMatchObject({
          response: { error: 'work_order_cancelled' },
        })
      })

      it('throws 409 work_order_completed when RECEPTION on COMPLETED WO', async () => {
        workOrdersService.findOne.mockResolvedValue(completedWo)

        await expect(
          service.create(WO_ID, baseDto, ACCOUNT_ID, ORG_ID)
        ).rejects.toMatchObject({
          response: { error: 'work_order_completed' },
        })
      })

      it('throws 409 checkpoint_already_exists when same type already exists', async () => {
        workOrdersService.findOne.mockResolvedValue(activeWo)
        await service.create(WO_ID, baseDto, ACCOUNT_ID, ORG_ID)

        await expect(
          service.create(WO_ID, baseDto, ACCOUNT_ID, ORG_ID)
        ).rejects.toMatchObject({
          response: { error: 'checkpoint_already_exists' },
        })
      })
    })

    // ── findAll ────────────────────────────────────────────────────────────────

    describe('findAll', () => {
      it('returns all checkpoints for the given WO', async () => {
        workOrdersService.findOne.mockResolvedValue(activeWo)
        await service.create(
          WO_ID,
          { ...baseDto, type: CheckpointType.RECEPTION },
          ACCOUNT_ID,
          ORG_ID
        )
        await service.create(
          WO_ID,
          { ...baseDto, type: CheckpointType.DELIVERY },
          ACCOUNT_ID,
          ORG_ID
        )

        const results = await service.findAll(WO_ID, ORG_ID)

        expect(results).toHaveLength(2)
      })
    })

    // ── findOne ────────────────────────────────────────────────────────────────

    describe('findOne', () => {
      it('throws 404 checkpoint_not_found when checkpoint does not exist', async () => {
        workOrdersService.findOne.mockResolvedValue(activeWo)

        await expect(
          service.findOne(WO_ID, 'nonexistent-id', ORG_ID)
        ).rejects.toMatchObject({
          response: { error: 'checkpoint_not_found' },
        })
      })

      it('throws 404 checkpoint_not_found when checkpoint belongs to a different WO', async () => {
        workOrdersService.findOne.mockResolvedValue(activeWo)
        const checkpoint = await service.create(
          WO_ID,
          baseDto,
          ACCOUNT_ID,
          ORG_ID
        )

        await expect(
          service.findOne('other-wo-id', checkpoint.id, ORG_ID)
        ).rejects.toMatchObject({
          response: { error: 'checkpoint_not_found' },
        })
      })
    })

    // ── update ─────────────────────────────────────────────────────────────────

    describe('update', () => {
      it('updates mileage and note', async () => {
        workOrdersService.findOne.mockResolvedValue(activeWo)
        const checkpoint = await service.create(
          WO_ID,
          baseDto,
          ACCOUNT_ID,
          ORG_ID
        )

        const updated = await service.update(
          WO_ID,
          checkpoint.id,
          { mileage: 12000, note: 'scratch on door' },
          ORG_ID
        )

        expect(updated.mileage).toBe(12000)
        expect(updated.note).toBe('scratch on door')
      })

      it('throws 404 checkpoint_not_found when checkpoint does not exist', async () => {
        workOrdersService.findOne.mockResolvedValue(activeWo)

        await expect(
          service.update(WO_ID, 'nonexistent-id', { mileage: 1000 }, ORG_ID)
        ).rejects.toMatchObject({
          response: { error: 'checkpoint_not_found' },
        })
      })
    })

    // ── remove ─────────────────────────────────────────────────────────────────

    describe('remove', () => {
      it('deletes the checkpoint', async () => {
        workOrdersService.findOne.mockResolvedValue(activeWo)
        const checkpoint = await service.create(
          WO_ID,
          baseDto,
          ACCOUNT_ID,
          ORG_ID
        )

        await service.remove(WO_ID, checkpoint.id, ORG_ID)

        expect(repo.store.has(checkpoint.id)).toBe(false)
      })

      it('throws 404 checkpoint_not_found when checkpoint does not exist', async () => {
        workOrdersService.findOne.mockResolvedValue(activeWo)

        await expect(
          service.remove(WO_ID, 'nonexistent-id', ORG_ID)
        ).rejects.toMatchObject({
          response: { error: 'checkpoint_not_found' },
        })
      })
    })
  })
  ```

- [ ] **Step 2: Run spec to verify all tests fail**

  ```bash
  cd apps/api && npm test -- --testPathPattern="asset-checkpoints.service"
  ```

  Expected: `Cannot find module './asset-checkpoints.service'` or similar — all tests fail.

- [ ] **Step 3: Implement `AssetCheckpointsService`**

  Create `apps/api/src/asset-checkpoints/asset-checkpoints.service.ts`:

  ```typescript
  import {
    ConflictException,
    Inject,
    Injectable,
    NotFoundException,
  } from '@nestjs/common'
  import { CheckpointType, WorkOrderStatus } from '@glossops/database'

  import type { AssetCheckpointRecord } from '@asset-checkpoints/interfaces'

  import { CreateAssetCheckpointDto } from './dto/create-asset-checkpoint.dto'
  import { UpdateAssetCheckpointDto } from './dto/update-asset-checkpoint.dto'
  import { ASSET_CHECKPOINT_REPOSITORY } from './asset-checkpoints.tokens'
  import { WorkOrdersService } from '../work-orders/work-orders.service'
  import type { AssetCheckpointRepositoryInterface } from './interfaces/asset-checkpoint.repository.interface'

  @Injectable()
  export class AssetCheckpointsService {
    constructor(
      @Inject(ASSET_CHECKPOINT_REPOSITORY)
      private readonly repo: AssetCheckpointRepositoryInterface,
      private readonly workOrdersService: WorkOrdersService
    ) {}

    async create(
      workOrderId: string,
      dto: CreateAssetCheckpointDto,
      accountId: string,
      organizationId: string
    ): Promise<AssetCheckpointRecord> {
      const wo = await this.workOrdersService.findOne(
        workOrderId,
        organizationId
      )

      if (wo.status === WorkOrderStatus.CANCELLED) {
        throw new ConflictException({ error: 'work_order_cancelled' })
      }
      if (
        dto.type === CheckpointType.RECEPTION &&
        wo.status === WorkOrderStatus.COMPLETED
      ) {
        throw new ConflictException({ error: 'work_order_completed' })
      }

      const exists = await this.repo.existsByWorkOrderAndType(
        workOrderId,
        dto.type
      )
      if (exists)
        throw new ConflictException({ error: 'checkpoint_already_exists' })

      return this.repo.create({
        workOrderId,
        type: dto.type,
        mileage: dto.mileage,
        fuelLevel: dto.fuelLevel,
        generalCondition: dto.generalCondition,
        note: dto.note,
        photo: dto.photo,
        customerSignatureUrl: dto.customerSignatureUrl,
        recordedById: accountId,
      })
    }

    async findAll(
      workOrderId: string,
      organizationId: string
    ): Promise<AssetCheckpointRecord[]> {
      await this.workOrdersService.findOne(workOrderId, organizationId)
      return this.repo.findAllByWorkOrder(workOrderId)
    }

    async findOne(
      workOrderId: string,
      id: string,
      organizationId: string
    ): Promise<AssetCheckpointRecord> {
      await this.workOrdersService.findOne(workOrderId, organizationId)
      const checkpoint = await this.repo.findById(id)
      if (!checkpoint || checkpoint.workOrderId !== workOrderId) {
        throw new NotFoundException({ error: 'checkpoint_not_found' })
      }
      return checkpoint
    }

    async update(
      workOrderId: string,
      id: string,
      dto: UpdateAssetCheckpointDto,
      organizationId: string
    ): Promise<AssetCheckpointRecord> {
      await this.workOrdersService.findOne(workOrderId, organizationId)
      const checkpoint = await this.repo.findById(id)
      if (!checkpoint || checkpoint.workOrderId !== workOrderId) {
        throw new NotFoundException({ error: 'checkpoint_not_found' })
      }
      return this.repo.update(id, dto)
    }

    async remove(
      workOrderId: string,
      id: string,
      organizationId: string
    ): Promise<void> {
      await this.workOrdersService.findOne(workOrderId, organizationId)
      const checkpoint = await this.repo.findById(id)
      if (!checkpoint || checkpoint.workOrderId !== workOrderId) {
        throw new NotFoundException({ error: 'checkpoint_not_found' })
      }
      await this.repo.delete(id)
    }
  }
  ```

- [ ] **Step 4: Run spec to verify all tests pass**

  ```bash
  cd apps/api && npm test -- --testPathPattern="asset-checkpoints.service"
  ```

  Expected: `Tests: 13 passed, 13 total`.

- [ ] **Step 5: Commit**

  ```bash
  git add apps/api/src/asset-checkpoints/
  ```

  Commit message: `✨ feat(asset-checkpoints): add AssetCheckpointsService with TDD`

---

### Task 6: Prisma repository

Implements the Prisma-backed repository. No dedicated unit test — this requires a real database; correctness is validated by TypeScript compilation and the field mapping.

**Files:**

- Create: `apps/api/src/asset-checkpoints/infrastructure/prisma-asset-checkpoint.repository.ts`

- [ ] **Step 1: Create `infrastructure/prisma-asset-checkpoint.repository.ts`**

  ```typescript
  import { Injectable } from '@nestjs/common'
  import { CheckpointType } from '@glossops/database'

  import type { AssetCheckpointRepositoryInterface } from '@asset-checkpoints/interfaces'
  import type {
    UpdateAssetCheckpointData,
    CreateAssetCheckpointData,
    AssetCheckpointRecord,
  } from '@asset-checkpoints/interfaces'

  import { PrismaService } from '../../prisma/prisma.service'

  @Injectable()
  export class PrismaAssetCheckpointRepository implements AssetCheckpointRepositoryInterface {
    constructor(private readonly prisma: PrismaService) {}

    async create(
      data: CreateAssetCheckpointData
    ): Promise<AssetCheckpointRecord> {
      return this.prisma.assetCheckpoint.create({
        data: {
          workOrderId: data.workOrderId,
          type: data.type,
          mileage: data.mileage ?? null,
          fuelLevel: data.fuelLevel ?? null,
          generalCondition: data.generalCondition,
          note: data.note ?? null,
          photo: data.photo ?? [],
          customerSignatureUrl: data.customerSignatureUrl ?? null,
          recordedById: data.recordedById,
        },
      })
    }

    async findAllByWorkOrder(
      workOrderId: string
    ): Promise<AssetCheckpointRecord[]> {
      return this.prisma.assetCheckpoint.findMany({
        where: { workOrderId },
        orderBy: { recordedAt: 'asc' },
      })
    }

    async findById(id: string): Promise<AssetCheckpointRecord | null> {
      return this.prisma.assetCheckpoint.findUnique({ where: { id } })
    }

    async existsByWorkOrderAndType(
      workOrderId: string,
      type: CheckpointType
    ): Promise<boolean> {
      const count = await this.prisma.assetCheckpoint.count({
        where: { workOrderId, type },
      })
      return count > 0
    }

    async update(
      id: string,
      data: UpdateAssetCheckpointData
    ): Promise<AssetCheckpointRecord> {
      return this.prisma.assetCheckpoint.update({
        where: { id },
        data: {
          ...(data.mileage !== undefined ? { mileage: data.mileage } : {}),
          ...(data.fuelLevel !== undefined
            ? { fuelLevel: data.fuelLevel }
            : {}),
          ...(data.generalCondition !== undefined
            ? { generalCondition: data.generalCondition }
            : {}),
          ...(data.note !== undefined ? { note: data.note } : {}),
          ...(data.photo !== undefined ? { photo: data.photo } : {}),
          ...(data.customerSignatureUrl !== undefined
            ? { customerSignatureUrl: data.customerSignatureUrl }
            : {}),
        },
      })
    }

    async delete(id: string): Promise<void> {
      await this.prisma.assetCheckpoint.delete({ where: { id } })
    }
  }
  ```

  > **Note:** `this.prisma.assetCheckpoint` will produce a TypeScript error until the Prisma schema has an `AssetCheckpoint` model. If the model doesn't exist yet, add it to `packages/database/prisma/schema.prisma` and run `npx prisma generate` first. The schema fields must match `AssetCheckpointRecord` exactly.

- [ ] **Step 2: Verify TypeScript compiles**

  ```bash
  cd apps/api && npx tsc --noEmit
  ```

  Expected: no errors (assumes `AssetCheckpoint` model exists in Prisma schema).

- [ ] **Step 3: Commit**

  ```bash
  git add apps/api/src/asset-checkpoints/infrastructure/prisma-asset-checkpoint.repository.ts
  ```

  Commit message: `✨ feat(asset-checkpoints): add PrismaAssetCheckpointRepository`

---

### Task 7: Controller, module, barrel, AppModule registration

Wires the controller, module, and registers everything in `AppModule`.

**Files:**

- Create: `apps/api/src/asset-checkpoints/asset-checkpoints.controller.ts`
- Create: `apps/api/src/asset-checkpoints/asset-checkpoints.module.ts`
- Create: `apps/api/src/asset-checkpoints/index.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Create `asset-checkpoints.controller.ts`**

  All endpoints are nested under `work-orders/:workOrderId/checkpoints`. POST and both GETs are open to all authenticated roles. PATCH and DELETE require `OWNER` or `MANAGER`.

  ```typescript
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
  import { Role } from '@glossops/database'

  import type { AuthContext } from '@auth/interfaces'
  import { CurrentAccount, Roles } from '@auth/decorators'

  import { UpdateAssetCheckpointDto } from './dto/update-asset-checkpoint.dto'
  import { CreateAssetCheckpointDto } from './dto/create-asset-checkpoint.dto'
  import { AssetCheckpointsService } from './asset-checkpoints.service'

  @Controller('work-orders/:workOrderId/checkpoints')
  export class AssetCheckpointsController {
    constructor(private readonly service: AssetCheckpointsService) {}

    @Post()
    create(
      @Param('workOrderId') workOrderId: string,
      @Body() dto: CreateAssetCheckpointDto,
      @CurrentAccount() account: AuthContext
    ) {
      return this.service.create(
        workOrderId,
        dto,
        account.sub,
        account.organizationId!
      )
    }

    @Get()
    findAll(
      @Param('workOrderId') workOrderId: string,
      @CurrentAccount() account: AuthContext
    ) {
      return this.service.findAll(workOrderId, account.organizationId!)
    }

    @Get(':id')
    findOne(
      @Param('workOrderId') workOrderId: string,
      @Param('id') id: string,
      @CurrentAccount() account: AuthContext
    ) {
      return this.service.findOne(workOrderId, id, account.organizationId!)
    }

    @Patch(':id')
    @Roles(Role.OWNER, Role.MANAGER)
    update(
      @Param('workOrderId') workOrderId: string,
      @Param('id') id: string,
      @Body() dto: UpdateAssetCheckpointDto,
      @CurrentAccount() account: AuthContext
    ) {
      return this.service.update(workOrderId, id, dto, account.organizationId!)
    }

    @Delete(':id')
    @HttpCode(204)
    @Roles(Role.OWNER, Role.MANAGER)
    remove(
      @Param('workOrderId') workOrderId: string,
      @Param('id') id: string,
      @CurrentAccount() account: AuthContext
    ) {
      return this.service.remove(workOrderId, id, account.organizationId!)
    }
  }
  ```

- [ ] **Step 2: Create `asset-checkpoints.module.ts`**

  ```typescript
  import { Module } from '@nestjs/common'

  import { PrismaModule } from '@prisma'
  import { WorkOrdersModule } from '@work-orders'

  import { PrismaAssetCheckpointRepository } from './infrastructure/prisma-asset-checkpoint.repository'
  import { ASSET_CHECKPOINT_REPOSITORY } from './asset-checkpoints.tokens'
  import { AssetCheckpointsController } from './asset-checkpoints.controller'
  import { AssetCheckpointsService } from './asset-checkpoints.service'

  @Module({
    imports: [PrismaModule, WorkOrdersModule],
    controllers: [AssetCheckpointsController],
    providers: [
      {
        provide: ASSET_CHECKPOINT_REPOSITORY,
        useClass: PrismaAssetCheckpointRepository,
      },
      AssetCheckpointsService,
    ],
  })
  export class AssetCheckpointsModule {}
  ```

- [ ] **Step 3: Create `index.ts` barrel**

  ```typescript
  export { AssetCheckpointsModule } from './asset-checkpoints.module'
  export { AssetCheckpointsService } from './asset-checkpoints.service'
  export type { AssetCheckpointRecord } from './interfaces'
  ```

- [ ] **Step 4: Register `AssetCheckpointsModule` in `AppModule`**

  In `apps/api/src/app.module.ts`, add the import and register the module after `WorkOrdersModule`:

  ```typescript
  import { AssetCheckpointsModule } from './asset-checkpoints/asset-checkpoints.module'
  ```

  Add `AssetCheckpointsModule` to the `imports` array after `WorkOrdersModule`:

  ```typescript
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    OrganizationsModule,
    CustomersModule,
    BranchesModule,
    CustomerAssetsModule,
    ServicesModule,
    SuppliersModule,
    BrandsModule,
    WorkOrdersModule,
    AssetCheckpointsModule,   // ← add here
    InventoryModule,
    PurchaseOrdersModule,
  ],
  ```

- [ ] **Step 5: Run full test suite**

  ```bash
  cd apps/api && npm test
  ```

  Expected: all tests pass including the new `asset-checkpoints.service.spec.ts`.

- [ ] **Step 6: Commit**

  ```bash
  git add apps/api/src/asset-checkpoints/ apps/api/src/app.module.ts
  ```

  Commit message: `✨ feat(asset-checkpoints): wire AssetCheckpointsModule and register in AppModule`

---

## Self-Review

**Spec coverage check:**

| Spec requirement                                                 | Task                                        |
| ---------------------------------------------------------------- | ------------------------------------------- |
| 5 endpoints nested under `/work-orders/:workOrderId/checkpoints` | Task 7                                      |
| POST / GET open to ALL roles                                     | Task 7 (no `@Roles` on those methods)       |
| PATCH / DELETE restricted to OWNER, MANAGER                      | Task 7 (`@Roles(Role.OWNER, Role.MANAGER)`) |
| POST: 409 if WO CANCELLED                                        | Task 5                                      |
| POST: 409 if RECEPTION on COMPLETED WO                           | Task 5                                      |
| POST: 409 if `(workOrderId, type)` already exists                | Task 5                                      |
| PATCH/DELETE: 404 if checkpoint not found or wrong WO            | Task 5                                      |
| `recordedById` set from `account.sub`                            | Task 7 (controller passes `account.sub`)    |
| `WorkOrdersModule` must export `WorkOrdersService`               | Task 1                                      |
| Path aliases added to tsconfig + jest                            | Task 1                                      |
| In-memory repo for tests                                         | Task 4                                      |
| Prisma repo for production                                       | Task 6                                      |
| `AppModule` registration after `WorkOrdersModule`                | Task 7                                      |

**Type consistency:** `AssetCheckpointRecord` defined in Task 2, used as return type throughout Tasks 4-7. `CreateAssetCheckpointData.recordedById` (Task 2) is populated in service `create` from `accountId` parameter (Task 5), which the controller sources from `account.sub` (Task 7). ✓

**No placeholders found.** All steps contain actual code.
