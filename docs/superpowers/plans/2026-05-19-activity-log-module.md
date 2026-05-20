# Activity Log Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the ActivityLog NestJS module (repository, service, read API) and integrate it into WorkOrders as the reference consumer that writes logs on create, transition, and remove.

**Architecture:** Repository pattern — one repository, one service, one controller. `ActivityLogsModule` imports only `PrismaModule` and exports `ActivityLogsService`. `WorkOrdersModule` imports `ActivityLogsModule` to call `ActivityLogsService.record()` after mutations.

**Tech Stack:** NestJS, TypeScript, Prisma ORM, PostgreSQL, class-validator, Jest

---

## File Map

**New files:**

| File                                                                             | Responsibility                   |
| -------------------------------------------------------------------------------- | -------------------------------- |
| `apps/api/src/activity-logs/activity-logs.tokens.ts`                             | DI injection token               |
| `apps/api/src/activity-logs/interfaces/activity-log.repository.interface.ts`     | Contract + shared types          |
| `apps/api/src/activity-logs/interfaces/index.ts`                                 | Barrel (types only)              |
| `apps/api/src/activity-logs/dto/list-activity-logs.dto.ts`                       | Query DTO for GET /activity-logs |
| `apps/api/src/activity-logs/dto/index.ts`                                        | Barrel                           |
| `apps/api/src/activity-logs/infrastructure/in-memory-activity-log.repository.ts` | In-memory impl for tests         |
| `apps/api/src/activity-logs/infrastructure/prisma-activity-log.repository.ts`    | Prisma impl                      |
| `apps/api/src/activity-logs/activity-logs.service.ts`                            | Business logic                   |
| `apps/api/src/activity-logs/activity-logs.service.spec.ts`                       | Unit tests                       |
| `apps/api/src/activity-logs/activity-logs.controller.ts`                         | GET /activity-logs               |
| `apps/api/src/activity-logs/activity-logs.controller.spec.ts`                    | Controller unit tests            |
| `apps/api/src/activity-logs/activity-logs.module.ts`                             | NestJS module                    |
| `apps/api/src/activity-logs/index.ts`                                            | Barrel                           |

**Modified files:**

| File                                                   | Change                                                                                                   |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `apps/api/tsconfig.paths.json`                         | Add `@activity-logs`, `@activity-logs/dto`, `@activity-logs/interfaces`                                  |
| `apps/api/package.json`                                | Add same 3 entries to jest `moduleNameMapper`                                                            |
| `apps/api/src/work-orders/work-orders.service.ts`      | Inject `ActivityLogsService`, add `accountId` param to `create`, `transition`, `remove`, call `record()` |
| `apps/api/src/work-orders/work-orders.controller.ts`   | Pass `account.sub` to `create`, `transition`, `remove`                                                   |
| `apps/api/src/work-orders/work-orders.module.ts`       | Import `ActivityLogsModule`                                                                              |
| `apps/api/src/work-orders/work-orders.service.spec.ts` | Add `ActivityLogsService` mock, update call sites, add 3 new integration tests                           |
| `apps/api/src/app.module.ts`                           | Import `ActivityLogsModule` after `WorkOrdersModule`                                                     |

---

## Task 1: Path aliases

**Files:**

- Modify: `apps/api/tsconfig.paths.json`
- Modify: `apps/api/package.json`

- [ ] **Step 1: Add path aliases to tsconfig.paths.json**

Add after the `@asset-checkpoints/interfaces` block (the last entry):

```json
"@activity-logs": ["./src/activity-logs/index.ts"],
"@activity-logs/dto": ["./src/activity-logs/dto/index.ts"],
"@activity-logs/interfaces": [
  "./src/activity-logs/interfaces/index.ts"
]
```

- [ ] **Step 2: Add moduleNameMapper entries to package.json**

In `apps/api/package.json`, under `"jest" > "moduleNameMapper"`, add after the `@asset-checkpoints/interfaces` entry:

```json
"^@activity-logs$": "<rootDir>/activity-logs/index.ts",
"^@activity-logs/dto$": "<rootDir>/activity-logs/dto/index.ts",
"^@activity-logs/interfaces$": "<rootDir>/activity-logs/interfaces/index.ts"
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/tsconfig.paths.json apps/api/package.json
git commit -F /tmp/commit_msg.txt  # use commit skill for message
```

---

## Task 2: DI token + repository interface

**Files:**

- Create: `apps/api/src/activity-logs/activity-logs.tokens.ts`
- Create: `apps/api/src/activity-logs/interfaces/activity-log.repository.interface.ts`
- Create: `apps/api/src/activity-logs/interfaces/index.ts`

- [ ] **Step 1: Create the DI token**

```typescript
// apps/api/src/activity-logs/activity-logs.tokens.ts
export const ACTIVITY_LOG_REPOSITORY = Symbol('ActivityLogRepositoryInterface')
```

- [ ] **Step 2: Create the repository interface file**

```typescript
// apps/api/src/activity-logs/interfaces/activity-log.repository.interface.ts
import type { ActivityAction } from '@glossops/database'

export interface ActivityLogRecord {
  id: string
  organizationId: string
  branchId: string | null
  accountId: string | null
  action: ActivityAction
  entity: string
  entityId: string
  metadata: Record<string, unknown> | null
  createdAt: Date
}

export interface CreateActivityLogData {
  organizationId: string
  branchId?: string
  accountId?: string
  action: ActivityAction
  entity: string
  entityId: string
  metadata?: Record<string, unknown>
}

export interface ActivityLogQuery {
  entity?: string
  entityId?: string
  action?: ActivityAction
  page: number
  limit: number
}

export interface ActivityLogPage {
  data: ActivityLogRecord[]
  total: number
  page: number
  limit: number
}

export interface ActivityLogRepositoryInterface {
  create(data: CreateActivityLogData): Promise<ActivityLogRecord>
  findAll(
    organizationId: string,
    query: ActivityLogQuery
  ): Promise<ActivityLogPage>
}
```

- [ ] **Step 3: Create the interfaces barrel**

```typescript
// apps/api/src/activity-logs/interfaces/index.ts
export type { ActivityLogRepositoryInterface } from './activity-log.repository.interface'
export type { CreateActivityLogData } from './activity-log.repository.interface'
export type { ActivityLogRecord } from './activity-log.repository.interface'
export type { ActivityLogQuery } from './activity-log.repository.interface'
export type { ActivityLogPage } from './activity-log.repository.interface'
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/activity-logs/
git commit -F /tmp/commit_msg.txt
```

---

## Task 3: DTO

**Files:**

- Create: `apps/api/src/activity-logs/dto/list-activity-logs.dto.ts`
- Create: `apps/api/src/activity-logs/dto/index.ts`

- [ ] **Step 1: Create ListActivityLogsDto**

```typescript
// apps/api/src/activity-logs/dto/list-activity-logs.dto.ts
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator'
import { Type } from 'class-transformer'

import { ActivityAction } from '@glossops/database'

export class ListActivityLogsDto {
  @IsOptional()
  @IsString()
  entity?: string

  @IsOptional()
  @IsUUID()
  entityId?: string

  @IsOptional()
  @IsEnum(ActivityAction)
  action?: ActivityAction

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number
}
```

- [ ] **Step 2: Create the DTO barrel**

```typescript
// apps/api/src/activity-logs/dto/index.ts
export { ListActivityLogsDto } from './list-activity-logs.dto'
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/activity-logs/dto/
git commit -F /tmp/commit_msg.txt
```

---

## Task 4: In-memory repository

**Files:**

- Create: `apps/api/src/activity-logs/infrastructure/in-memory-activity-log.repository.ts`

No test file for this task — the in-memory repo is exercised via the service spec in Task 5.

- [ ] **Step 1: Create the in-memory repository**

```typescript
// apps/api/src/activity-logs/infrastructure/in-memory-activity-log.repository.ts
import { randomUUID } from 'crypto'

import { Injectable } from '@nestjs/common'

import type {
  ActivityLogRepositoryInterface,
  ActivityLogRecord,
  ActivityLogPage,
  ActivityLogQuery,
  CreateActivityLogData,
} from '@activity-logs/interfaces'

@Injectable()
export class InMemoryActivityLogRepository implements ActivityLogRepositoryInterface {
  readonly store = new Map<string, ActivityLogRecord>()

  create(data: CreateActivityLogData): Promise<ActivityLogRecord> {
    const record: ActivityLogRecord = {
      id: randomUUID(),
      organizationId: data.organizationId,
      branchId: data.branchId ?? null,
      accountId: data.accountId ?? null,
      action: data.action,
      entity: data.entity,
      entityId: data.entityId,
      metadata: data.metadata ?? null,
      createdAt: new Date(),
    }
    this.store.set(record.id, record)
    return Promise.resolve(record)
  }

  findAll(
    organizationId: string,
    query: ActivityLogQuery
  ): Promise<ActivityLogPage> {
    let results = Array.from(this.store.values()).filter(
      r => r.organizationId === organizationId
    )
    if (query.entity !== undefined) {
      results = results.filter(r => r.entity === query.entity)
    }
    if (query.entityId !== undefined) {
      results = results.filter(r => r.entityId === query.entityId)
    }
    if (query.action !== undefined) {
      results = results.filter(r => r.action === query.action)
    }
    const total = results.length
    const { page, limit } = query
    const data = results.slice((page - 1) * limit, page * limit)
    return Promise.resolve({ data, total, page, limit })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/activity-logs/infrastructure/in-memory-activity-log.repository.ts
git commit -F /tmp/commit_msg.txt
```

---

## Task 5: ActivityLogsService — TDD

**Files:**

- Create: `apps/api/src/activity-logs/activity-logs.service.spec.ts`
- Create: `apps/api/src/activity-logs/activity-logs.service.ts`

- [ ] **Step 1: Write the failing spec**

```typescript
// apps/api/src/activity-logs/activity-logs.service.spec.ts
import { Test } from '@nestjs/testing'

import { ActivityAction } from '@glossops/database'

import { InMemoryActivityLogRepository } from './infrastructure/in-memory-activity-log.repository'
import { ActivityLogsService } from './activity-logs.service'
import { ACTIVITY_LOG_REPOSITORY } from './activity-logs.tokens'

const ORG = 'org-1'
const BRANCH = 'branch-1'
const ACCOUNT = 'acc-1'

describe('ActivityLogsService', () => {
  let service: ActivityLogsService
  let repo: InMemoryActivityLogRepository

  beforeEach(async () => {
    repo = new InMemoryActivityLogRepository()
    const module = await Test.createTestingModule({
      providers: [
        ActivityLogsService,
        { provide: ACTIVITY_LOG_REPOSITORY, useValue: repo },
      ],
    }).compile()
    service = module.get(ActivityLogsService)
  })

  describe('record', () => {
    it('creates a log entry and resolves void', async () => {
      await expect(
        service.record({
          organizationId: ORG,
          branchId: BRANCH,
          accountId: ACCOUNT,
          action: ActivityAction.CREATED,
          entity: 'WorkOrder',
          entityId: 'wo-1',
        })
      ).resolves.toBeUndefined()
      expect(repo.store.size).toBe(1)
    })

    it('persists all fields including metadata', async () => {
      await service.record({
        organizationId: ORG,
        action: ActivityAction.STATUS_CHANGED,
        entity: 'WorkOrder',
        entityId: 'wo-1',
        metadata: { from: 'DRAFT', to: 'CONFIRMED' },
      })
      const [entry] = Array.from(repo.store.values())
      expect(entry.action).toBe(ActivityAction.STATUS_CHANGED)
      expect(entry.metadata).toEqual({ from: 'DRAFT', to: 'CONFIRMED' })
    })
  })

  describe('findAll', () => {
    beforeEach(async () => {
      await service.record({
        organizationId: ORG,
        action: ActivityAction.CREATED,
        entity: 'WorkOrder',
        entityId: 'wo-1',
      })
      await service.record({
        organizationId: ORG,
        action: ActivityAction.STATUS_CHANGED,
        entity: 'WorkOrder',
        entityId: 'wo-1',
        metadata: { from: 'DRAFT', to: 'CONFIRMED' },
      })
      await service.record({
        organizationId: ORG,
        action: ActivityAction.DELETED,
        entity: 'Customer',
        entityId: 'cust-1',
      })
    })

    it('returns all logs for org with default pagination', async () => {
      const page = await service.findAll(ORG, {})
      expect(page.data).toHaveLength(3)
      expect(page.total).toBe(3)
      expect(page.page).toBe(1)
      expect(page.limit).toBe(20)
    })

    it('does not return logs from other orgs', async () => {
      await service.record({
        organizationId: 'org-other',
        action: ActivityAction.CREATED,
        entity: 'WorkOrder',
        entityId: 'wo-x',
      })
      const page = await service.findAll(ORG, {})
      expect(page.data).toHaveLength(3)
    })

    it('filters by entity', async () => {
      const page = await service.findAll(ORG, { entity: 'Customer' })
      expect(page.data).toHaveLength(1)
      expect(page.data[0].entity).toBe('Customer')
    })

    it('filters by entityId', async () => {
      const page = await service.findAll(ORG, { entityId: 'wo-1' })
      expect(page.data).toHaveLength(2)
      expect(page.data.every(r => r.entityId === 'wo-1')).toBe(true)
    })

    it('filters by action', async () => {
      const page = await service.findAll(ORG, {
        action: ActivityAction.STATUS_CHANGED,
      })
      expect(page.data).toHaveLength(1)
      expect(page.data[0].action).toBe(ActivityAction.STATUS_CHANGED)
    })

    it('paginates results', async () => {
      const page = await service.findAll(ORG, { page: 1, limit: 2 })
      expect(page.data).toHaveLength(2)
      expect(page.total).toBe(3)
      expect(page.page).toBe(1)
      expect(page.limit).toBe(2)

      const page2 = await service.findAll(ORG, { page: 2, limit: 2 })
      expect(page2.data).toHaveLength(1)
    })
  })
})
```

- [ ] **Step 2: Run spec — verify it fails**

```bash
cd apps/api && npx jest activity-logs.service --no-coverage
```

Expected: FAIL — `ActivityLogsService` not found.

- [ ] **Step 3: Implement ActivityLogsService**

```typescript
// apps/api/src/activity-logs/activity-logs.service.ts
import { Injectable, Inject } from '@nestjs/common'

import type {
  ActivityLogRepositoryInterface,
  ActivityLogPage,
  CreateActivityLogData,
} from './interfaces'
import type { ListActivityLogsDto } from './dto'
import { ACTIVITY_LOG_REPOSITORY } from './activity-logs.tokens'

@Injectable()
export class ActivityLogsService {
  constructor(
    @Inject(ACTIVITY_LOG_REPOSITORY)
    private readonly repo: ActivityLogRepositoryInterface
  ) {}

  async record(data: CreateActivityLogData): Promise<void> {
    await this.repo.create(data)
  }

  findAll(
    organizationId: string,
    dto: ListActivityLogsDto
  ): Promise<ActivityLogPage> {
    return this.repo.findAll(organizationId, {
      entity: dto.entity,
      entityId: dto.entityId,
      action: dto.action,
      page: dto.page ?? 1,
      limit: dto.limit ?? 20,
    })
  }
}
```

- [ ] **Step 4: Run spec — verify it passes**

```bash
cd apps/api && npx jest activity-logs.service --no-coverage
```

Expected: PASS — 8 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/activity-logs/activity-logs.service.ts \
        apps/api/src/activity-logs/activity-logs.service.spec.ts
git commit -F /tmp/commit_msg.txt
```

---

## Task 6: Prisma repository

**Files:**

- Create: `apps/api/src/activity-logs/infrastructure/prisma-activity-log.repository.ts`

The `ActivityLog` model name in Prisma client is `activityLog` (camelCase of `ActivityLog`). The `metadata` column is `Json?` — cast the return value with `as Record<string, unknown> | null`.

- [ ] **Step 1: Create the Prisma repository**

```typescript
// apps/api/src/activity-logs/infrastructure/prisma-activity-log.repository.ts
import { Injectable } from '@nestjs/common'

import { PrismaService } from '@prisma'
import type {
  ActivityLogRepositoryInterface,
  ActivityLogRecord,
  ActivityLogPage,
  ActivityLogQuery,
  CreateActivityLogData,
} from '@activity-logs/interfaces'

type PrismaActivityLogRow = Awaited<
  ReturnType<PrismaService['activityLog']['findUniqueOrThrow']>
>

@Injectable()
export class PrismaActivityLogRepository implements ActivityLogRepositoryInterface {
  constructor(private readonly prisma: PrismaService) {}

  private toRecord(row: PrismaActivityLogRow): ActivityLogRecord {
    return {
      id: row.id,
      organizationId: row.organizationId,
      branchId: row.branchId,
      accountId: row.accountId,
      action: row.action,
      entity: row.entity,
      entityId: row.entityId,
      metadata: row.metadata as Record<string, unknown> | null,
      createdAt: row.createdAt,
    }
  }

  async create(data: CreateActivityLogData): Promise<ActivityLogRecord> {
    const row = await this.prisma.activityLog.create({
      data: {
        organizationId: data.organizationId,
        branchId: data.branchId ?? null,
        accountId: data.accountId ?? null,
        action: data.action,
        entity: data.entity,
        entityId: data.entityId,
        metadata: data.metadata ?? undefined,
      },
    })
    return this.toRecord(row)
  }

  async findAll(
    organizationId: string,
    query: ActivityLogQuery
  ): Promise<ActivityLogPage> {
    const where = {
      organizationId,
      ...(query.entity !== undefined ? { entity: query.entity } : {}),
      ...(query.entityId !== undefined ? { entityId: query.entityId } : {}),
      ...(query.action !== undefined ? { action: query.action } : {}),
    }
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.activityLog.count({ where }),
    ])
    return {
      data: rows.map(r => this.toRecord(r)),
      total,
      page: query.page,
      limit: query.limit,
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/activity-logs/infrastructure/prisma-activity-log.repository.ts
git commit -F /tmp/commit_msg.txt
```

---

## Task 7: Controller, module, barrel, AppModule

**Files:**

- Create: `apps/api/src/activity-logs/activity-logs.controller.spec.ts`
- Create: `apps/api/src/activity-logs/activity-logs.controller.ts`
- Create: `apps/api/src/activity-logs/activity-logs.module.ts`
- Create: `apps/api/src/activity-logs/index.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Write the failing controller spec**

```typescript
// apps/api/src/activity-logs/activity-logs.controller.spec.ts
import { Test } from '@nestjs/testing'

import { Role } from '@glossops/database'

import type { AuthContext } from '@auth/interfaces'

import { ActivityLogsController } from './activity-logs.controller'
import { ActivityLogsService } from './activity-logs.service'

const makeAccount = (role: Role): AuthContext => ({
  sub: 'acc-1',
  memberId: 'mem-1',
  email: 'test@test.com',
  branchId: 'branch-1',
  organizationId: 'org-1',
  role,
})

const OWNER = makeAccount(Role.OWNER)

describe('ActivityLogsController', () => {
  let controller: ActivityLogsController
  let service: { findAll: jest.Mock }

  beforeEach(async () => {
    service = {
      findAll: jest
        .fn()
        .mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 }),
    }
    const module = await Test.createTestingModule({
      controllers: [ActivityLogsController],
      providers: [{ provide: ActivityLogsService, useValue: service }],
    }).compile()
    controller = module.get(ActivityLogsController)
  })

  describe('findAll', () => {
    it('calls service.findAll with organizationId and dto', async () => {
      const dto = { entity: 'WorkOrder' }
      await controller.findAll(OWNER, dto as never)
      expect(service.findAll).toHaveBeenCalledWith('org-1', dto)
    })
  })
})
```

- [ ] **Step 2: Run spec — verify it fails**

```bash
cd apps/api && npx jest activity-logs.controller --no-coverage
```

Expected: FAIL — `ActivityLogsController` not found.

- [ ] **Step 3: Implement the controller**

```typescript
// apps/api/src/activity-logs/activity-logs.controller.ts
import { Controller, Get, Query } from '@nestjs/common'

import { CurrentAccount } from '@auth/decorators'
import type { AuthContext } from '@auth/interfaces'

import { ListActivityLogsDto } from './dto'
import { ActivityLogsService } from './activity-logs.service'

@Controller('activity-logs')
export class ActivityLogsController {
  constructor(private readonly service: ActivityLogsService) {}

  @Get()
  findAll(
    @CurrentAccount() account: AuthContext,
    @Query() dto: ListActivityLogsDto
  ) {
    return this.service.findAll(account.organizationId!, dto)
  }
}
```

- [ ] **Step 4: Run spec — verify it passes**

```bash
cd apps/api && npx jest activity-logs.controller --no-coverage
```

Expected: PASS — 1 test.

- [ ] **Step 5: Create the module**

```typescript
// apps/api/src/activity-logs/activity-logs.module.ts
import { Module } from '@nestjs/common'

import { PrismaModule } from '@prisma'

import { PrismaActivityLogRepository } from './infrastructure/prisma-activity-log.repository'
import { ACTIVITY_LOG_REPOSITORY } from './activity-logs.tokens'
import { ActivityLogsController } from './activity-logs.controller'
import { ActivityLogsService } from './activity-logs.service'

@Module({
  imports: [PrismaModule],
  controllers: [ActivityLogsController],
  providers: [
    {
      provide: ACTIVITY_LOG_REPOSITORY,
      useClass: PrismaActivityLogRepository,
    },
    ActivityLogsService,
  ],
  exports: [ActivityLogsService],
})
export class ActivityLogsModule {}
```

- [ ] **Step 6: Create the module barrel**

```typescript
// apps/api/src/activity-logs/index.ts
export { ActivityLogsService } from './activity-logs.service'
export { ActivityLogsModule } from './activity-logs.module'
export type { ActivityLogRecord } from './interfaces'
```

- [ ] **Step 7: Register ActivityLogsModule in AppModule**

In `apps/api/src/app.module.ts`, add the import:

```typescript
import { ActivityLogsModule } from './activity-logs/activity-logs.module'
```

Add `ActivityLogsModule` to the `imports` array, after `WorkOrdersModule` and before `AssetCheckpointsModule`:

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
  ActivityLogsModule,       // ← add here
  AssetCheckpointsModule,
  InventoryModule,
  PurchaseOrdersModule,
],
```

- [ ] **Step 8: Run all activity-logs tests**

```bash
cd apps/api && npx jest activity-logs --no-coverage
```

Expected: PASS — 9 tests.

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/activity-logs/ apps/api/src/app.module.ts
git commit -F /tmp/commit_msg.txt
```

---

## Task 8: WorkOrders integration

**Files:**

- Modify: `apps/api/src/work-orders/work-orders.service.ts`
- Modify: `apps/api/src/work-orders/work-orders.controller.ts`
- Modify: `apps/api/src/work-orders/work-orders.module.ts`
- Modify: `apps/api/src/work-orders/work-orders.service.spec.ts`

**Context:** Three `WorkOrdersService` methods need `accountId` added as a new required parameter so they can write activity logs. The spec uses method name `changeStatus` but the actual implementation uses `transition` — this plan uses `transition` throughout.

- [ ] **Step 1: Add ActivityLogsService mock to the spec and update call sites**

The current `work-orders.service.spec.ts` calls `service.create`, `service.transition`, and `service.remove` without an `accountId` argument. After this step those calls will pass `ACCOUNT` as the last argument.

Replace the full content of `apps/api/src/work-orders/work-orders.service.spec.ts` with:

```typescript
import { ConflictException, NotFoundException } from '@nestjs/common'
import { Test } from '@nestjs/testing'

import {
  ActivityAction,
  WorkOrderStatus,
  WorkOrderType,
} from '@glossops/database'

import { ActivityLogsService } from '../activity-logs/activity-logs.service'
import { InventoryService } from '../inventory/inventory.service'

import { InMemoryWorkOrderItemRepository } from './infrastructure/in-memory-work-order-item.repository'
import { InMemoryWorkOrderRepository } from './infrastructure/in-memory-work-order.repository'
import { WorkOrdersService } from './work-orders.service'
import {
  WORK_ORDER_ITEM_REPOSITORY,
  WORK_ORDER_REPOSITORY,
} from './work-orders.tokens'

const ORG = 'org-1'
const BRANCH = 'branch-1'
const ASSET = 'asset-1'
const SERVICE = 'service-1'
const ACCOUNT = 'acc-1'

describe('WorkOrdersService', () => {
  let service: WorkOrdersService
  let woRepo: InMemoryWorkOrderRepository
  let itemRepo: InMemoryWorkOrderItemRepository
  let inventoryService: {
    maybeCreateUsage: jest.Mock
    commitUsages: jest.Mock
    deleteUsagesByWorkOrder: jest.Mock
  }
  let activityLogs: { record: jest.Mock }

  beforeEach(async () => {
    woRepo = new InMemoryWorkOrderRepository()
    itemRepo = new InMemoryWorkOrderItemRepository()
    woRepo.seedBranches([{ id: BRANCH, organizationId: ORG }])
    woRepo.setItemsGetter(id => itemRepo.findAllByWorkOrder(id))

    inventoryService = {
      maybeCreateUsage: jest.fn().mockResolvedValue(undefined),
      commitUsages: jest.fn().mockResolvedValue({ warnings: [] }),
      deleteUsagesByWorkOrder: jest.fn().mockResolvedValue(undefined),
    }

    activityLogs = {
      record: jest.fn().mockResolvedValue(undefined),
    }

    const module = await Test.createTestingModule({
      providers: [
        WorkOrdersService,
        { provide: WORK_ORDER_REPOSITORY, useValue: woRepo },
        { provide: WORK_ORDER_ITEM_REPOSITORY, useValue: itemRepo },
        { provide: InventoryService, useValue: inventoryService },
        { provide: ActivityLogsService, useValue: activityLogs },
      ],
    }).compile()

    service = module.get(WorkOrdersService)
  })

  describe('create', () => {
    it('creates a DRAFT work order with defaults', async () => {
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET }, ACCOUNT)
      expect(wo.status).toBe(WorkOrderStatus.DRAFT)
      expect(wo.type).toBe(WorkOrderType.STANDARD)
      expect(wo.branchId).toBe(BRANCH)
      expect(Number(wo.totalAmount)).toBe(0)
    })

    it('uses provided type and scheduledAt', async () => {
      const wo = await service.create(
        BRANCH,
        ORG,
        {
          assetId: ASSET,
          type: WorkOrderType.WARRANTY_CLAIM,
          scheduledAt: '2026-06-01T09:00:00Z',
        },
        ACCOUNT
      )
      expect(wo.type).toBe(WorkOrderType.WARRANTY_CLAIM)
      expect(wo.scheduledAt).not.toBeNull()
    })
  })

  describe('findAll', () => {
    it('returns paginated work orders for the organization', async () => {
      await service.create(BRANCH, ORG, { assetId: ASSET }, ACCOUNT)
      await service.create(BRANCH, ORG, { assetId: ASSET }, ACCOUNT)
      const page = await service.findAll(ORG, {})
      expect(page.data).toHaveLength(2)
      expect(page.meta.total).toBe(2)
      expect(page.meta.page).toBe(1)
      expect(page.meta.limit).toBe(20)
    })

    it('filters by status', async () => {
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET }, ACCOUNT)
      await service.create(BRANCH, ORG, { assetId: ASSET }, ACCOUNT)
      await woRepo.updateStatus(wo.id, ORG, WorkOrderStatus.CONFIRMED)
      const page = await service.findAll(ORG, {
        status: WorkOrderStatus.CONFIRMED,
      })
      expect(page.data).toHaveLength(1)
      expect(page.data[0].status).toBe(WorkOrderStatus.CONFIRMED)
    })

    it('does not return work orders from other orgs', async () => {
      woRepo.seedBranches([{ id: 'branch-other', organizationId: 'org-other' }])
      await service.create(
        'branch-other',
        'org-other',
        { assetId: ASSET },
        ACCOUNT
      )
      const page = await service.findAll(ORG, {})
      expect(page.data).toHaveLength(0)
    })
  })

  describe('findOne', () => {
    it('returns the work order with items', async () => {
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET }, ACCOUNT)
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
      const wo = await service.create(
        'branch-other',
        'org-other',
        {
          assetId: ASSET,
        },
        ACCOUNT
      )
      await expect(service.findOne(wo.id, ORG)).rejects.toThrow(
        NotFoundException
      )
    })
  })

  describe('update', () => {
    it('updates note', async () => {
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET }, ACCOUNT)
      const updated = await service.update(wo.id, ORG, { note: 'VIP customer' })
      expect(updated.note).toBe('VIP customer')
    })

    it('clears scheduledAt when passed null', async () => {
      const wo = await service.create(
        BRANCH,
        ORG,
        {
          assetId: ASSET,
          scheduledAt: '2026-06-01T09:00:00Z',
        },
        ACCOUNT
      )
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
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET }, ACCOUNT)
      const updated = await service.transition(
        wo.id,
        ORG,
        WorkOrderStatus.CONFIRMED,
        ACCOUNT
      )
      expect(updated.status).toBe(WorkOrderStatus.CONFIRMED)
    })

    it('transitions CONFIRMED → DRAFT (revert)', async () => {
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET }, ACCOUNT)
      await woRepo.updateStatus(wo.id, ORG, WorkOrderStatus.CONFIRMED)
      const reverted = await service.transition(
        wo.id,
        ORG,
        WorkOrderStatus.DRAFT,
        ACCOUNT
      )
      expect(reverted.status).toBe(WorkOrderStatus.DRAFT)
    })

    it('transitions IN_PROGRESS → COMPLETED and sets completedAt', async () => {
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET }, ACCOUNT)
      await woRepo.updateStatus(wo.id, ORG, WorkOrderStatus.CONFIRMED)
      await woRepo.updateStatus(wo.id, ORG, WorkOrderStatus.IN_PROGRESS)
      const completed = await service.transition(
        wo.id,
        ORG,
        WorkOrderStatus.COMPLETED,
        ACCOUNT
      )
      expect(completed.status).toBe(WorkOrderStatus.COMPLETED)
      expect(completed.completedAt).not.toBeNull()
    })

    it('throws ConflictException for invalid transition DRAFT → COMPLETED', async () => {
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET }, ACCOUNT)
      await expect(
        service.transition(wo.id, ORG, WorkOrderStatus.COMPLETED, ACCOUNT)
      ).rejects.toThrow(ConflictException)
    })

    it('throws ConflictException when COMPLETED is terminal', async () => {
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET }, ACCOUNT)
      await woRepo.updateStatus(wo.id, ORG, WorkOrderStatus.CONFIRMED)
      await woRepo.updateStatus(wo.id, ORG, WorkOrderStatus.IN_PROGRESS)
      await woRepo.updateStatus(wo.id, ORG, WorkOrderStatus.COMPLETED)
      await expect(
        service.transition(wo.id, ORG, WorkOrderStatus.CANCELLED, ACCOUNT)
      ).rejects.toThrow(ConflictException)
    })

    it('throws NotFoundException when not found', async () => {
      await expect(
        service.transition('unknown', ORG, WorkOrderStatus.CONFIRMED, ACCOUNT)
      ).rejects.toThrow(NotFoundException)
    })
  })

  describe('remove', () => {
    it('removes a DRAFT work order', async () => {
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET }, ACCOUNT)
      await expect(service.remove(wo.id, ORG, ACCOUNT)).resolves.toBeUndefined()
      await expect(service.findOne(wo.id, ORG)).rejects.toThrow(
        NotFoundException
      )
    })

    it('throws ConflictException when status is not DRAFT', async () => {
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET }, ACCOUNT)
      await woRepo.updateStatus(wo.id, ORG, WorkOrderStatus.CONFIRMED)
      await expect(service.remove(wo.id, ORG, ACCOUNT)).rejects.toThrow(
        ConflictException
      )
    })

    it('throws NotFoundException when not found', async () => {
      await expect(service.remove('unknown', ORG, ACCOUNT)).rejects.toThrow(
        NotFoundException
      )
    })
  })

  describe('addItem', () => {
    it('adds an item and updates totalAmount', async () => {
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET }, ACCOUNT)
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
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET }, ACCOUNT)
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
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET }, ACCOUNT)
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
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET }, ACCOUNT)
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
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET }, ACCOUNT)
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
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET }, ACCOUNT)
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
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET }, ACCOUNT)
      await expect(
        service.updateItem(wo.id, 'unknown-item', ORG, { quantity: 2 })
      ).rejects.toThrow(NotFoundException)
    })

    it('throws ConflictException when work order is not DRAFT', async () => {
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET }, ACCOUNT)
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
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET }, ACCOUNT)
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
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET }, ACCOUNT)
      await expect(
        service.removeItem(wo.id, 'unknown-item', ORG)
      ).rejects.toThrow(NotFoundException)
    })

    it('throws ConflictException when work order is not DRAFT', async () => {
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET }, ACCOUNT)
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

  describe('addItem — inventory integration', () => {
    it('calls inventoryService.maybeCreateUsage with workOrderId and serviceId', async () => {
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET }, ACCOUNT)
      await service.addItem(wo.id, ORG, {
        serviceId: SERVICE,
        unitPrice: 100,
        quantity: 1,
        discount: 0,
      })
      expect(inventoryService.maybeCreateUsage).toHaveBeenCalledWith(
        wo.id,
        SERVICE
      )
    })
  })

  describe('transition — inventory integration', () => {
    it('calls commitUsages when transitioning to COMPLETED', async () => {
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET }, ACCOUNT)
      await service.transition(wo.id, ORG, WorkOrderStatus.CONFIRMED, ACCOUNT)
      await service.transition(wo.id, ORG, WorkOrderStatus.IN_PROGRESS, ACCOUNT)
      await service.transition(wo.id, ORG, WorkOrderStatus.COMPLETED, ACCOUNT)
      expect(inventoryService.commitUsages).toHaveBeenCalledWith(wo.id)
    })

    it('calls deleteUsagesByWorkOrder when transitioning to CANCELLED', async () => {
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET }, ACCOUNT)
      await service.transition(wo.id, ORG, WorkOrderStatus.CANCELLED, ACCOUNT)
      expect(inventoryService.deleteUsagesByWorkOrder).toHaveBeenCalledWith(
        wo.id
      )
    })
  })

  describe('create — activity log', () => {
    it('calls activityLogs.record with CREATED action', async () => {
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET }, ACCOUNT)
      expect(activityLogs.record).toHaveBeenCalledWith({
        organizationId: ORG,
        branchId: BRANCH,
        accountId: ACCOUNT,
        action: ActivityAction.CREATED,
        entity: 'WorkOrder',
        entityId: wo.id,
      })
    })
  })

  describe('transition — activity log', () => {
    it('calls activityLogs.record with STATUS_CHANGED and correct metadata', async () => {
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET }, ACCOUNT)
      activityLogs.record.mockClear()
      await service.transition(wo.id, ORG, WorkOrderStatus.CONFIRMED, ACCOUNT)
      expect(activityLogs.record).toHaveBeenCalledWith({
        organizationId: ORG,
        branchId: BRANCH,
        accountId: ACCOUNT,
        action: ActivityAction.STATUS_CHANGED,
        entity: 'WorkOrder',
        entityId: wo.id,
        metadata: {
          from: WorkOrderStatus.DRAFT,
          to: WorkOrderStatus.CONFIRMED,
        },
      })
    })
  })

  describe('remove — activity log', () => {
    it('calls activityLogs.record with DELETED action', async () => {
      const wo = await service.create(BRANCH, ORG, { assetId: ASSET }, ACCOUNT)
      activityLogs.record.mockClear()
      await service.remove(wo.id, ORG, ACCOUNT)
      expect(activityLogs.record).toHaveBeenCalledWith({
        organizationId: ORG,
        branchId: BRANCH,
        accountId: ACCOUNT,
        action: ActivityAction.DELETED,
        entity: 'WorkOrder',
        entityId: wo.id,
      })
    })
  })
})
```

- [ ] **Step 2: Run spec — verify it fails (ActivityLogsService not in providers)**

```bash
cd apps/api && npx jest work-orders.service --no-coverage
```

Expected: FAIL — `ActivityLogsService` not injectable or method signature mismatch.

- [ ] **Step 3: Update WorkOrdersService**

Replace the full content of `apps/api/src/work-orders/work-orders.service.ts`:

```typescript
import {
  ConflictException,
  Injectable,
  Inject,
  NotFoundException,
} from '@nestjs/common'

import {
  ActivityAction,
  WorkOrderStatus,
  WorkOrderType,
  type Prisma,
} from '@glossops/database'

import type {
  WorkOrderRepositoryInterface,
  WorkOrderItemRepositoryInterface,
  WorkOrderWithItems,
  WorkOrderPage,
} from '@work-orders/interfaces'

import { ActivityLogsService } from '../activity-logs/activity-logs.service'
import { InventoryService } from '../inventory/inventory.service'
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
    private readonly workOrderItems: WorkOrderItemRepositoryInterface,
    private readonly inventoryService: InventoryService,
    private readonly activityLogs: ActivityLogsService
  ) {}

  async create(
    branchId: string,
    organizationId: string,
    dto: CreateWorkOrderDto,
    accountId: string
  ): Promise<Prisma.WorkOrderModel> {
    const wo = await this.workOrders.create({
      branchId,
      assetId: dto.assetId,
      type: dto.type ?? WorkOrderType.STANDARD,
      warrantyClaimId: dto.warrantyClaimId,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      note: dto.note,
    })
    await this.activityLogs.record({
      organizationId,
      branchId,
      accountId,
      action: ActivityAction.CREATED,
      entity: 'WorkOrder',
      entityId: wo.id,
    })
    return wo
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
    newStatus: WorkOrderStatus,
    accountId: string
  ): Promise<Prisma.WorkOrderModel> {
    const wo = await this.findOne(id, organizationId)
    const prevStatus = wo.status
    if (!VALID_TRANSITIONS[wo.status].includes(newStatus)) {
      throw new ConflictException({ error: 'invalid_status_transition' })
    }
    const completedAt =
      newStatus === WorkOrderStatus.COMPLETED ? new Date() : undefined
    const updated = await this.workOrders.updateStatus(
      id,
      organizationId,
      newStatus,
      completedAt
    )
    if (newStatus === WorkOrderStatus.COMPLETED) {
      await this.inventoryService.commitUsages(id)
    } else if (newStatus === WorkOrderStatus.CANCELLED) {
      await this.inventoryService.deleteUsagesByWorkOrder(id)
    }
    await this.activityLogs.record({
      organizationId,
      branchId: wo.branchId,
      accountId,
      action: ActivityAction.STATUS_CHANGED,
      entity: 'WorkOrder',
      entityId: id,
      metadata: { from: prevStatus, to: newStatus },
    })
    return updated
  }

  async remove(
    id: string,
    organizationId: string,
    accountId: string
  ): Promise<void> {
    const wo = await this.findOne(id, organizationId)
    if (wo.status !== WorkOrderStatus.DRAFT) {
      throw new ConflictException({ error: 'work_order_not_deletable' })
    }
    await this.workOrders.delete(id, organizationId)
    await this.activityLogs.record({
      organizationId,
      branchId: wo.branchId,
      accountId,
      action: ActivityAction.DELETED,
      entity: 'WorkOrder',
      entityId: id,
    })
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
    await this.inventoryService.maybeCreateUsage(workOrderId, dto.serviceId)
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

- [ ] **Step 4: Run spec — verify it passes**

```bash
cd apps/api && npx jest work-orders.service --no-coverage
```

Expected: PASS — all existing tests + 3 new activity log tests.

- [ ] **Step 5: Update WorkOrdersController**

In `apps/api/src/work-orders/work-orders.controller.ts`, update the three methods to pass `account.sub`:

```typescript
@Post()
@HttpCode(201)
@Roles(Role.OWNER, Role.MANAGER, Role.FRONT_DESK)
@ApiOperation({ summary: 'Create a new work order' })
create(
  @CurrentAccount() account: AuthContext,
  @Body() dto: CreateWorkOrderDto
) {
  return this.service.create(
    account.branchId!,
    account.organizationId!,
    dto,
    account.sub
  )
}
```

```typescript
@Patch(':id/status')
@Roles(Role.OWNER, Role.MANAGER, Role.TECHNICIAN, Role.FRONT_DESK)
@ApiOperation({ summary: 'Transition work order status' })
transition(
  @CurrentAccount() account: AuthContext,
  @Param('id') id: string,
  @Body() dto: TransitionStatusDto
) {
  return this.service.transition(
    id,
    account.organizationId!,
    dto.status,
    account.sub
  )
}
```

```typescript
@Delete(':id')
@HttpCode(204)
@Roles(Role.OWNER, Role.MANAGER)
@ApiOperation({ summary: 'Delete a DRAFT work order' })
remove(@CurrentAccount() account: AuthContext, @Param('id') id: string) {
  return this.service.remove(id, account.organizationId!, account.sub)
}
```

- [ ] **Step 6: Update WorkOrdersModule**

In `apps/api/src/work-orders/work-orders.module.ts`, add `ActivityLogsModule` to imports:

```typescript
import { Module } from '@nestjs/common'

import { PrismaModule } from '@prisma'

import { ActivityLogsModule } from '../activity-logs/activity-logs.module'
import { InventoryModule } from '../inventory/inventory.module'
import { PrismaWorkOrderItemRepository } from './infrastructure/prisma-work-order-item.repository'
import { PrismaWorkOrderRepository } from './infrastructure/prisma-work-order.repository'
import { WorkOrderItemsController } from './work-order-items.controller'
import { WorkOrderUsagesController } from './work-order-usages.controller'
import { WorkOrdersController } from './work-orders.controller'
import {
  WORK_ORDER_ITEM_REPOSITORY,
  WORK_ORDER_REPOSITORY,
} from './work-orders.tokens'
import { WorkOrdersService } from './work-orders.service'

@Module({
  imports: [PrismaModule, InventoryModule, ActivityLogsModule],
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

- [ ] **Step 7: Run the full test suite**

```bash
cd apps/api && npx jest --no-coverage
```

Expected: PASS — all tests green.

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/work-orders/
git commit -F /tmp/commit_msg.txt
```
