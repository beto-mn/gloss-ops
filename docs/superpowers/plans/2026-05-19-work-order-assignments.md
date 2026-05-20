# WorkOrderAssignments Module — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `WorkOrderAssignmentsModule` — three endpoints (POST, GET, DELETE) nested under `/work-orders/:workOrderId/assignments` with RBAC, WO status validation, member-in-org validation, duplicate prevention, and activity logging on assignment.

**Architecture:** Repository pattern — DI token → interface → in-memory (tests) + Prisma (prod) → service → controller → module. `WorkOrderAssignmentsModule` imports `WorkOrdersModule` for WO ownership/status validation and `ActivityLogsModule` for audit logging. Prisma schema is updated first to add the `AssignmentRole` enum and retype the `role` field.

**Tech Stack:** NestJS, Prisma ORM, PostgreSQL, TypeScript, class-validator, Jest

---

## File Map

| Action        | Path                                                                                               |
| ------------- | -------------------------------------------------------------------------------------------------- |
| Modify        | `packages/database/prisma/schema.prisma`                                                           |
| Auto-generate | `packages/database/prisma/migrations/<ts>_add_assignment_role_enum/migration.sql`                  |
| Modify        | `apps/api/tsconfig.paths.json`                                                                     |
| Modify        | `apps/api/package.json` (jest `moduleNameMapper`)                                                  |
| Create        | `apps/api/src/work-order-assignments/work-order-assignments.tokens.ts`                             |
| Create        | `apps/api/src/work-order-assignments/interfaces/work-order-assignment.repository.interface.ts`     |
| Create        | `apps/api/src/work-order-assignments/interfaces/index.ts`                                          |
| Create        | `apps/api/src/work-order-assignments/dto/create-work-order-assignment.dto.ts`                      |
| Create        | `apps/api/src/work-order-assignments/dto/index.ts`                                                 |
| Create        | `apps/api/src/work-order-assignments/infrastructure/in-memory-work-order-assignment.repository.ts` |
| Create        | `apps/api/src/work-order-assignments/work-order-assignments.service.spec.ts`                       |
| Create        | `apps/api/src/work-order-assignments/work-order-assignments.service.ts`                            |
| Create        | `apps/api/src/work-order-assignments/infrastructure/prisma-work-order-assignment.repository.ts`    |
| Create        | `apps/api/src/work-order-assignments/work-order-assignments.controller.ts`                         |
| Create        | `apps/api/src/work-order-assignments/work-order-assignments.module.ts`                             |
| Create        | `apps/api/src/work-order-assignments/index.ts`                                                     |
| Modify        | `apps/api/src/app.module.ts`                                                                       |

---

### Task 1: Schema migration — add `AssignmentRole` enum

**Files:**

- Modify: `packages/database/prisma/schema.prisma`
- Auto-generate: `packages/database/prisma/migrations/<ts>_add_assignment_role_enum/migration.sql`

- [ ] **Step 1: Add `AssignmentRole` enum to `schema.prisma`**

Open `packages/database/prisma/schema.prisma`. Find `enum ActivityAction {` and insert the following block **immediately after** its closing `}`:

```prisma
enum AssignmentRole {
  LEAD
  ASSISTANT
}
```

- [ ] **Step 2: Update `WorkOrderAssignment.role` field type**

In the same file, find the `WorkOrderAssignment` model. Change the `role` field from:

```prisma
  role        String   @default("assistant")
```

to:

```prisma
  role        AssignmentRole @default(ASSISTANT)
```

- [ ] **Step 3: Run the migration**

```bash
cd packages/database && pnpm exec prisma migrate dev --name add_assignment_role_enum
```

Expected output includes a new migration file at `prisma/migrations/<timestamp>_add_assignment_role_enum/migration.sql` and the line `Your database is now in sync with your schema.`

- [ ] **Step 4: Verify the generated SQL**

```bash
cat packages/database/prisma/migrations/$(ls packages/database/prisma/migrations | grep add_assignment_role_enum)/migration.sql
```

The file should contain a `CREATE TYPE "AssignmentRole" AS ENUM ('LEAD', 'ASSISTANT');` statement and an `ALTER TABLE "work_order_assignment"` statement that changes the `role` column type.

- [ ] **Step 5: Confirm the package builds**

```bash
pnpm --filter @glossops/database build
```

Expected: exits with code 0, no TypeScript errors.

- [ ] **Step 6: Commit**

Stage and commit using the `/commit` skill:

```bash
git add packages/database/prisma/schema.prisma packages/database/prisma/migrations/
```

---

### Task 2: Path aliases

**Files:**

- Modify: `apps/api/tsconfig.paths.json`
- Modify: `apps/api/package.json`

- [ ] **Step 1: Add entries to `apps/api/tsconfig.paths.json`**

At the end of the `"paths"` object (after the last `@activity-logs/interfaces` entry), add:

```json
"@work-order-assignments": ["./src/work-order-assignments/index.ts"],
"@work-order-assignments/dto": ["./src/work-order-assignments/dto/index.ts"],
"@work-order-assignments/interfaces": [
  "./src/work-order-assignments/interfaces/index.ts"
]
```

- [ ] **Step 2: Add entries to `apps/api/package.json` `moduleNameMapper`**

In `apps/api/package.json`, inside `"jest"."moduleNameMapper"`, add after the `"^@activity-logs/interfaces$"` entry (the current last entry):

```json
"^@work-order-assignments$": "<rootDir>/work-order-assignments/index.ts",
"^@work-order-assignments/dto$": "<rootDir>/work-order-assignments/dto/index.ts",
"^@work-order-assignments/interfaces$": "<rootDir>/work-order-assignments/interfaces/index.ts"
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/tsconfig.paths.json apps/api/package.json
```

Commit using the `/commit` skill.

---

### Task 3: DI token + repository interface

**Files:**

- Create: `apps/api/src/work-order-assignments/work-order-assignments.tokens.ts`
- Create: `apps/api/src/work-order-assignments/interfaces/work-order-assignment.repository.interface.ts`
- Create: `apps/api/src/work-order-assignments/interfaces/index.ts`

- [ ] **Step 1: Create `work-order-assignments.tokens.ts`**

```typescript
export const WORK_ORDER_ASSIGNMENT_REPOSITORY = Symbol(
  'WorkOrderAssignmentRepositoryInterface'
)
```

- [ ] **Step 2: Create `interfaces/work-order-assignment.repository.interface.ts`**

```typescript
import type { AssignmentRole } from '@glossops/database'

export interface WorkOrderAssignmentRecord {
  id: string
  workOrderId: string
  memberId: string
  role: AssignmentRole
  assignedAt: Date
}

export interface CreateWorkOrderAssignmentData {
  workOrderId: string
  memberId: string
  role: AssignmentRole
}

export interface WorkOrderAssignmentRepositoryInterface {
  create(
    data: CreateWorkOrderAssignmentData
  ): Promise<WorkOrderAssignmentRecord>
  findAllByWorkOrder(workOrderId: string): Promise<WorkOrderAssignmentRecord[]>
  findById(id: string): Promise<WorkOrderAssignmentRecord | null>
  existsByWorkOrderAndMember(
    workOrderId: string,
    memberId: string
  ): Promise<boolean>
  existsMemberInOrg(memberId: string, organizationId: string): Promise<boolean>
  delete(id: string): Promise<void>
}
```

- [ ] **Step 3: Create `interfaces/index.ts`**

Sorted by line length, longest first:

```typescript
export type { WorkOrderAssignmentRepositoryInterface } from './work-order-assignment.repository.interface'
export type { CreateWorkOrderAssignmentData } from './work-order-assignment.repository.interface'
export type { WorkOrderAssignmentRecord } from './work-order-assignment.repository.interface'
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/work-order-assignments/
```

Commit using the `/commit` skill.

---

### Task 4: DTO

**Files:**

- Create: `apps/api/src/work-order-assignments/dto/create-work-order-assignment.dto.ts`
- Create: `apps/api/src/work-order-assignments/dto/index.ts`

- [ ] **Step 1: Create `dto/create-work-order-assignment.dto.ts`**

```typescript
import { IsEnum, IsOptional, IsUUID } from 'class-validator'

import { AssignmentRole } from '@glossops/database'

export class CreateWorkOrderAssignmentDto {
  @IsUUID()
  memberId: string

  @IsOptional()
  @IsEnum(AssignmentRole)
  role?: AssignmentRole
}
```

- [ ] **Step 2: Create `dto/index.ts`**

```typescript
export { CreateWorkOrderAssignmentDto } from './create-work-order-assignment.dto'
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/work-order-assignments/dto/
```

Commit using the `/commit` skill.

---

### Task 5: In-memory repository

**Files:**

- Create: `apps/api/src/work-order-assignments/infrastructure/in-memory-work-order-assignment.repository.ts`

- [ ] **Step 1: Create the in-memory repository**

```typescript
import { randomUUID } from 'crypto'

import { Injectable } from '@nestjs/common'

import type {
  WorkOrderAssignmentRepositoryInterface,
  CreateWorkOrderAssignmentData,
  WorkOrderAssignmentRecord,
} from '@work-order-assignments/interfaces'

@Injectable()
export class InMemoryWorkOrderAssignmentRepository implements WorkOrderAssignmentRepositoryInterface {
  readonly store = new Map<string, WorkOrderAssignmentRecord>()
  private readonly members = new Map<string, string>() // memberId → organizationId

  seedMember(memberId: string, organizationId: string): void {
    this.members.set(memberId, organizationId)
  }

  create(
    data: CreateWorkOrderAssignmentData
  ): Promise<WorkOrderAssignmentRecord> {
    const record: WorkOrderAssignmentRecord = {
      id: randomUUID(),
      workOrderId: data.workOrderId,
      memberId: data.memberId,
      role: data.role,
      assignedAt: new Date(),
    }
    this.store.set(record.id, record)
    return Promise.resolve(record)
  }

  findAllByWorkOrder(
    workOrderId: string
  ): Promise<WorkOrderAssignmentRecord[]> {
    return Promise.resolve(
      Array.from(this.store.values()).filter(r => r.workOrderId === workOrderId)
    )
  }

  findById(id: string): Promise<WorkOrderAssignmentRecord | null> {
    return Promise.resolve(this.store.get(id) ?? null)
  }

  existsByWorkOrderAndMember(
    workOrderId: string,
    memberId: string
  ): Promise<boolean> {
    return Promise.resolve(
      Array.from(this.store.values()).some(
        r => r.workOrderId === workOrderId && r.memberId === memberId
      )
    )
  }

  existsMemberInOrg(
    memberId: string,
    organizationId: string
  ): Promise<boolean> {
    return Promise.resolve(this.members.get(memberId) === organizationId)
  }

  delete(id: string): Promise<void> {
    this.store.delete(id)
    return Promise.resolve()
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/work-order-assignments/infrastructure/
```

Commit using the `/commit` skill.

---

### Task 6: `WorkOrderAssignmentsService` — TDD

**Files:**

- Create: `apps/api/src/work-order-assignments/work-order-assignments.service.spec.ts`
- Create: `apps/api/src/work-order-assignments/work-order-assignments.service.ts`

- [ ] **Step 1: Write the full test file**

```typescript
import { Test, type TestingModule } from '@nestjs/testing'
import { AssignmentRole, WorkOrderStatus } from '@glossops/database'

import type { WorkOrderWithItems } from '@work-orders/interfaces'

import { WORK_ORDER_ASSIGNMENT_REPOSITORY } from './work-order-assignments.tokens'
import { WorkOrderAssignmentsService } from './work-order-assignments.service'
import { InMemoryWorkOrderAssignmentRepository } from './infrastructure/in-memory-work-order-assignment.repository'
import { ActivityLogsService } from '../activity-logs/activity-logs.service'
import { WorkOrdersService } from '../work-orders/work-orders.service'

const WO_ID = 'wo-1'
const ORG_ID = 'org-1'
const BRANCH_ID = 'branch-1'
const ACCOUNT_ID = 'acc-1'
const MEMBER_ID = 'member-1'

const activeWo = {
  id: WO_ID,
  status: WorkOrderStatus.IN_PROGRESS,
  branchId: BRANCH_ID,
} as unknown as WorkOrderWithItems
const completedWo = {
  id: WO_ID,
  status: WorkOrderStatus.COMPLETED,
  branchId: BRANCH_ID,
} as unknown as WorkOrderWithItems
const cancelledWo = {
  id: WO_ID,
  status: WorkOrderStatus.CANCELLED,
  branchId: BRANCH_ID,
} as unknown as WorkOrderWithItems

const baseDto = { memberId: MEMBER_ID }

describe('WorkOrderAssignmentsService', () => {
  let service: WorkOrderAssignmentsService
  let repo: InMemoryWorkOrderAssignmentRepository
  let workOrdersService: jest.Mocked<Pick<WorkOrdersService, 'findOne'>>
  let activityLogs: jest.Mocked<Pick<ActivityLogsService, 'record'>>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkOrderAssignmentsService,
        {
          provide: WORK_ORDER_ASSIGNMENT_REPOSITORY,
          useClass: InMemoryWorkOrderAssignmentRepository,
        },
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

    service = module.get(WorkOrderAssignmentsService)
    repo = module.get(WORK_ORDER_ASSIGNMENT_REPOSITORY)
    workOrdersService = module.get(WorkOrdersService)
    activityLogs = module.get(ActivityLogsService)
  })

  afterEach(() => {
    repo.store.clear()
    jest.clearAllMocks()
  })

  // ── create ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    beforeEach(() => {
      repo.seedMember(MEMBER_ID, ORG_ID)
    })

    it('assigns with default ASSISTANT role', async () => {
      workOrdersService.findOne.mockResolvedValue(activeWo)

      const result = await service.create(WO_ID, baseDto, ACCOUNT_ID, ORG_ID)

      expect(result.workOrderId).toBe(WO_ID)
      expect(result.memberId).toBe(MEMBER_ID)
      expect(result.role).toBe(AssignmentRole.ASSISTANT)
    })

    it('assigns with explicit LEAD role', async () => {
      workOrdersService.findOne.mockResolvedValue(activeWo)

      const result = await service.create(
        WO_ID,
        { ...baseDto, role: AssignmentRole.LEAD },
        ACCOUNT_ID,
        ORG_ID
      )

      expect(result.role).toBe(AssignmentRole.LEAD)
    })

    it('throws 404 work_order_not_found if WO does not exist', async () => {
      workOrdersService.findOne.mockRejectedValue({
        response: { error: 'work_order_not_found' },
      })

      await expect(
        service.create(WO_ID, baseDto, ACCOUNT_ID, ORG_ID)
      ).rejects.toMatchObject({ response: { error: 'work_order_not_found' } })
    })

    it('throws 409 work_order_not_assignable if WO is COMPLETED', async () => {
      workOrdersService.findOne.mockResolvedValue(completedWo)

      await expect(
        service.create(WO_ID, baseDto, ACCOUNT_ID, ORG_ID)
      ).rejects.toMatchObject({
        response: { error: 'work_order_not_assignable' },
      })
    })

    it('throws 409 work_order_not_assignable if WO is CANCELLED', async () => {
      workOrdersService.findOne.mockResolvedValue(cancelledWo)

      await expect(
        service.create(WO_ID, baseDto, ACCOUNT_ID, ORG_ID)
      ).rejects.toMatchObject({
        response: { error: 'work_order_not_assignable' },
      })
    })

    it('throws 404 member_not_found if member is not in org', async () => {
      workOrdersService.findOne.mockResolvedValue(activeWo)

      await expect(
        service.create(
          WO_ID,
          { memberId: 'unknown-member' },
          ACCOUNT_ID,
          ORG_ID
        )
      ).rejects.toMatchObject({ response: { error: 'member_not_found' } })
    })

    it('throws 409 assignment_already_exists on duplicate', async () => {
      workOrdersService.findOne.mockResolvedValue(activeWo)
      await service.create(WO_ID, baseDto, ACCOUNT_ID, ORG_ID)

      await expect(
        service.create(WO_ID, baseDto, ACCOUNT_ID, ORG_ID)
      ).rejects.toMatchObject({
        response: { error: 'assignment_already_exists' },
      })
    })

    it('calls activityLogs.record with ASSIGNED action and correct metadata', async () => {
      workOrdersService.findOne.mockResolvedValue(activeWo)
      activityLogs.record.mockResolvedValue(undefined)

      await service.create(WO_ID, baseDto, ACCOUNT_ID, ORG_ID)

      expect(activityLogs.record).toHaveBeenCalledWith({
        organizationId: ORG_ID,
        branchId: BRANCH_ID,
        accountId: ACCOUNT_ID,
        action: 'ASSIGNED',
        entity: 'WorkOrder',
        entityId: WO_ID,
        metadata: { memberId: MEMBER_ID, role: AssignmentRole.ASSISTANT },
      })
    })
  })

  // ── findAll ────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns assignments for the WO', async () => {
      workOrdersService.findOne.mockResolvedValue(activeWo)
      repo.seedMember(MEMBER_ID, ORG_ID)
      await service.create(WO_ID, baseDto, ACCOUNT_ID, ORG_ID)

      const results = await service.findAll(WO_ID, ORG_ID)

      expect(results).toHaveLength(1)
      expect(results[0].workOrderId).toBe(WO_ID)
    })
  })

  // ── remove ─────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('removes the assignment', async () => {
      workOrdersService.findOne.mockResolvedValue(activeWo)
      repo.seedMember(MEMBER_ID, ORG_ID)
      const assignment = await service.create(
        WO_ID,
        baseDto,
        ACCOUNT_ID,
        ORG_ID
      )

      await service.remove(WO_ID, assignment.id, ORG_ID)

      expect(repo.store.has(assignment.id)).toBe(false)
    })

    it('throws 404 assignment_not_found when assignment does not exist', async () => {
      workOrdersService.findOne.mockResolvedValue(activeWo)

      await expect(
        service.remove(WO_ID, 'nonexistent-id', ORG_ID)
      ).rejects.toMatchObject({ response: { error: 'assignment_not_found' } })
    })

    it('throws 404 assignment_not_found when assignment belongs to another WO', async () => {
      workOrdersService.findOne.mockResolvedValue(activeWo)
      repo.seedMember(MEMBER_ID, ORG_ID)
      const assignment = await service.create(
        WO_ID,
        baseDto,
        ACCOUNT_ID,
        ORG_ID
      )

      await expect(
        service.remove('other-wo', assignment.id, ORG_ID)
      ).rejects.toMatchObject({ response: { error: 'assignment_not_found' } })
    })
  })
})
```

- [ ] **Step 2: Run tests to confirm they all FAIL**

```bash
cd apps/api && pnpm test -- --testPathPattern="work-order-assignments.service.spec"
```

Expected: FAIL — `WorkOrderAssignmentsService` does not exist yet.

- [ ] **Step 3: Create `work-order-assignments.service.ts`**

Import order: Tier 1 (`@nestjs/common`) → Tier 3 (`@glossops/database`) → Tier 4 (`@work-order-assignments/interfaces`) → Tier 5 relative, sorted longest → shortest.

```typescript
import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import {
  ActivityAction,
  AssignmentRole,
  WorkOrderStatus,
} from '@glossops/database'

import type { WorkOrderAssignmentRecord } from '@work-order-assignments/interfaces'

import { CreateWorkOrderAssignmentDto } from './dto/create-work-order-assignment.dto'
import { WORK_ORDER_ASSIGNMENT_REPOSITORY } from './work-order-assignments.tokens'
import { ActivityLogsService } from '../activity-logs/activity-logs.service'
import type { WorkOrderAssignmentRepositoryInterface } from './interfaces'
import { WorkOrdersService } from '../work-orders/work-orders.service'

@Injectable()
export class WorkOrderAssignmentsService {
  constructor(
    @Inject(WORK_ORDER_ASSIGNMENT_REPOSITORY)
    private readonly repo: WorkOrderAssignmentRepositoryInterface,
    private readonly workOrdersService: WorkOrdersService,
    private readonly activityLogs: ActivityLogsService
  ) {}

  async create(
    workOrderId: string,
    dto: CreateWorkOrderAssignmentDto,
    accountId: string,
    organizationId: string
  ): Promise<WorkOrderAssignmentRecord> {
    const wo = await this.workOrdersService.findOne(workOrderId, organizationId)

    if (
      wo.status === WorkOrderStatus.COMPLETED ||
      wo.status === WorkOrderStatus.CANCELLED
    ) {
      throw new ConflictException({ error: 'work_order_not_assignable' })
    }

    const memberExists = await this.repo.existsMemberInOrg(
      dto.memberId,
      organizationId
    )
    if (!memberExists) {
      throw new NotFoundException({ error: 'member_not_found' })
    }

    const alreadyAssigned = await this.repo.existsByWorkOrderAndMember(
      workOrderId,
      dto.memberId
    )
    if (alreadyAssigned) {
      throw new ConflictException({ error: 'assignment_already_exists' })
    }

    const role = dto.role ?? AssignmentRole.ASSISTANT
    const record = await this.repo.create({
      workOrderId,
      memberId: dto.memberId,
      role,
    })

    await this.activityLogs.record({
      organizationId,
      branchId: wo.branchId,
      accountId,
      action: ActivityAction.ASSIGNED,
      entity: 'WorkOrder',
      entityId: workOrderId,
      metadata: { memberId: dto.memberId, role },
    })

    return record
  }

  async findAll(
    workOrderId: string,
    organizationId: string
  ): Promise<WorkOrderAssignmentRecord[]> {
    await this.workOrdersService.findOne(workOrderId, organizationId)
    return this.repo.findAllByWorkOrder(workOrderId)
  }

  async remove(
    workOrderId: string,
    id: string,
    organizationId: string
  ): Promise<void> {
    await this.workOrdersService.findOne(workOrderId, organizationId)
    const assignment = await this.repo.findById(id)
    if (!assignment || assignment.workOrderId !== workOrderId) {
      throw new NotFoundException({ error: 'assignment_not_found' })
    }
    await this.repo.delete(id)
  }
}
```

- [ ] **Step 4: Run tests to confirm they all PASS**

```bash
cd apps/api && pnpm test -- --testPathPattern="work-order-assignments.service.spec"
```

Expected: all 11 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/work-order-assignments/
```

Commit using the `/commit` skill.

---

### Task 7: Prisma repository

**Files:**

- Create: `apps/api/src/work-order-assignments/infrastructure/prisma-work-order-assignment.repository.ts`

`existsMemberInOrg` queries `organizationMember` with a nested `branch.organizationId` filter — `OrganizationMember` has no direct `organizationId` column, only `branchId`.

- [ ] **Step 1: Create the Prisma repository**

```typescript
import { Injectable } from '@nestjs/common'
import { AssignmentRole } from '@glossops/database'

import { PrismaService } from '@prisma'
import type {
  WorkOrderAssignmentRepositoryInterface,
  CreateWorkOrderAssignmentData,
  WorkOrderAssignmentRecord,
} from '@work-order-assignments/interfaces'

type PrismaAssignmentRow = Awaited<
  ReturnType<PrismaService['workOrderAssignment']['findUniqueOrThrow']>
>

@Injectable()
export class PrismaWorkOrderAssignmentRepository implements WorkOrderAssignmentRepositoryInterface {
  constructor(private readonly prisma: PrismaService) {}

  private toRecord(row: PrismaAssignmentRow): WorkOrderAssignmentRecord {
    return {
      id: row.id,
      workOrderId: row.workOrderId,
      memberId: row.memberId,
      role: row.role as AssignmentRole,
      assignedAt: row.assignedAt,
    }
  }

  async create(
    data: CreateWorkOrderAssignmentData
  ): Promise<WorkOrderAssignmentRecord> {
    const row = await this.prisma.workOrderAssignment.create({
      data: {
        workOrderId: data.workOrderId,
        memberId: data.memberId,
        role: data.role,
      },
    })
    return this.toRecord(row)
  }

  async findAllByWorkOrder(
    workOrderId: string
  ): Promise<WorkOrderAssignmentRecord[]> {
    const rows = await this.prisma.workOrderAssignment.findMany({
      where: { workOrderId },
      orderBy: { assignedAt: 'asc' },
    })
    return rows.map(r => this.toRecord(r))
  }

  async findById(id: string): Promise<WorkOrderAssignmentRecord | null> {
    const row = await this.prisma.workOrderAssignment.findUnique({
      where: { id },
    })
    return row ? this.toRecord(row) : null
  }

  async existsByWorkOrderAndMember(
    workOrderId: string,
    memberId: string
  ): Promise<boolean> {
    const count = await this.prisma.workOrderAssignment.count({
      where: { workOrderId, memberId },
    })
    return count > 0
  }

  async existsMemberInOrg(
    memberId: string,
    organizationId: string
  ): Promise<boolean> {
    const count = await this.prisma.organizationMember.count({
      where: { id: memberId, branch: { organizationId } },
    })
    return count > 0
  }

  async delete(id: string): Promise<void> {
    await this.prisma.workOrderAssignment.delete({ where: { id } })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/work-order-assignments/infrastructure/prisma-work-order-assignment.repository.ts
```

Commit using the `/commit` skill.

---

### Task 8: Controller + module + barrel + AppModule

**Files:**

- Create: `apps/api/src/work-order-assignments/work-order-assignments.controller.ts`
- Create: `apps/api/src/work-order-assignments/work-order-assignments.module.ts`
- Create: `apps/api/src/work-order-assignments/index.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Create `work-order-assignments.controller.ts`**

```typescript
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common'
import { Role } from '@glossops/database'

import { CurrentAccount, Roles } from '@auth/decorators'
import type { AuthContext } from '@auth/interfaces'

import { CreateWorkOrderAssignmentDto } from './dto/create-work-order-assignment.dto'
import { WorkOrderAssignmentsService } from './work-order-assignments.service'

@Controller('work-orders/:workOrderId/assignments')
export class WorkOrderAssignmentsController {
  constructor(private readonly service: WorkOrderAssignmentsService) {}

  @Post()
  @HttpCode(201)
  @Roles(Role.OWNER, Role.MANAGER)
  create(
    @Param('workOrderId') workOrderId: string,
    @Body() dto: CreateWorkOrderAssignmentDto,
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

- [ ] **Step 2: Create `work-order-assignments.module.ts`**

Tier 4 aliases sorted longest → shortest; Tier 5 relative imports sorted longest → shortest.

```typescript
import { Module } from '@nestjs/common'

import { PrismaModule } from '@prisma'
import { WorkOrdersModule } from '@work-orders'
import { ActivityLogsModule } from '@activity-logs'

import { PrismaWorkOrderAssignmentRepository } from './infrastructure/prisma-work-order-assignment.repository'
import { WORK_ORDER_ASSIGNMENT_REPOSITORY } from './work-order-assignments.tokens'
import { WorkOrderAssignmentsController } from './work-order-assignments.controller'
import { WorkOrderAssignmentsService } from './work-order-assignments.service'

@Module({
  imports: [PrismaModule, WorkOrdersModule, ActivityLogsModule],
  controllers: [WorkOrderAssignmentsController],
  providers: [
    {
      provide: WORK_ORDER_ASSIGNMENT_REPOSITORY,
      useClass: PrismaWorkOrderAssignmentRepository,
    },
    WorkOrderAssignmentsService,
  ],
})
export class WorkOrderAssignmentsModule {}
```

- [ ] **Step 3: Create `index.ts` (barrel)**

Sorted by line length, longest first:

```typescript
export { WorkOrderAssignmentsService } from './work-order-assignments.service'
export { WorkOrderAssignmentsModule } from './work-order-assignments.module'
export type { WorkOrderAssignmentRecord } from './interfaces'
```

- [ ] **Step 4: Update `apps/api/src/app.module.ts`**

Add import (insert before the `AppController` import, grouped with other module imports):

```typescript
import { WorkOrderAssignmentsModule } from './work-order-assignments/work-order-assignments.module'
```

Add `WorkOrderAssignmentsModule` to the `imports` array after `AssetCheckpointsModule`:

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
    ActivityLogsModule,
    AssetCheckpointsModule,
    WorkOrderAssignmentsModule,
    InventoryModule,
    PurchaseOrdersModule,
  ],
```

- [ ] **Step 5: Run full test suite**

```bash
cd apps/api && pnpm test
```

Expected: all tests pass (no regressions).

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/work-order-assignments/ apps/api/src/app.module.ts
```

Commit using the `/commit` skill.
