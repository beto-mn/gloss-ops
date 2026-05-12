# Inventory Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the InventoryModule with CRUD for `InventoryItem` and `MaterialRoll`, inventory usage tracking on work orders (pre-creation on item add, technician adjustment, stock commit on completion), and integration with `WorkOrdersService`.

**Architecture:** Five repository interfaces define contracts for `Inventory` (list/find/hasActiveUsages), `InventoryItem` (CRUD + decrementStock), `MaterialRoll` (CRUD + decrementLength), `InventoryUsage` (CRUD + commitAll), and `ServiceDefaults` (fetches a Service's default inventory link). A single `InventoryService` orchestrates all operations. Three controllers handle `/inventory` (GET list), `/inventory/items` (POST/PATCH/DELETE), and `/inventory/material-rolls` (POST/PATCH/DELETE). A fourth controller `WorkOrderUsagesController` lives in `WorkOrdersModule` and handles `PATCH /work-orders/:id/usages/:usageId`. `WorkOrdersService` is extended to call `InventoryService.maybeCreateUsage` on item-add and `InventoryService.commitUsages`/`deleteUsagesByWorkOrder` on status transitions. All inventory is branch-scoped via `account.branchId`.

**Tech Stack:** NestJS, TypeScript, Prisma ORM, PostgreSQL, class-validator, class-transformer, Jest

---

## File Map

**Create:**

- `apps/api/src/inventory/inventory.tokens.ts`
- `apps/api/src/inventory/interfaces/inventory.repository.interface.ts`
- `apps/api/src/inventory/interfaces/inventory-item.repository.interface.ts`
- `apps/api/src/inventory/interfaces/material-roll.repository.interface.ts`
- `apps/api/src/inventory/interfaces/inventory-usage.repository.interface.ts`
- `apps/api/src/inventory/interfaces/service-defaults.repository.interface.ts`
- `apps/api/src/inventory/interfaces/index.ts`
- `apps/api/src/inventory/dto/create-inventory-item.dto.ts`
- `apps/api/src/inventory/dto/update-inventory-item.dto.ts`
- `apps/api/src/inventory/dto/create-material-roll.dto.ts`
- `apps/api/src/inventory/dto/update-material-roll.dto.ts`
- `apps/api/src/inventory/dto/list-inventory.dto.ts`
- `apps/api/src/inventory/dto/update-inventory-usage.dto.ts`
- `apps/api/src/inventory/dto/index.ts`
- `apps/api/src/inventory/infrastructure/in-memory-inventory.repository.ts`
- `apps/api/src/inventory/infrastructure/in-memory-inventory-item.repository.ts`
- `apps/api/src/inventory/infrastructure/in-memory-material-roll.repository.ts`
- `apps/api/src/inventory/infrastructure/in-memory-inventory-usage.repository.ts`
- `apps/api/src/inventory/infrastructure/in-memory-service-defaults.repository.ts`
- `apps/api/src/inventory/infrastructure/prisma-inventory.repository.ts`
- `apps/api/src/inventory/infrastructure/prisma-inventory-item.repository.ts`
- `apps/api/src/inventory/infrastructure/prisma-material-roll.repository.ts`
- `apps/api/src/inventory/infrastructure/prisma-inventory-usage.repository.ts`
- `apps/api/src/inventory/infrastructure/prisma-service-defaults.repository.ts`
- `apps/api/src/inventory/inventory.service.ts`
- `apps/api/src/inventory/inventory.service.spec.ts`
- `apps/api/src/inventory/inventory.controller.ts`
- `apps/api/src/inventory/inventory.controller.spec.ts`
- `apps/api/src/inventory/inventory-items.controller.ts`
- `apps/api/src/inventory/inventory-items.controller.spec.ts`
- `apps/api/src/inventory/material-rolls.controller.ts`
- `apps/api/src/inventory/material-rolls.controller.spec.ts`
- `apps/api/src/inventory/inventory.module.ts`
- `apps/api/src/inventory/index.ts`
- `apps/api/src/work-orders/work-order-usages.controller.ts`
- `apps/api/src/work-orders/work-order-usages.controller.spec.ts`

**Modify:**

- `packages/database/prisma/schema.prisma` — add `defaultInventoryId`, `defaultQuantity`, `defaultInventory` to `Service`; add `services` back-relation to `Inventory`
- `apps/api/tsconfig.paths.json` — add `@inventory`, `@inventory/dto`, `@inventory/interfaces`
- `apps/api/package.json` — add jest `moduleNameMapper` for `@inventory`
- `apps/api/src/app.module.ts` — import `InventoryModule`
- `apps/api/src/work-orders/work-orders.service.ts` — inject `InventoryService`, call on addItem/transition
- `apps/api/src/work-orders/work-orders.service.spec.ts` — add 3 tests for inventory integration
- `apps/api/src/work-orders/work-orders.module.ts` — import `InventoryModule`, register `WorkOrderUsagesController`

---

## Task 1: Schema migration

**Files:**

- Modify: `packages/database/prisma/schema.prisma`

- [ ] **Step 1: Add fields and relation to Service model**

In `schema.prisma`, find `model Service` and add before `createdAt`:

```prisma
  defaultInventoryId String?  @map("default_inventory_id") @db.Uuid
  defaultQuantity    Decimal? @map("default_quantity") @db.Decimal(10, 3)
```

Add relation after `organization Organization @relation(...)` line:

```prisma
  defaultInventory Inventory? @relation("ServiceDefaultInventory", fields: [defaultInventoryId], references: [id])
```

The complete updated `model Service` block:

```prisma
model Service {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organizationId String   @map("organization_id") @db.Uuid
  name           String
  description    String?
  basePrice      Decimal  @default(0) @map("base_price") @db.Decimal(10, 2)
  isActive       Boolean  @default(true) @map("is_active")

  claveProdServ String? @map("clave_prod_serv")
  claveUnidad   String? @map("clave_unidad")

  warrantyDays        Int?    @map("warranty_days")
  warrantyDescription String? @map("warranty_description")
  warrantyTerm        String? @map("warranty_term")

  defaultInventoryId String?  @map("default_inventory_id") @db.Uuid
  defaultQuantity    Decimal? @map("default_quantity") @db.Decimal(10, 3)

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  organization     Organization    @relation(fields: [organizationId], references: [id])
  defaultInventory Inventory?      @relation("ServiceDefaultInventory", fields: [defaultInventoryId], references: [id])
  workOrderItems   WorkOrderItem[]
  warranties       Warranty[]

  @@unique([organizationId, name])
  @@map("service")
}
```

- [ ] **Step 2: Add back-relation to Inventory model**

In `model Inventory`, add after the last relation line (before the `@@map`):

```prisma
  services      Service[]      @relation("ServiceDefaultInventory")
```

- [ ] **Step 3: Run migration**

```bash
pnpm --filter @glossops/database prisma migrate dev --name add_service_default_inventory
```

Expected output: `The following migration(s) have been created and applied from new schema changes: migrations/TIMESTAMP_add_service_default_inventory`

- [ ] **Step 4: Commit**

```bash
git add packages/database/prisma/schema.prisma packages/database/prisma/migrations
python3 -c "
msg = '🗃️ chore(database): add defaultInventoryId and defaultQuantity to Service'
with open('/tmp/commit_msg.txt', 'w') as f:
    f.write(msg)
" && git commit -F /tmp/commit_msg.txt
```

---

## Task 2: Path aliases

**Files:**

- Modify: `apps/api/tsconfig.paths.json`
- Modify: `apps/api/package.json`

- [ ] **Step 1: Add entries to tsconfig.paths.json**

Inside the `"paths"` object, add (after the `@work-orders` entries):

```json
"@inventory": ["./src/inventory/index.ts"],
"@inventory/dto": ["./src/inventory/dto/index.ts"],
"@inventory/interfaces": ["./src/inventory/interfaces/index.ts"]
```

- [ ] **Step 2: Add entries to jest moduleNameMapper in package.json**

Inside `"jest" > "moduleNameMapper"`, add (after the `@work-orders` entries):

```json
"^@inventory$": "<rootDir>/inventory/index.ts",
"^@inventory/dto$": "<rootDir>/inventory/dto/index.ts",
"^@inventory/interfaces$": "<rootDir>/inventory/interfaces/index.ts"
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/tsconfig.paths.json apps/api/package.json
python3 -c "
msg = '🔧 chore(api): add @inventory path aliases to tsconfig and jest'
with open('/tmp/commit_msg.txt', 'w') as f:
    f.write(msg)
" && git commit -F /tmp/commit_msg.txt
```

---

## Task 3: DI tokens + repository interfaces

**Files:**

- Create: `apps/api/src/inventory/inventory.tokens.ts`
- Create: `apps/api/src/inventory/interfaces/inventory.repository.interface.ts`
- Create: `apps/api/src/inventory/interfaces/inventory-item.repository.interface.ts`
- Create: `apps/api/src/inventory/interfaces/material-roll.repository.interface.ts`
- Create: `apps/api/src/inventory/interfaces/inventory-usage.repository.interface.ts`
- Create: `apps/api/src/inventory/interfaces/service-defaults.repository.interface.ts`
- Create: `apps/api/src/inventory/interfaces/index.ts`

- [ ] **Step 1: Create DI tokens**

```typescript
// apps/api/src/inventory/inventory.tokens.ts
export const INVENTORY_REPOSITORY = Symbol('InventoryRepositoryInterface')
export const INVENTORY_ITEM_REPOSITORY = Symbol(
  'InventoryItemRepositoryInterface'
)
export const MATERIAL_ROLL_REPOSITORY = Symbol(
  'MaterialRollRepositoryInterface'
)
export const INVENTORY_USAGE_REPOSITORY = Symbol(
  'InventoryUsageRepositoryInterface'
)
export const SERVICE_DEFAULTS_REPOSITORY = Symbol(
  'ServiceDefaultsRepositoryInterface'
)
```

- [ ] **Step 2: Create inventory.repository.interface.ts**

```typescript
// apps/api/src/inventory/interfaces/inventory.repository.interface.ts
import type { InventoryType, Prisma } from '@glossops/database'

export interface InventoryQuery {
  type?: InventoryType
  supplierId?: string
  brandId?: string
  lowStock?: boolean
  page: number
  limit: number
}

export interface InventoryPageMeta {
  total: number
  totalPages: number
  page: number
  limit: number
  hasNext: boolean
  hasPrev: boolean
}

export type InventoryRecord = Prisma.InventoryModel & {
  inventoryItem: Prisma.InventoryItemModel | null
  materialRoll: Prisma.MaterialRollModel | null
}

export interface InventoryPage {
  data: InventoryRecord[]
  meta: InventoryPageMeta
}

export interface InventoryRepositoryInterface {
  findById(id: string, branchId: string): Promise<InventoryRecord | null>
  findAll(branchId: string, query: InventoryQuery): Promise<InventoryPage>
  hasActiveUsages(id: string): Promise<boolean>
}
```

- [ ] **Step 3: Create inventory-item.repository.interface.ts**

```typescript
// apps/api/src/inventory/interfaces/inventory-item.repository.interface.ts
import type { Prisma } from '@glossops/database'

import type { InventoryRecord } from './inventory.repository.interface'

export interface CreateInventoryItemData {
  branchId: string
  supplierId?: string
  brandId?: string
  name: string
  unitCost?: number
  sku?: string
  description?: string
  stock?: number
  unit: string
  lowStockAlert?: number
}

export interface UpdateInventoryItemData {
  name?: string
  supplierId?: string | null
  brandId?: string | null
  unitCost?: number
  sku?: string | null
  description?: string | null
  stock?: number
  unit?: string
  lowStockAlert?: number | null
}

export interface InventoryItemRepositoryInterface {
  create(data: CreateInventoryItemData): Promise<InventoryRecord>
  update(
    id: string,
    branchId: string,
    data: UpdateInventoryItemData
  ): Promise<InventoryRecord>
  delete(id: string, branchId: string): Promise<void>
  decrementStock(
    id: string,
    quantity: Prisma.Decimal
  ): Promise<Prisma.InventoryItemModel>
}
```

- [ ] **Step 4: Create material-roll.repository.interface.ts**

```typescript
// apps/api/src/inventory/interfaces/material-roll.repository.interface.ts
import type { Prisma } from '@glossops/database'

import type { InventoryRecord } from './inventory.repository.interface'

export interface CreateMaterialRollData {
  branchId: string
  supplierId?: string
  brandId?: string
  name: string
  unitCost?: number
  series: string
  finish: string
  color: string
  width: number
  remainingLength: number
  lotNumber?: string
}

export interface UpdateMaterialRollData {
  name?: string
  supplierId?: string | null
  brandId?: string | null
  unitCost?: number
  series?: string
  finish?: string
  color?: string
  width?: number
  remainingLength?: number
  lotNumber?: string | null
}

export interface MaterialRollRepositoryInterface {
  create(data: CreateMaterialRollData): Promise<InventoryRecord>
  update(
    id: string,
    branchId: string,
    data: UpdateMaterialRollData
  ): Promise<InventoryRecord>
  delete(id: string, branchId: string): Promise<void>
  decrementLength(
    id: string,
    quantity: Prisma.Decimal
  ): Promise<Prisma.MaterialRollModel>
}
```

- [ ] **Step 5: Create inventory-usage.repository.interface.ts**

```typescript
// apps/api/src/inventory/interfaces/inventory-usage.repository.interface.ts
import type { Prisma } from '@glossops/database'

export interface CreateInventoryUsageData {
  workOrderId: string
  inventoryId: string
  quantityUsed: number
  costAtUsage: number
}

export interface CommitUsagesResult {
  warnings: string[]
}

export interface InventoryUsageRepositoryInterface {
  create(data: CreateInventoryUsageData): Promise<Prisma.InventoryUsageModel>
  findById(
    id: string,
    workOrderId: string
  ): Promise<Prisma.InventoryUsageModel | null>
  findAllByWorkOrder(workOrderId: string): Promise<Prisma.InventoryUsageModel[]>
  findAllByInventory(inventoryId: string): Promise<Prisma.InventoryUsageModel[]>
  update(
    id: string,
    workOrderId: string,
    quantityUsed: Prisma.Decimal
  ): Promise<Prisma.InventoryUsageModel>
  deleteByWorkOrder(workOrderId: string): Promise<void>
  commitAll(workOrderId: string): Promise<CommitUsagesResult>
}
```

- [ ] **Step 6: Create service-defaults.repository.interface.ts**

```typescript
// apps/api/src/inventory/interfaces/service-defaults.repository.interface.ts
import type { Prisma } from '@glossops/database'

export interface ServiceInventoryDefaults {
  inventoryId: string
  defaultQuantity: Prisma.Decimal
}

export interface ServiceDefaultsRepositoryInterface {
  getInventoryDefaults(
    serviceId: string
  ): Promise<ServiceInventoryDefaults | null>
}
```

- [ ] **Step 7: Create interfaces/index.ts**

Sort exports by line length, longest first:

```typescript
// apps/api/src/inventory/interfaces/index.ts
export type {
  InventoryUsageRepositoryInterface,
  CreateInventoryUsageData,
  CommitUsagesResult,
} from './inventory-usage.repository.interface'
export type {
  ServiceDefaultsRepositoryInterface,
  ServiceInventoryDefaults,
} from './service-defaults.repository.interface'
export type {
  MaterialRollRepositoryInterface,
  CreateMaterialRollData,
  UpdateMaterialRollData,
} from './material-roll.repository.interface'
export type {
  InventoryItemRepositoryInterface,
  CreateInventoryItemData,
  UpdateInventoryItemData,
} from './inventory-item.repository.interface'
export type {
  InventoryRepositoryInterface,
  InventoryRecord,
  InventoryPage,
  InventoryPageMeta,
  InventoryQuery,
} from './inventory.repository.interface'
```

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/inventory/inventory.tokens.ts apps/api/src/inventory/interfaces/
python3 -c "
msg = '✨ feat(inventory): add DI tokens and repository interfaces'
with open('/tmp/commit_msg.txt', 'w') as f:
    f.write(msg)
" && git commit -F /tmp/commit_msg.txt
```

---

## Task 4: DTOs

**Files:**

- Create: `apps/api/src/inventory/dto/create-inventory-item.dto.ts`
- Create: `apps/api/src/inventory/dto/update-inventory-item.dto.ts`
- Create: `apps/api/src/inventory/dto/create-material-roll.dto.ts`
- Create: `apps/api/src/inventory/dto/update-material-roll.dto.ts`
- Create: `apps/api/src/inventory/dto/list-inventory.dto.ts`
- Create: `apps/api/src/inventory/dto/update-inventory-usage.dto.ts`
- Create: `apps/api/src/inventory/dto/index.ts`

Import tier rules (CLAUDE.md): single-line imports first (longest → shortest) within each tier, then multi-line. Tier 1 = external npm. Tier 3 = `@glossops/*`. Tier 4 = path aliases. Tier 5 = relative.

- [ ] **Step 1: create-inventory-item.dto.ts**

```typescript
// apps/api/src/inventory/dto/create-inventory-item.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator'

export class CreateInventoryItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  supplierId?: string

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  brandId?: string

  @ApiPropertyOptional({ default: 0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  unitCost?: number

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  sku?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string

  @ApiPropertyOptional({ default: 0 })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @IsOptional()
  stock?: number

  @ApiProperty({ example: 'pza' })
  @IsString()
  @IsNotEmpty()
  unit: string

  @ApiPropertyOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @IsOptional()
  lowStockAlert?: number
}
```

- [ ] **Step 2: update-inventory-item.dto.ts**

```typescript
// apps/api/src/inventory/dto/update-inventory-item.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator'

export class UpdateInventoryItemDto {
  @ApiPropertyOptional()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string

  @ApiPropertyOptional({ nullable: true })
  @IsUUID()
  @IsOptional()
  supplierId?: string | null

  @ApiPropertyOptional({ nullable: true })
  @IsUUID()
  @IsOptional()
  brandId?: string | null

  @ApiPropertyOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  unitCost?: number

  @ApiPropertyOptional({ nullable: true })
  @IsString()
  @IsOptional()
  sku?: string | null

  @ApiPropertyOptional({ nullable: true })
  @IsString()
  @IsOptional()
  description?: string | null

  @ApiPropertyOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @IsOptional()
  stock?: number

  @ApiPropertyOptional()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  unit?: string

  @ApiPropertyOptional({ nullable: true })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @IsOptional()
  lowStockAlert?: number | null
}
```

- [ ] **Step 3: create-material-roll.dto.ts**

```typescript
// apps/api/src/inventory/dto/create-material-roll.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator'

export class CreateMaterialRollDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  supplierId?: string

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  brandId?: string

  @ApiPropertyOptional({ default: 0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  unitCost?: number

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  series: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  finish: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  color: string

  @ApiProperty({ description: 'Width in meters, > 0' })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  width: number

  @ApiProperty({ description: 'Remaining length in meters, ≥ 0' })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  remainingLength: number

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  lotNumber?: string
}
```

- [ ] **Step 4: update-material-roll.dto.ts**

```typescript
// apps/api/src/inventory/dto/update-material-roll.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator'

export class UpdateMaterialRollDto {
  @ApiPropertyOptional()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string

  @ApiPropertyOptional({ nullable: true })
  @IsUUID()
  @IsOptional()
  supplierId?: string | null

  @ApiPropertyOptional({ nullable: true })
  @IsUUID()
  @IsOptional()
  brandId?: string | null

  @ApiPropertyOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  unitCost?: number

  @ApiPropertyOptional()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  series?: string

  @ApiPropertyOptional()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  finish?: string

  @ApiPropertyOptional()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  color?: string

  @ApiPropertyOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  @IsOptional()
  width?: number

  @ApiPropertyOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @IsOptional()
  remainingLength?: number

  @ApiPropertyOptional({ nullable: true })
  @IsString()
  @IsOptional()
  lotNumber?: string | null
}
```

- [ ] **Step 5: list-inventory.dto.ts**

```typescript
// apps/api/src/inventory/dto/list-inventory.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger'
import { Transform, Type } from 'class-transformer'
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator'

import { InventoryType } from '@glossops/database'

export class ListInventoryDto {
  @ApiPropertyOptional({ enum: InventoryType })
  @IsEnum(InventoryType)
  @IsOptional()
  type?: InventoryType

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  supplierId?: string

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  brandId?: string

  @ApiPropertyOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  lowStock?: boolean

  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number

  @ApiPropertyOptional({ default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number
}
```

- [ ] **Step 6: update-inventory-usage.dto.ts**

```typescript
// apps/api/src/inventory/dto/update-inventory-usage.dto.ts
import { ApiProperty } from '@nestjs/swagger'
import { IsNumber, Min } from 'class-validator'

export class UpdateInventoryUsageDto {
  @ApiProperty({ description: 'Quantity used, must be > 0' })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantityUsed: number
}
```

- [ ] **Step 7: dto/index.ts**

```typescript
// apps/api/src/inventory/dto/index.ts
export { UpdateInventoryItemDto } from './update-inventory-item.dto'
export { UpdateInventoryUsageDto } from './update-inventory-usage.dto'
export { UpdateMaterialRollDto } from './update-material-roll.dto'
export { CreateInventoryItemDto } from './create-inventory-item.dto'
export { CreateMaterialRollDto } from './create-material-roll.dto'
export { ListInventoryDto } from './list-inventory.dto'
```

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/inventory/dto/
python3 -c "
msg = '✨ feat(inventory): add DTOs for inventory items, material rolls, and usages'
with open('/tmp/commit_msg.txt', 'w') as f:
    f.write(msg)
" && git commit -F /tmp/commit_msg.txt
```

---

## Task 5: In-memory repositories

**Files:**

- Create: `apps/api/src/inventory/infrastructure/in-memory-inventory.repository.ts`
- Create: `apps/api/src/inventory/infrastructure/in-memory-inventory-item.repository.ts`
- Create: `apps/api/src/inventory/infrastructure/in-memory-material-roll.repository.ts`
- Create: `apps/api/src/inventory/infrastructure/in-memory-inventory-usage.repository.ts`
- Create: `apps/api/src/inventory/infrastructure/in-memory-service-defaults.repository.ts`

`InMemoryInventoryRepository` owns the shared `store: Map<string, InventoryRecord>`. The item and roll repos receive it by reference so all repos see the same state.

- [ ] **Step 1: in-memory-inventory.repository.ts**

```typescript
// apps/api/src/inventory/infrastructure/in-memory-inventory.repository.ts
import { InventoryType } from '@glossops/database'

import type {
  InventoryRepositoryInterface,
  InventoryRecord,
  InventoryPage,
  InventoryQuery,
} from '@inventory/interfaces'

export class InMemoryInventoryRepository implements InventoryRepositoryInterface {
  readonly store = new Map<string, InventoryRecord>()
  private hasActiveUsagesFn: (id: string) => Promise<boolean> = () =>
    Promise.resolve(false)

  setActiveUsagesChecker(fn: (id: string) => Promise<boolean>): void {
    this.hasActiveUsagesFn = fn
  }

  findById(id: string, branchId: string): Promise<InventoryRecord | null> {
    const record = this.store.get(id)
    if (!record || record.branchId !== branchId) return Promise.resolve(null)
    return Promise.resolve(record)
  }

  findByIdDirect(id: string): Promise<InventoryRecord | null> {
    return Promise.resolve(this.store.get(id) ?? null)
  }

  async findAll(
    branchId: string,
    query: InventoryQuery
  ): Promise<InventoryPage> {
    let data = [...this.store.values()].filter(r => r.branchId === branchId)

    if (query.type) data = data.filter(r => r.type === query.type)
    if (query.supplierId)
      data = data.filter(r => r.supplierId === query.supplierId)
    if (query.brandId) data = data.filter(r => r.brandId === query.brandId)
    if (query.lowStock) {
      data = data.filter(r => {
        if (r.type !== InventoryType.ITEM || !r.inventoryItem) return false
        const { stock, lowStockAlert } = r.inventoryItem
        return lowStockAlert !== null && Number(stock) <= Number(lowStockAlert)
      })
    }

    data.sort((a, b) => a.name.localeCompare(b.name))

    const total = data.length
    const totalPages = total === 0 ? 0 : Math.ceil(total / query.limit)
    const page = query.page
    const sliced = data.slice((page - 1) * query.limit, page * query.limit)

    return {
      data: sliced,
      meta: {
        total,
        totalPages,
        page,
        limit: query.limit,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    }
  }

  hasActiveUsages(id: string): Promise<boolean> {
    return this.hasActiveUsagesFn(id)
  }
}
```

- [ ] **Step 2: in-memory-inventory-item.repository.ts**

```typescript
// apps/api/src/inventory/infrastructure/in-memory-inventory-item.repository.ts
import { randomUUID } from 'crypto'

import { InventoryType, Prisma } from '@glossops/database'

import type {
  InventoryItemRepositoryInterface,
  InventoryRecord,
  CreateInventoryItemData,
  UpdateInventoryItemData,
} from '@inventory/interfaces'

export class InMemoryInventoryItemRepository implements InventoryItemRepositoryInterface {
  constructor(private readonly store: Map<string, InventoryRecord>) {}

  create(data: CreateInventoryItemData): Promise<InventoryRecord> {
    const id = randomUUID()
    const record: InventoryRecord = {
      id,
      branchId: data.branchId,
      supplierId: data.supplierId ?? null,
      brandId: data.brandId ?? null,
      type: InventoryType.ITEM,
      name: data.name,
      unitCost: new Prisma.Decimal(data.unitCost ?? 0),
      createdAt: new Date(),
      updatedAt: new Date(),
      inventoryItem: {
        id,
        sku: data.sku ?? null,
        description: data.description ?? null,
        stock: new Prisma.Decimal(data.stock ?? 0),
        unit: data.unit,
        lowStockAlert:
          data.lowStockAlert != null
            ? new Prisma.Decimal(data.lowStockAlert)
            : null,
      },
      materialRoll: null,
    }
    this.store.set(id, record)
    return Promise.resolve(record)
  }

  update(
    id: string,
    branchId: string,
    data: UpdateInventoryItemData
  ): Promise<InventoryRecord> {
    const record = this.store.get(id)!
    const item = record.inventoryItem!
    const updated: InventoryRecord = {
      ...record,
      branchId,
      supplierId:
        data.supplierId !== undefined ? data.supplierId : record.supplierId,
      brandId: data.brandId !== undefined ? data.brandId : record.brandId,
      name: data.name ?? record.name,
      unitCost:
        data.unitCost != null
          ? new Prisma.Decimal(data.unitCost)
          : record.unitCost,
      updatedAt: new Date(),
      inventoryItem: {
        ...item,
        sku: data.sku !== undefined ? data.sku : item.sku,
        description:
          data.description !== undefined ? data.description : item.description,
        stock: data.stock != null ? new Prisma.Decimal(data.stock) : item.stock,
        unit: data.unit ?? item.unit,
        lowStockAlert:
          data.lowStockAlert !== undefined
            ? data.lowStockAlert != null
              ? new Prisma.Decimal(data.lowStockAlert)
              : null
            : item.lowStockAlert,
      },
    }
    this.store.set(id, updated)
    return Promise.resolve(updated)
  }

  async delete(id: string, _branchId: string): Promise<void> {
    this.store.delete(id)
  }

  decrementStock(
    id: string,
    quantity: Prisma.Decimal
  ): Promise<Prisma.InventoryItemModel> {
    const record = this.store.get(id)!
    const item = record.inventoryItem!
    const newStock = new Prisma.Decimal(Number(item.stock) - Number(quantity))
    const updatedItem = { ...item, stock: newStock }
    this.store.set(id, { ...record, inventoryItem: updatedItem })
    return Promise.resolve(updatedItem)
  }
}
```

- [ ] **Step 3: in-memory-material-roll.repository.ts**

```typescript
// apps/api/src/inventory/infrastructure/in-memory-material-roll.repository.ts
import { randomUUID } from 'crypto'

import { InventoryType, Prisma } from '@glossops/database'

import type {
  MaterialRollRepositoryInterface,
  InventoryRecord,
  CreateMaterialRollData,
  UpdateMaterialRollData,
} from '@inventory/interfaces'

export class InMemoryMaterialRollRepository implements MaterialRollRepositoryInterface {
  constructor(private readonly store: Map<string, InventoryRecord>) {}

  create(data: CreateMaterialRollData): Promise<InventoryRecord> {
    const id = randomUUID()
    const record: InventoryRecord = {
      id,
      branchId: data.branchId,
      supplierId: data.supplierId ?? null,
      brandId: data.brandId ?? null,
      type: InventoryType.ROLL,
      name: data.name,
      unitCost: new Prisma.Decimal(data.unitCost ?? 0),
      createdAt: new Date(),
      updatedAt: new Date(),
      inventoryItem: null,
      materialRoll: {
        id,
        series: data.series,
        finish: data.finish,
        color: data.color,
        width: new Prisma.Decimal(data.width),
        remainingLength: new Prisma.Decimal(data.remainingLength),
        lotNumber: data.lotNumber ?? null,
      },
    }
    this.store.set(id, record)
    return Promise.resolve(record)
  }

  update(
    id: string,
    branchId: string,
    data: UpdateMaterialRollData
  ): Promise<InventoryRecord> {
    const record = this.store.get(id)!
    const roll = record.materialRoll!
    const updated: InventoryRecord = {
      ...record,
      branchId,
      supplierId:
        data.supplierId !== undefined ? data.supplierId : record.supplierId,
      brandId: data.brandId !== undefined ? data.brandId : record.brandId,
      name: data.name ?? record.name,
      unitCost:
        data.unitCost != null
          ? new Prisma.Decimal(data.unitCost)
          : record.unitCost,
      updatedAt: new Date(),
      materialRoll: {
        ...roll,
        series: data.series ?? roll.series,
        finish: data.finish ?? roll.finish,
        color: data.color ?? roll.color,
        width: data.width != null ? new Prisma.Decimal(data.width) : roll.width,
        remainingLength:
          data.remainingLength != null
            ? new Prisma.Decimal(data.remainingLength)
            : roll.remainingLength,
        lotNumber:
          data.lotNumber !== undefined ? data.lotNumber : roll.lotNumber,
      },
    }
    this.store.set(id, updated)
    return Promise.resolve(updated)
  }

  async delete(id: string, _branchId: string): Promise<void> {
    this.store.delete(id)
  }

  decrementLength(
    id: string,
    quantity: Prisma.Decimal
  ): Promise<Prisma.MaterialRollModel> {
    const record = this.store.get(id)!
    const roll = record.materialRoll!
    const newLength = new Prisma.Decimal(
      Number(roll.remainingLength) - Number(quantity)
    )
    const updatedRoll = { ...roll, remainingLength: newLength }
    this.store.set(id, { ...record, materialRoll: updatedRoll })
    return Promise.resolve(updatedRoll)
  }
}
```

- [ ] **Step 4: in-memory-inventory-usage.repository.ts**

`commitAll` uses three setter callbacks to access shared inventory/item/roll state without coupling to other repo classes directly.

```typescript
// apps/api/src/inventory/infrastructure/in-memory-inventory-usage.repository.ts
import { randomUUID } from 'crypto'

import { Prisma } from '@glossops/database'

import type {
  InventoryUsageRepositoryInterface,
  CommitUsagesResult,
  CreateInventoryUsageData,
  InventoryRecord,
} from '@inventory/interfaces'

export class InMemoryInventoryUsageRepository implements InventoryUsageRepositoryInterface {
  private store = new Map<string, Prisma.InventoryUsageModel>()
  private getInventoryRecord: (id: string) => Promise<InventoryRecord | null> =
    () => Promise.resolve(null)
  private decrementItemStock: (
    id: string,
    qty: Prisma.Decimal
  ) => Promise<Prisma.InventoryItemModel> = () => {
    throw new Error('setItemDecrementer not called')
  }
  private decrementRollLength: (
    id: string,
    qty: Prisma.Decimal
  ) => Promise<Prisma.MaterialRollModel> = () => {
    throw new Error('setRollDecrementer not called')
  }

  setInventoryGetter(
    fn: (id: string) => Promise<InventoryRecord | null>
  ): void {
    this.getInventoryRecord = fn
  }

  setItemDecrementer(
    fn: (id: string, qty: Prisma.Decimal) => Promise<Prisma.InventoryItemModel>
  ): void {
    this.decrementItemStock = fn
  }

  setRollDecrementer(
    fn: (id: string, qty: Prisma.Decimal) => Promise<Prisma.MaterialRollModel>
  ): void {
    this.decrementRollLength = fn
  }

  create(data: CreateInventoryUsageData): Promise<Prisma.InventoryUsageModel> {
    const usage: Prisma.InventoryUsageModel = {
      id: randomUUID(),
      workOrderId: data.workOrderId,
      inventoryId: data.inventoryId,
      quantityUsed: new Prisma.Decimal(data.quantityUsed),
      costAtUsage: new Prisma.Decimal(data.costAtUsage),
      createdAt: new Date(),
    }
    this.store.set(usage.id, usage)
    return Promise.resolve(usage)
  }

  findById(
    id: string,
    workOrderId: string
  ): Promise<Prisma.InventoryUsageModel | null> {
    const usage = this.store.get(id)
    if (!usage || usage.workOrderId !== workOrderId)
      return Promise.resolve(null)
    return Promise.resolve(usage)
  }

  findAllByWorkOrder(
    workOrderId: string
  ): Promise<Prisma.InventoryUsageModel[]> {
    return Promise.resolve(
      [...this.store.values()].filter(u => u.workOrderId === workOrderId)
    )
  }

  findAllByInventory(
    inventoryId: string
  ): Promise<Prisma.InventoryUsageModel[]> {
    return Promise.resolve(
      [...this.store.values()].filter(u => u.inventoryId === inventoryId)
    )
  }

  update(
    id: string,
    workOrderId: string,
    quantityUsed: Prisma.Decimal
  ): Promise<Prisma.InventoryUsageModel> {
    const usage = this.store.get(id)!
    const updated = { ...usage, quantityUsed }
    this.store.set(id, updated)
    return Promise.resolve(updated)
  }

  async deleteByWorkOrder(workOrderId: string): Promise<void> {
    for (const [id, u] of this.store) {
      if (u.workOrderId === workOrderId) this.store.delete(id)
    }
  }

  async commitAll(workOrderId: string): Promise<CommitUsagesResult> {
    const usages = [...this.store.values()].filter(
      u => u.workOrderId === workOrderId
    )
    const warnings: string[] = []

    for (const usage of usages) {
      const inv = await this.getInventoryRecord(usage.inventoryId)
      if (!inv) continue

      if (inv.inventoryItem) {
        const item = await this.decrementItemStock(
          usage.inventoryId,
          usage.quantityUsed
        )
        if (Number(item.stock) < 0) {
          warnings.push(
            `${inv.name}: stock insuficiente (${Number(item.stock)} ${inv.inventoryItem.unit})`
          )
        } else if (
          inv.inventoryItem.lowStockAlert !== null &&
          Number(item.stock) <= Number(inv.inventoryItem.lowStockAlert)
        ) {
          warnings.push(
            `${inv.name}: stock bajo (${Number(item.stock)} ${inv.inventoryItem.unit})`
          )
        }
      } else if (inv.materialRoll) {
        const roll = await this.decrementRollLength(
          usage.inventoryId,
          usage.quantityUsed
        )
        if (Number(roll.remainingLength) < 0) {
          warnings.push(
            `${inv.name}: longitud insuficiente (${Number(roll.remainingLength)}m)`
          )
        }
      }
    }

    return { warnings }
  }
}
```

- [ ] **Step 5: in-memory-service-defaults.repository.ts**

```typescript
// apps/api/src/inventory/infrastructure/in-memory-service-defaults.repository.ts
import { Prisma } from '@glossops/database'

import type {
  ServiceDefaultsRepositoryInterface,
  ServiceInventoryDefaults,
} from '@inventory/interfaces'

export class InMemoryServiceDefaultsRepository implements ServiceDefaultsRepositoryInterface {
  private store = new Map<string, ServiceInventoryDefaults>()

  seed(serviceId: string, inventoryId: string, defaultQuantity: number): void {
    this.store.set(serviceId, {
      inventoryId,
      defaultQuantity: new Prisma.Decimal(defaultQuantity),
    })
  }

  getInventoryDefaults(
    serviceId: string
  ): Promise<ServiceInventoryDefaults | null> {
    return Promise.resolve(this.store.get(serviceId) ?? null)
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/inventory/infrastructure/
python3 -c "
msg = '✨ feat(inventory): add in-memory repository implementations'
with open('/tmp/commit_msg.txt', 'w') as f:
    f.write(msg)
" && git commit -F /tmp/commit_msg.txt
```

---

## Task 6: InventoryService — TDD

**Files:**

- Create: `apps/api/src/inventory/inventory.service.spec.ts`
- Create: `apps/api/src/inventory/inventory.service.ts`

- [ ] **Step 1: Write the failing spec**

```typescript
// apps/api/src/inventory/inventory.service.spec.ts
import { ConflictException, NotFoundException } from '@nestjs/common'
import { Test } from '@nestjs/testing'

import { InventoryType } from '@glossops/database'

import { InMemoryInventoryUsageRepository } from './infrastructure/in-memory-inventory-usage.repository'
import { InMemoryInventoryItemRepository } from './infrastructure/in-memory-inventory-item.repository'
import { InMemoryMaterialRollRepository } from './infrastructure/in-memory-material-roll.repository'
import { InMemoryServiceDefaultsRepository } from './infrastructure/in-memory-service-defaults.repository'
import { InMemoryInventoryRepository } from './infrastructure/in-memory-inventory.repository'
import { InventoryService } from './inventory.service'
import {
  INVENTORY_ITEM_REPOSITORY,
  INVENTORY_REPOSITORY,
  INVENTORY_USAGE_REPOSITORY,
  MATERIAL_ROLL_REPOSITORY,
  SERVICE_DEFAULTS_REPOSITORY,
} from './inventory.tokens'

const BRANCH = 'branch-1'
const OTHER_BRANCH = 'branch-2'
const SVC = 'service-1'
const SVC_NO_INV = 'service-no-inv'
const WO = 'work-order-1'

describe('InventoryService', () => {
  let service: InventoryService
  let invRepo: InMemoryInventoryRepository
  let itemRepo: InMemoryInventoryItemRepository
  let rollRepo: InMemoryMaterialRollRepository
  let usageRepo: InMemoryInventoryUsageRepository
  let defaultsRepo: InMemoryServiceDefaultsRepository

  beforeEach(async () => {
    invRepo = new InMemoryInventoryRepository()
    itemRepo = new InMemoryInventoryItemRepository(invRepo.store)
    rollRepo = new InMemoryMaterialRollRepository(invRepo.store)
    usageRepo = new InMemoryInventoryUsageRepository()
    defaultsRepo = new InMemoryServiceDefaultsRepository()

    usageRepo.setInventoryGetter(id => invRepo.findByIdDirect(id))
    usageRepo.setItemDecrementer((id, qty) => itemRepo.decrementStock(id, qty))
    usageRepo.setRollDecrementer((id, qty) => rollRepo.decrementLength(id, qty))
    invRepo.setActiveUsagesChecker(async id => {
      const usages = await usageRepo.findAllByInventory(id)
      return usages.length > 0
    })

    const module = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: INVENTORY_REPOSITORY, useValue: invRepo },
        { provide: INVENTORY_ITEM_REPOSITORY, useValue: itemRepo },
        { provide: MATERIAL_ROLL_REPOSITORY, useValue: rollRepo },
        { provide: INVENTORY_USAGE_REPOSITORY, useValue: usageRepo },
        { provide: SERVICE_DEFAULTS_REPOSITORY, useValue: defaultsRepo },
      ],
    }).compile()

    service = module.get(InventoryService)
  })

  // ── InventoryItem CRUD ──────────────────────────────────────────────────

  describe('createItem', () => {
    it('creates an ITEM record with type ITEM', async () => {
      const record = await service.createItem(BRANCH, {
        name: 'Desengrasante',
        unit: 'lt',
        stock: 5,
      })
      expect(record.type).toBe(InventoryType.ITEM)
      expect(record.inventoryItem).not.toBeNull()
      expect(record.materialRoll).toBeNull()
      expect(Number(record.inventoryItem!.stock)).toBe(5)
    })
  })

  describe('updateItem', () => {
    it('updates name and stock', async () => {
      const created = await service.createItem(BRANCH, {
        name: 'A',
        unit: 'pza',
      })
      const updated = await service.updateItem(created.id, BRANCH, {
        name: 'B',
        stock: 10,
      })
      expect(updated.name).toBe('B')
      expect(Number(updated.inventoryItem!.stock)).toBe(10)
    })

    it('clears supplierId with null', async () => {
      const created = await service.createItem(BRANCH, {
        name: 'A',
        unit: 'pza',
        supplierId: 'sup-1',
      })
      const updated = await service.updateItem(created.id, BRANCH, {
        supplierId: null,
      })
      expect(updated.supplierId).toBeNull()
    })

    it('throws 404 when item not found', async () => {
      await expect(
        service.updateItem('nonexistent', BRANCH, { name: 'X' })
      ).rejects.toThrow(NotFoundException)
    })
  })

  describe('removeItem', () => {
    it('deletes item with no active usages', async () => {
      const created = await service.createItem(BRANCH, {
        name: 'A',
        unit: 'pza',
      })
      await service.removeItem(created.id, BRANCH)
      await expect(service.findOne(created.id, BRANCH)).rejects.toThrow(
        NotFoundException
      )
    })

    it('throws 409 when item has active usages', async () => {
      const created = await service.createItem(BRANCH, {
        name: 'A',
        unit: 'pza',
      })
      await usageRepo.create({
        workOrderId: WO,
        inventoryId: created.id,
        quantityUsed: 1,
        costAtUsage: 10,
      })
      await expect(service.removeItem(created.id, BRANCH)).rejects.toThrow(
        ConflictException
      )
    })

    it('throws 404 for item in another branch', async () => {
      const created = await service.createItem(BRANCH, {
        name: 'A',
        unit: 'pza',
      })
      await expect(
        service.removeItem(created.id, OTHER_BRANCH)
      ).rejects.toThrow(NotFoundException)
    })
  })

  // ── MaterialRoll CRUD ───────────────────────────────────────────────────

  describe('createRoll', () => {
    it('creates a ROLL record with type ROLL', async () => {
      const record = await service.createRoll(BRANCH, {
        name: 'Vinil Negro 1.52m',
        series: '1080',
        finish: 'Gloss',
        color: 'Jet Black',
        width: 1.52,
        remainingLength: 25,
      })
      expect(record.type).toBe(InventoryType.ROLL)
      expect(record.materialRoll).not.toBeNull()
      expect(record.inventoryItem).toBeNull()
      expect(Number(record.materialRoll!.remainingLength)).toBe(25)
    })
  })

  describe('removeRoll', () => {
    it('throws 409 when roll has active usages', async () => {
      const roll = await service.createRoll(BRANCH, {
        name: 'R',
        series: 'S',
        finish: 'F',
        color: 'C',
        width: 1.52,
        remainingLength: 10,
      })
      await usageRepo.create({
        workOrderId: WO,
        inventoryId: roll.id,
        quantityUsed: 2,
        costAtUsage: 50,
      })
      await expect(service.removeRoll(roll.id, BRANCH)).rejects.toThrow(
        ConflictException
      )
    })
  })

  // ── findAll ─────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('filters by type ITEM', async () => {
      await service.createItem(BRANCH, { name: 'Item', unit: 'pza' })
      await service.createRoll(BRANCH, {
        name: 'Roll',
        series: 'S',
        finish: 'F',
        color: 'C',
        width: 1.52,
        remainingLength: 5,
      })
      const result = await service.findAll(BRANCH, {
        type: InventoryType.ITEM,
        page: 1,
        limit: 20,
      })
      expect(result.data).toHaveLength(1)
      expect(result.data[0].type).toBe(InventoryType.ITEM)
    })

    it('filters lowStock=true for items below threshold', async () => {
      await service.createItem(BRANCH, {
        name: 'Low',
        unit: 'pza',
        stock: 2,
        lowStockAlert: 5,
      })
      await service.createItem(BRANCH, {
        name: 'Ok',
        unit: 'pza',
        stock: 10,
        lowStockAlert: 5,
      })
      const result = await service.findAll(BRANCH, {
        lowStock: true,
        page: 1,
        limit: 20,
      })
      expect(result.data).toHaveLength(1)
      expect(result.data[0].name).toBe('Low')
    })

    it('does not return inventory from another branch', async () => {
      await service.createItem(OTHER_BRANCH, { name: 'Other', unit: 'pza' })
      const result = await service.findAll(BRANCH, { page: 1, limit: 20 })
      expect(result.data).toHaveLength(0)
    })
  })

  // ── InventoryUsage lifecycle ────────────────────────────────────────────

  describe('maybeCreateUsage', () => {
    it('does nothing when service has no default inventory', async () => {
      await service.maybeCreateUsage(WO, SVC_NO_INV)
      const usages = await usageRepo.findAllByWorkOrder(WO)
      expect(usages).toHaveLength(0)
    })

    it('creates usage with costAtUsage snapshot when default exists', async () => {
      const item = await service.createItem(BRANCH, {
        name: 'Polish',
        unit: 'ml',
        unitCost: 25,
      })
      defaultsRepo.seed(SVC, item.id, 50)

      await service.maybeCreateUsage(WO, SVC)

      const usages = await usageRepo.findAllByWorkOrder(WO)
      expect(usages).toHaveLength(1)
      expect(Number(usages[0].quantityUsed)).toBe(50)
      expect(Number(usages[0].costAtUsage)).toBe(25)
    })
  })

  describe('updateUsage', () => {
    it('updates quantityUsed', async () => {
      const item = await service.createItem(BRANCH, { name: 'A', unit: 'pza' })
      defaultsRepo.seed(SVC, item.id, 1)
      await service.maybeCreateUsage(WO, SVC)
      const [usage] = await usageRepo.findAllByWorkOrder(WO)

      const updated = await service.updateUsage(WO, usage.id, 3.5)
      expect(Number(updated.quantityUsed)).toBe(3.5)
    })

    it('throws 404 when usage does not belong to the work order', async () => {
      const item = await service.createItem(BRANCH, { name: 'A', unit: 'pza' })
      defaultsRepo.seed(SVC, item.id, 1)
      await service.maybeCreateUsage('other-wo', SVC)
      const [usage] = await usageRepo.findAllByWorkOrder('other-wo')

      await expect(service.updateUsage(WO, usage.id, 2)).rejects.toThrow(
        NotFoundException
      )
    })
  })

  describe('commitUsages', () => {
    it('decrements stock for InventoryItem', async () => {
      const item = await service.createItem(BRANCH, {
        name: 'Oil',
        unit: 'lt',
        stock: 10,
      })
      await usageRepo.create({
        workOrderId: WO,
        inventoryId: item.id,
        quantityUsed: 3,
        costAtUsage: 50,
      })

      await service.commitUsages(WO)

      const updated = invRepo.store.get(item.id)!
      expect(Number(updated.inventoryItem!.stock)).toBe(7)
    })

    it('decrements remainingLength for MaterialRoll', async () => {
      const roll = await service.createRoll(BRANCH, {
        name: 'Wrap',
        series: 'S',
        finish: 'F',
        color: 'C',
        width: 1.52,
        remainingLength: 20,
      })
      await usageRepo.create({
        workOrderId: WO,
        inventoryId: roll.id,
        quantityUsed: 4.5,
        costAtUsage: 200,
      })

      const result = await service.commitUsages(WO)
      expect(result.warnings).toHaveLength(0)
      const updated = invRepo.store.get(roll.id)!
      expect(Number(updated.materialRoll!.remainingLength)).toBe(15.5)
    })

    it('returns warning when stock goes negative', async () => {
      const item = await service.createItem(BRANCH, {
        name: 'Scarce',
        unit: 'pza',
        stock: 1,
      })
      await usageRepo.create({
        workOrderId: WO,
        inventoryId: item.id,
        quantityUsed: 5,
        costAtUsage: 10,
      })

      const result = await service.commitUsages(WO)
      expect(result.warnings).toHaveLength(1)
      expect(result.warnings[0]).toContain('Scarce')
    })

    it('returns warning when stock falls to or below lowStockAlert', async () => {
      const item = await service.createItem(BRANCH, {
        name: 'LowStock',
        unit: 'pza',
        stock: 5,
        lowStockAlert: 3,
      })
      await usageRepo.create({
        workOrderId: WO,
        inventoryId: item.id,
        quantityUsed: 2,
        costAtUsage: 10,
      })

      const result = await service.commitUsages(WO)
      expect(result.warnings).toHaveLength(1)
      expect(result.warnings[0]).toContain('LowStock')
    })

    it('completes with no warnings when stock is fine', async () => {
      const item = await service.createItem(BRANCH, {
        name: 'Plenty',
        unit: 'pza',
        stock: 100,
        lowStockAlert: 5,
      })
      await usageRepo.create({
        workOrderId: WO,
        inventoryId: item.id,
        quantityUsed: 1,
        costAtUsage: 10,
      })

      const result = await service.commitUsages(WO)
      expect(result.warnings).toHaveLength(0)
    })
  })

  describe('deleteUsagesByWorkOrder', () => {
    it('removes all usages without touching stock', async () => {
      const item = await service.createItem(BRANCH, {
        name: 'A',
        unit: 'pza',
        stock: 10,
      })
      await usageRepo.create({
        workOrderId: WO,
        inventoryId: item.id,
        quantityUsed: 3,
        costAtUsage: 50,
      })

      await service.deleteUsagesByWorkOrder(WO)

      const usages = await usageRepo.findAllByWorkOrder(WO)
      expect(usages).toHaveLength(0)
      expect(Number(invRepo.store.get(item.id)!.inventoryItem!.stock)).toBe(10)
    })
  })
})
```

- [ ] **Step 2: Run the spec to confirm it fails**

```bash
cd apps/api && npx jest inventory.service.spec --no-coverage 2>&1 | tail -20
```

Expected: `FAIL src/inventory/inventory.service.spec.ts` with `Cannot find module './inventory.service'`.

- [ ] **Step 3: Write inventory.service.ts**

```typescript
// apps/api/src/inventory/inventory.service.ts
import {
  ConflictException,
  Injectable,
  Inject,
  NotFoundException,
} from '@nestjs/common'

import { type Prisma } from '@glossops/database'

import type {
  CommitUsagesResult,
  InventoryItemRepositoryInterface,
  InventoryPage,
  InventoryRecord,
  InventoryRepositoryInterface,
  InventoryUsageRepositoryInterface,
  MaterialRollRepositoryInterface,
  ServiceDefaultsRepositoryInterface,
} from '@inventory/interfaces'
import type {
  CreateInventoryItemDto,
  CreateMaterialRollDto,
  ListInventoryDto,
  UpdateInventoryItemDto,
  UpdateMaterialRollDto,
} from './dto'
import {
  INVENTORY_ITEM_REPOSITORY,
  INVENTORY_REPOSITORY,
  INVENTORY_USAGE_REPOSITORY,
  MATERIAL_ROLL_REPOSITORY,
  SERVICE_DEFAULTS_REPOSITORY,
} from './inventory.tokens'

@Injectable()
export class InventoryService {
  constructor(
    @Inject(INVENTORY_REPOSITORY)
    private readonly inventory: InventoryRepositoryInterface,
    @Inject(INVENTORY_ITEM_REPOSITORY)
    private readonly inventoryItems: InventoryItemRepositoryInterface,
    @Inject(MATERIAL_ROLL_REPOSITORY)
    private readonly materialRolls: MaterialRollRepositoryInterface,
    @Inject(INVENTORY_USAGE_REPOSITORY)
    private readonly usages: InventoryUsageRepositoryInterface,
    @Inject(SERVICE_DEFAULTS_REPOSITORY)
    private readonly serviceDefaults: ServiceDefaultsRepositoryInterface
  ) {}

  findAll(branchId: string, dto: ListInventoryDto): Promise<InventoryPage> {
    return this.inventory.findAll(branchId, {
      type: dto.type,
      supplierId: dto.supplierId,
      brandId: dto.brandId,
      lowStock: dto.lowStock,
      page: dto.page ?? 1,
      limit: dto.limit ?? 20,
    })
  }

  async findOne(id: string, branchId: string): Promise<InventoryRecord> {
    const record = await this.inventory.findById(id, branchId)
    if (!record) throw new NotFoundException({ error: 'inventory_not_found' })
    return record
  }

  createItem(
    branchId: string,
    dto: CreateInventoryItemDto
  ): Promise<InventoryRecord> {
    return this.inventoryItems.create({
      branchId,
      name: dto.name,
      supplierId: dto.supplierId,
      brandId: dto.brandId,
      unitCost: dto.unitCost,
      sku: dto.sku,
      description: dto.description,
      stock: dto.stock,
      unit: dto.unit,
      lowStockAlert: dto.lowStockAlert,
    })
  }

  async updateItem(
    id: string,
    branchId: string,
    dto: UpdateInventoryItemDto
  ): Promise<InventoryRecord> {
    await this.findOne(id, branchId)
    return this.inventoryItems.update(id, branchId, dto)
  }

  async removeItem(id: string, branchId: string): Promise<void> {
    await this.findOne(id, branchId)
    const inUse = await this.inventory.hasActiveUsages(id)
    if (inUse) throw new ConflictException({ error: 'inventory_in_use' })
    return this.inventoryItems.delete(id, branchId)
  }

  createRoll(
    branchId: string,
    dto: CreateMaterialRollDto
  ): Promise<InventoryRecord> {
    return this.materialRolls.create({
      branchId,
      name: dto.name,
      supplierId: dto.supplierId,
      brandId: dto.brandId,
      unitCost: dto.unitCost,
      series: dto.series,
      finish: dto.finish,
      color: dto.color,
      width: dto.width,
      remainingLength: dto.remainingLength,
      lotNumber: dto.lotNumber,
    })
  }

  async updateRoll(
    id: string,
    branchId: string,
    dto: UpdateMaterialRollDto
  ): Promise<InventoryRecord> {
    await this.findOne(id, branchId)
    return this.materialRolls.update(id, branchId, dto)
  }

  async removeRoll(id: string, branchId: string): Promise<void> {
    await this.findOne(id, branchId)
    const inUse = await this.inventory.hasActiveUsages(id)
    if (inUse) throw new ConflictException({ error: 'inventory_in_use' })
    return this.materialRolls.delete(id, branchId)
  }

  async findUsages(
    id: string,
    branchId: string
  ): Promise<Prisma.InventoryUsageModel[]> {
    await this.findOne(id, branchId)
    return this.usages.findAllByInventory(id)
  }

  async maybeCreateUsage(
    workOrderId: string,
    serviceId: string
  ): Promise<void> {
    const defaults = await this.serviceDefaults.getInventoryDefaults(serviceId)
    if (!defaults) return

    const inv = await this.inventory.findByIdDirect(defaults.inventoryId)
    if (!inv) return

    await this.usages.create({
      workOrderId,
      inventoryId: defaults.inventoryId,
      quantityUsed: Number(defaults.defaultQuantity),
      costAtUsage: Number(inv.unitCost),
    })
  }

  async updateUsage(
    workOrderId: string,
    usageId: string,
    quantityUsed: number
  ): Promise<Prisma.InventoryUsageModel> {
    const usage = await this.usages.findById(usageId, workOrderId)
    if (!usage)
      throw new NotFoundException({ error: 'inventory_usage_not_found' })
    return this.usages.update(
      usageId,
      workOrderId,
      new Prisma.Decimal(quantityUsed)
    )
  }

  commitUsages(workOrderId: string): Promise<CommitUsagesResult> {
    return this.usages.commitAll(workOrderId)
  }

  deleteUsagesByWorkOrder(workOrderId: string): Promise<void> {
    return this.usages.deleteByWorkOrder(workOrderId)
  }
}
```

`findByIdDirect` is a method on `InMemoryInventoryRepository` (and `PrismaInventoryRepository`) that bypasses branch scoping — used only internally in `maybeCreateUsage` where we already trust the serviceId/inventoryId linkage. Add it to `InventoryRepositoryInterface`:

```typescript
// In inventory.repository.interface.ts, add to the interface:
findByIdDirect(id: string): Promise<InventoryRecord | null>
```

Also add the Prisma implementation in `PrismaInventoryRepository` (Task 7):

```typescript
findByIdDirect(id: string): Promise<InventoryRecord | null> {
  return this.prisma.inventory.findUnique({
    where: { id },
    include: { inventoryItem: true, materialRoll: true },
  }) as Promise<InventoryRecord | null>
}
```

- [ ] **Step 4: Run the spec to confirm it passes**

```bash
cd apps/api && npx jest inventory.service.spec --no-coverage 2>&1 | tail -20
```

Expected: `PASS src/inventory/inventory.service.spec.ts` with all tests passing.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/inventory/inventory.service.ts apps/api/src/inventory/inventory.service.spec.ts apps/api/src/inventory/interfaces/inventory.repository.interface.ts
python3 -c "
msg = '✨ feat(inventory): add InventoryService with full CRUD and usage lifecycle'
with open('/tmp/commit_msg.txt', 'w') as f:
    f.write(msg)
" && git commit -F /tmp/commit_msg.txt
```

---

## Task 7: Prisma repositories

**Files:**

- Create: `apps/api/src/inventory/infrastructure/prisma-inventory.repository.ts`
- Create: `apps/api/src/inventory/infrastructure/prisma-inventory-item.repository.ts`
- Create: `apps/api/src/inventory/infrastructure/prisma-material-roll.repository.ts`
- Create: `apps/api/src/inventory/infrastructure/prisma-inventory-usage.repository.ts`
- Create: `apps/api/src/inventory/infrastructure/prisma-service-defaults.repository.ts`

- [ ] **Step 1: prisma-inventory.repository.ts**

```typescript
// apps/api/src/inventory/infrastructure/prisma-inventory.repository.ts
import { Injectable } from '@nestjs/common'

import { InventoryType, WorkOrderStatus } from '@glossops/database'

import { PrismaService } from '@prisma'
import type {
  InventoryRepositoryInterface,
  InventoryRecord,
  InventoryPage,
  InventoryQuery,
} from '@inventory/interfaces'

@Injectable()
export class PrismaInventoryRepository implements InventoryRepositoryInterface {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string, branchId: string): Promise<InventoryRecord | null> {
    return this.prisma.inventory.findFirst({
      where: { id, branchId },
      include: { inventoryItem: true, materialRoll: true },
    }) as Promise<InventoryRecord | null>
  }

  findByIdDirect(id: string): Promise<InventoryRecord | null> {
    return this.prisma.inventory.findUnique({
      where: { id },
      include: { inventoryItem: true, materialRoll: true },
    }) as Promise<InventoryRecord | null>
  }

  async findAll(
    branchId: string,
    query: InventoryQuery
  ): Promise<InventoryPage> {
    const where: Record<string, unknown> = { branchId }
    if (query.type) where.type = query.type
    if (query.supplierId) where.supplierId = query.supplierId
    if (query.brandId) where.brandId = query.brandId
    if (query.lowStock) {
      where.type = InventoryType.ITEM
      where.inventoryItem = {
        stock: { lte: this.prisma.inventoryItem.fields.lowStockAlert },
        lowStockAlert: { not: null },
      }
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.inventory.findMany({
        where,
        include: { inventoryItem: true, materialRoll: true },
        orderBy: { name: 'asc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.inventory.count({ where }),
    ])

    const totalPages = total === 0 ? 0 : Math.ceil(total / query.limit)
    return {
      data: data as InventoryRecord[],
      meta: {
        total,
        totalPages,
        page: query.page,
        limit: query.limit,
        hasNext: query.page < totalPages,
        hasPrev: query.page > 1,
      },
    }
  }

  async hasActiveUsages(id: string): Promise<boolean> {
    const usage = await this.prisma.inventoryUsage.findFirst({
      where: {
        inventoryId: id,
        workOrder: {
          status: {
            notIn: [WorkOrderStatus.COMPLETED, WorkOrderStatus.CANCELLED],
          },
        },
      },
    })
    return usage !== null
  }
}
```

**Note:** The `lowStock` filter uses a raw column comparison. If Prisma doesn't support `{ lte: this.prisma.inventoryItem.fields.lowStockAlert }` for a field-to-field comparison, use a raw query instead:

```typescript
if (query.lowStock) {
  // Use $queryRaw or adjust to a raw SQL subquery if Prisma does not support field-to-field lte
  where.type = InventoryType.ITEM
  where.inventoryItem = { lowStockAlert: { not: null } }
  // Post-filter in application layer after findMany if needed:
  // data = (data as InventoryRecord[]).filter(r =>
  //   r.inventoryItem && r.inventoryItem.lowStockAlert !== null &&
  //   Number(r.inventoryItem.stock) <= Number(r.inventoryItem.lowStockAlert)
  // )
}
```

For simplicity, implement the post-filter approach:

```typescript
async findAll(branchId: string, query: InventoryQuery): Promise<InventoryPage> {
  const where: Record<string, unknown> = { branchId }
  if (query.type) where.type = query.type
  if (query.supplierId) where.supplierId = query.supplierId
  if (query.brandId) where.brandId = query.brandId
  if (query.lowStock) where.type = InventoryType.ITEM

  const [allData, total] = await this.prisma.$transaction([
    this.prisma.inventory.findMany({
      where,
      include: { inventoryItem: true, materialRoll: true },
      orderBy: { name: 'asc' },
    }),
    this.prisma.inventory.count({ where }),
  ])

  let data = allData as InventoryRecord[]
  if (query.lowStock) {
    data = data.filter(
      r =>
        r.inventoryItem?.lowStockAlert !== null &&
        r.inventoryItem?.lowStockAlert !== undefined &&
        Number(r.inventoryItem.stock) <= Number(r.inventoryItem.lowStockAlert)
    )
  }

  const filteredTotal = query.lowStock ? data.length : total
  const totalPages = filteredTotal === 0 ? 0 : Math.ceil(filteredTotal / query.limit)
  const sliced = data.slice((query.page - 1) * query.limit, query.page * query.limit)

  return {
    data: sliced,
    meta: {
      total: filteredTotal,
      totalPages,
      page: query.page,
      limit: query.limit,
      hasNext: query.page < totalPages,
      hasPrev: query.page > 1,
    },
  }
}
```

- [ ] **Step 2: prisma-inventory-item.repository.ts**

Uses `$transaction` to create both the `Inventory` base and `InventoryItem` extension atomically.

```typescript
// apps/api/src/inventory/infrastructure/prisma-inventory-item.repository.ts
import { Injectable } from '@nestjs/common'

import { InventoryType, type Prisma } from '@glossops/database'

import { PrismaService } from '@prisma'
import type {
  InventoryItemRepositoryInterface,
  InventoryRecord,
  CreateInventoryItemData,
  UpdateInventoryItemData,
} from '@inventory/interfaces'

@Injectable()
export class PrismaInventoryItemRepository implements InventoryItemRepositoryInterface {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateInventoryItemData): Promise<InventoryRecord> {
    return this.prisma.$transaction(async tx => {
      const base = await tx.inventory.create({
        data: {
          branchId: data.branchId,
          supplierId: data.supplierId,
          brandId: data.brandId,
          type: InventoryType.ITEM,
          name: data.name,
          unitCost: data.unitCost ?? 0,
        },
      })
      const item = await tx.inventoryItem.create({
        data: {
          id: base.id,
          sku: data.sku,
          description: data.description,
          stock: data.stock ?? 0,
          unit: data.unit,
          lowStockAlert: data.lowStockAlert,
        },
      })
      return { ...base, inventoryItem: item, materialRoll: null }
    })
  }

  update(
    id: string,
    _branchId: string,
    data: UpdateInventoryItemData
  ): Promise<InventoryRecord> {
    return this.prisma.$transaction(async tx => {
      const base = await tx.inventory.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.supplierId !== undefined && { supplierId: data.supplierId }),
          ...(data.brandId !== undefined && { brandId: data.brandId }),
          ...(data.unitCost !== undefined && { unitCost: data.unitCost }),
        },
      })
      const item = await tx.inventoryItem.update({
        where: { id },
        data: {
          ...(data.sku !== undefined && { sku: data.sku }),
          ...(data.description !== undefined && {
            description: data.description,
          }),
          ...(data.stock !== undefined && { stock: data.stock }),
          ...(data.unit !== undefined && { unit: data.unit }),
          ...(data.lowStockAlert !== undefined && {
            lowStockAlert: data.lowStockAlert,
          }),
        },
      })
      return { ...base, inventoryItem: item, materialRoll: null }
    })
  }

  async delete(id: string, _branchId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.inventoryItem.delete({ where: { id } }),
      this.prisma.inventory.delete({ where: { id } }),
    ])
  }

  decrementStock(
    id: string,
    quantity: Prisma.Decimal
  ): Promise<Prisma.InventoryItemModel> {
    return this.prisma.inventoryItem.update({
      where: { id },
      data: { stock: { decrement: quantity } },
    })
  }
}
```

- [ ] **Step 3: prisma-material-roll.repository.ts**

```typescript
// apps/api/src/inventory/infrastructure/prisma-material-roll.repository.ts
import { Injectable } from '@nestjs/common'

import { InventoryType, type Prisma } from '@glossops/database'

import { PrismaService } from '@prisma'
import type {
  MaterialRollRepositoryInterface,
  InventoryRecord,
  CreateMaterialRollData,
  UpdateMaterialRollData,
} from '@inventory/interfaces'

@Injectable()
export class PrismaMaterialRollRepository implements MaterialRollRepositoryInterface {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateMaterialRollData): Promise<InventoryRecord> {
    return this.prisma.$transaction(async tx => {
      const base = await tx.inventory.create({
        data: {
          branchId: data.branchId,
          supplierId: data.supplierId,
          brandId: data.brandId,
          type: InventoryType.ROLL,
          name: data.name,
          unitCost: data.unitCost ?? 0,
        },
      })
      const roll = await tx.materialRoll.create({
        data: {
          id: base.id,
          series: data.series,
          finish: data.finish,
          color: data.color,
          width: data.width,
          remainingLength: data.remainingLength,
          lotNumber: data.lotNumber,
        },
      })
      return { ...base, inventoryItem: null, materialRoll: roll }
    })
  }

  update(
    id: string,
    _branchId: string,
    data: UpdateMaterialRollData
  ): Promise<InventoryRecord> {
    return this.prisma.$transaction(async tx => {
      const base = await tx.inventory.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.supplierId !== undefined && { supplierId: data.supplierId }),
          ...(data.brandId !== undefined && { brandId: data.brandId }),
          ...(data.unitCost !== undefined && { unitCost: data.unitCost }),
        },
      })
      const roll = await tx.materialRoll.update({
        where: { id },
        data: {
          ...(data.series !== undefined && { series: data.series }),
          ...(data.finish !== undefined && { finish: data.finish }),
          ...(data.color !== undefined && { color: data.color }),
          ...(data.width !== undefined && { width: data.width }),
          ...(data.remainingLength !== undefined && {
            remainingLength: data.remainingLength,
          }),
          ...(data.lotNumber !== undefined && { lotNumber: data.lotNumber }),
        },
      })
      return { ...base, inventoryItem: null, materialRoll: roll }
    })
  }

  async delete(id: string, _branchId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.materialRoll.delete({ where: { id } }),
      this.prisma.inventory.delete({ where: { id } }),
    ])
  }

  decrementLength(
    id: string,
    quantity: Prisma.Decimal
  ): Promise<Prisma.MaterialRollModel> {
    return this.prisma.materialRoll.update({
      where: { id },
      data: { remainingLength: { decrement: quantity } },
    })
  }
}
```

- [ ] **Step 4: prisma-inventory-usage.repository.ts**

`commitAll` runs the full stock-decrement logic in a single `$transaction`.

```typescript
// apps/api/src/inventory/infrastructure/prisma-inventory-usage.repository.ts
import { Injectable } from '@nestjs/common'

import { InventoryType, type Prisma } from '@glossops/database'

import { PrismaService } from '@prisma'
import type {
  InventoryUsageRepositoryInterface,
  CommitUsagesResult,
  CreateInventoryUsageData,
} from '@inventory/interfaces'

@Injectable()
export class PrismaInventoryUsageRepository implements InventoryUsageRepositoryInterface {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateInventoryUsageData): Promise<Prisma.InventoryUsageModel> {
    return this.prisma.inventoryUsage.create({
      data: {
        workOrderId: data.workOrderId,
        inventoryId: data.inventoryId,
        quantityUsed: data.quantityUsed,
        costAtUsage: data.costAtUsage,
      },
    })
  }

  findById(
    id: string,
    workOrderId: string
  ): Promise<Prisma.InventoryUsageModel | null> {
    return this.prisma.inventoryUsage.findFirst({ where: { id, workOrderId } })
  }

  findAllByWorkOrder(
    workOrderId: string
  ): Promise<Prisma.InventoryUsageModel[]> {
    return this.prisma.inventoryUsage.findMany({ where: { workOrderId } })
  }

  findAllByInventory(
    inventoryId: string
  ): Promise<Prisma.InventoryUsageModel[]> {
    return this.prisma.inventoryUsage.findMany({ where: { inventoryId } })
  }

  update(
    id: string,
    _workOrderId: string,
    quantityUsed: Prisma.Decimal
  ): Promise<Prisma.InventoryUsageModel> {
    return this.prisma.inventoryUsage.update({
      where: { id },
      data: { quantityUsed },
    })
  }

  async deleteByWorkOrder(workOrderId: string): Promise<void> {
    await this.prisma.inventoryUsage.deleteMany({ where: { workOrderId } })
  }

  async commitAll(workOrderId: string): Promise<CommitUsagesResult> {
    return this.prisma.$transaction(async tx => {
      const usages = await tx.inventoryUsage.findMany({
        where: { workOrderId },
      })
      const warnings: string[] = []

      for (const usage of usages) {
        const inv = await tx.inventory.findUnique({
          where: { id: usage.inventoryId },
          include: { inventoryItem: true, materialRoll: true },
        })
        if (!inv) continue

        if (inv.type === InventoryType.ITEM && inv.inventoryItem) {
          const updated = await tx.inventoryItem.update({
            where: { id: inv.id },
            data: { stock: { decrement: usage.quantityUsed } },
          })
          if (Number(updated.stock) < 0) {
            warnings.push(
              `${inv.name}: stock insuficiente (${Number(updated.stock)} ${inv.inventoryItem.unit})`
            )
          } else if (
            inv.inventoryItem.lowStockAlert !== null &&
            updated.stock.lte(inv.inventoryItem.lowStockAlert)
          ) {
            warnings.push(
              `${inv.name}: stock bajo (${Number(updated.stock)} ${inv.inventoryItem.unit})`
            )
          }
        } else if (inv.type === InventoryType.ROLL && inv.materialRoll) {
          const updated = await tx.materialRoll.update({
            where: { id: inv.id },
            data: { remainingLength: { decrement: usage.quantityUsed } },
          })
          if (Number(updated.remainingLength) < 0) {
            warnings.push(
              `${inv.name}: longitud insuficiente (${Number(updated.remainingLength)}m)`
            )
          }
        }
      }

      return { warnings }
    })
  }
}
```

- [ ] **Step 5: prisma-service-defaults.repository.ts**

```typescript
// apps/api/src/inventory/infrastructure/prisma-service-defaults.repository.ts
import { Injectable } from '@nestjs/common'

import { Prisma } from '@glossops/database'

import { PrismaService } from '@prisma'
import type {
  ServiceDefaultsRepositoryInterface,
  ServiceInventoryDefaults,
} from '@inventory/interfaces'

@Injectable()
export class PrismaServiceDefaultsRepository implements ServiceDefaultsRepositoryInterface {
  constructor(private readonly prisma: PrismaService) {}

  async getInventoryDefaults(
    serviceId: string
  ): Promise<ServiceInventoryDefaults | null> {
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      select: { defaultInventoryId: true, defaultQuantity: true },
    })
    if (!service?.defaultInventoryId) return null
    return {
      inventoryId: service.defaultInventoryId,
      defaultQuantity: service.defaultQuantity ?? new Prisma.Decimal(1),
    }
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/inventory/infrastructure/prisma-*.ts
python3 -c "
msg = '✨ feat(inventory): add Prisma repository implementations'
with open('/tmp/commit_msg.txt', 'w') as f:
    f.write(msg)
" && git commit -F /tmp/commit_msg.txt
```

---

## Task 8: Controllers + specs

**Files:**

- Create: `apps/api/src/inventory/inventory.controller.ts`
- Create: `apps/api/src/inventory/inventory.controller.spec.ts`
- Create: `apps/api/src/inventory/inventory-items.controller.ts`
- Create: `apps/api/src/inventory/inventory-items.controller.spec.ts`
- Create: `apps/api/src/inventory/material-rolls.controller.ts`
- Create: `apps/api/src/inventory/material-rolls.controller.spec.ts`

- [ ] **Step 1: inventory.controller.ts — GET /inventory and GET /inventory/:id/usages**

```typescript
// apps/api/src/inventory/inventory.controller.ts
import { Controller, Get, Param, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'

import { CurrentAccount, Roles } from '@auth/decorators'
import type { AuthContext } from '@auth/interfaces'

import { ListInventoryDto } from './dto'
import { InventoryService } from './inventory.service'

@ApiTags('Inventory')
@ApiBearerAuth()
@Controller('inventory')
export class InventoryController {
  constructor(private readonly service: InventoryService) {}

  @Get()
  @ApiOperation({ summary: 'List all inventory for the branch' })
  findAll(
    @CurrentAccount() account: AuthContext,
    @Query() dto: ListInventoryDto
  ) {
    return this.service.findAll(account.branchId!, dto)
  }

  @Get(':id/usages')
  @ApiOperation({ summary: 'List usages for an inventory item' })
  findUsages(@CurrentAccount() account: AuthContext, @Param('id') id: string) {
    return this.service.findUsages(id, account.branchId!)
  }
}
```

- [ ] **Step 2: inventory.controller.spec.ts**

```typescript
// apps/api/src/inventory/inventory.controller.spec.ts
import { Test } from '@nestjs/testing'

import { Role } from '@glossops/database'

import type { AuthContext } from '@auth/interfaces'

import { InventoryController } from './inventory.controller'
import { InventoryService } from './inventory.service'

const makeAccount = (role: Role): AuthContext => ({
  sub: 'acc-1',
  memberId: 'mem-1',
  email: 'test@test.com',
  branchId: 'branch-1',
  organizationId: 'org-1',
  role,
})

describe('InventoryController', () => {
  let controller: InventoryController
  let service: { findAll: jest.Mock; findUsages: jest.Mock }

  beforeEach(async () => {
    service = {
      findAll: jest.fn().mockResolvedValue({ data: [], meta: {} }),
      findUsages: jest.fn().mockResolvedValue([]),
    }
    const module = await Test.createTestingModule({
      controllers: [InventoryController],
      providers: [{ provide: InventoryService, useValue: service }],
    }).compile()
    controller = module.get(InventoryController)
  })

  describe('findAll', () => {
    it('passes branchId from account', async () => {
      const dto = {} as never
      await controller.findAll(makeAccount(Role.OWNER), dto)
      expect(service.findAll).toHaveBeenCalledWith('branch-1', dto)
    })
  })

  describe('findUsages', () => {
    it('passes id and branchId from account', async () => {
      await controller.findUsages(makeAccount(Role.MANAGER), 'inv-1')
      expect(service.findUsages).toHaveBeenCalledWith('inv-1', 'branch-1')
    })
  })
})
```

- [ ] **Step 3: inventory-items.controller.ts**

```typescript
// apps/api/src/inventory/inventory-items.controller.ts
import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'

import { Role } from '@glossops/database'

import { CurrentAccount, Roles } from '@auth/decorators'
import type { AuthContext } from '@auth/interfaces'

import { CreateInventoryItemDto, UpdateInventoryItemDto } from './dto'
import { InventoryService } from './inventory.service'

@ApiTags('Inventory')
@ApiBearerAuth()
@Controller('inventory/items')
export class InventoryItemsController {
  constructor(private readonly service: InventoryService) {}

  @Post()
  @HttpCode(201)
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Create an inventory item' })
  create(
    @CurrentAccount() account: AuthContext,
    @Body() dto: CreateInventoryItemDto
  ) {
    return this.service.createItem(account.branchId!, dto)
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Update an inventory item' })
  update(
    @CurrentAccount() account: AuthContext,
    @Param('id') id: string,
    @Body() dto: UpdateInventoryItemDto
  ) {
    return this.service.updateItem(id, account.branchId!, dto)
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Delete an inventory item' })
  remove(@CurrentAccount() account: AuthContext, @Param('id') id: string) {
    return this.service.removeItem(id, account.branchId!)
  }
}
```

- [ ] **Step 4: inventory-items.controller.spec.ts**

```typescript
// apps/api/src/inventory/inventory-items.controller.spec.ts
import { Test } from '@nestjs/testing'

import { Role } from '@glossops/database'

import type { AuthContext } from '@auth/interfaces'

import { InventoryItemsController } from './inventory-items.controller'
import { InventoryService } from './inventory.service'

const makeAccount = (role: Role): AuthContext => ({
  sub: 'acc-1',
  memberId: 'mem-1',
  email: 'test@test.com',
  branchId: 'branch-1',
  organizationId: 'org-1',
  role,
})

describe('InventoryItemsController', () => {
  let controller: InventoryItemsController
  let service: {
    createItem: jest.Mock
    updateItem: jest.Mock
    removeItem: jest.Mock
  }

  beforeEach(async () => {
    service = {
      createItem: jest.fn().mockResolvedValue({}),
      updateItem: jest.fn().mockResolvedValue({}),
      removeItem: jest.fn().mockResolvedValue(undefined),
    }
    const module = await Test.createTestingModule({
      controllers: [InventoryItemsController],
      providers: [{ provide: InventoryService, useValue: service }],
    }).compile()
    controller = module.get(InventoryItemsController)
  })

  it('create passes branchId from account', async () => {
    const dto = { name: 'A', unit: 'pza' } as never
    await controller.create(makeAccount(Role.OWNER), dto)
    expect(service.createItem).toHaveBeenCalledWith('branch-1', dto)
  })

  it('update passes id and branchId from account', async () => {
    await controller.update(makeAccount(Role.MANAGER), 'inv-1', {
      name: 'B',
    } as never)
    expect(service.updateItem).toHaveBeenCalledWith('inv-1', 'branch-1', {
      name: 'B',
    })
  })

  it('remove passes id and branchId from account', async () => {
    await controller.remove(makeAccount(Role.OWNER), 'inv-1')
    expect(service.removeItem).toHaveBeenCalledWith('inv-1', 'branch-1')
  })
})
```

- [ ] **Step 5: material-rolls.controller.ts**

```typescript
// apps/api/src/inventory/material-rolls.controller.ts
import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'

import { Role } from '@glossops/database'

import { CurrentAccount, Roles } from '@auth/decorators'
import type { AuthContext } from '@auth/interfaces'

import { CreateMaterialRollDto, UpdateMaterialRollDto } from './dto'
import { InventoryService } from './inventory.service'

@ApiTags('Inventory')
@ApiBearerAuth()
@Controller('inventory/material-rolls')
export class MaterialRollsController {
  constructor(private readonly service: InventoryService) {}

  @Post()
  @HttpCode(201)
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Create a material roll' })
  create(
    @CurrentAccount() account: AuthContext,
    @Body() dto: CreateMaterialRollDto
  ) {
    return this.service.createRoll(account.branchId!, dto)
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Update a material roll' })
  update(
    @CurrentAccount() account: AuthContext,
    @Param('id') id: string,
    @Body() dto: UpdateMaterialRollDto
  ) {
    return this.service.updateRoll(id, account.branchId!, dto)
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Delete a material roll' })
  remove(@CurrentAccount() account: AuthContext, @Param('id') id: string) {
    return this.service.removeRoll(id, account.branchId!)
  }
}
```

- [ ] **Step 6: material-rolls.controller.spec.ts**

```typescript
// apps/api/src/inventory/material-rolls.controller.spec.ts
import { Test } from '@nestjs/testing'

import { Role } from '@glossops/database'

import type { AuthContext } from '@auth/interfaces'

import { MaterialRollsController } from './material-rolls.controller'
import { InventoryService } from './inventory.service'

const makeAccount = (role: Role): AuthContext => ({
  sub: 'acc-1',
  memberId: 'mem-1',
  email: 'test@test.com',
  branchId: 'branch-1',
  organizationId: 'org-1',
  role,
})

describe('MaterialRollsController', () => {
  let controller: MaterialRollsController
  let service: {
    createRoll: jest.Mock
    updateRoll: jest.Mock
    removeRoll: jest.Mock
  }

  beforeEach(async () => {
    service = {
      createRoll: jest.fn().mockResolvedValue({}),
      updateRoll: jest.fn().mockResolvedValue({}),
      removeRoll: jest.fn().mockResolvedValue(undefined),
    }
    const module = await Test.createTestingModule({
      controllers: [MaterialRollsController],
      providers: [{ provide: InventoryService, useValue: service }],
    }).compile()
    controller = module.get(MaterialRollsController)
  })

  it('create passes branchId from account', async () => {
    const dto = {
      name: 'R',
      series: 'S',
      finish: 'F',
      color: 'C',
      width: 1.52,
      remainingLength: 10,
    } as never
    await controller.create(makeAccount(Role.OWNER), dto)
    expect(service.createRoll).toHaveBeenCalledWith('branch-1', dto)
  })

  it('update passes id and branchId', async () => {
    await controller.update(makeAccount(Role.MANAGER), 'roll-1', {
      series: 'X',
    } as never)
    expect(service.updateRoll).toHaveBeenCalledWith('roll-1', 'branch-1', {
      series: 'X',
    })
  })

  it('remove passes id and branchId', async () => {
    await controller.remove(makeAccount(Role.OWNER), 'roll-1')
    expect(service.removeRoll).toHaveBeenCalledWith('roll-1', 'branch-1')
  })
})
```

- [ ] **Step 7: Run controller specs**

```bash
cd apps/api && npx jest inventory.controller.spec inventory-items.controller.spec material-rolls.controller.spec --no-coverage 2>&1 | tail -20
```

Expected: all 3 specs pass.

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/inventory/inventory.controller.ts apps/api/src/inventory/inventory.controller.spec.ts apps/api/src/inventory/inventory-items.controller.ts apps/api/src/inventory/inventory-items.controller.spec.ts apps/api/src/inventory/material-rolls.controller.ts apps/api/src/inventory/material-rolls.controller.spec.ts
python3 -c "
msg = '✨ feat(inventory): add inventory, items, and material-rolls controllers'
with open('/tmp/commit_msg.txt', 'w') as f:
    f.write(msg)
" && git commit -F /tmp/commit_msg.txt
```

---

## Task 9: Inventory module wiring + app.module

**Files:**

- Create: `apps/api/src/inventory/inventory.module.ts`
- Create: `apps/api/src/inventory/index.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: inventory.module.ts**

```typescript
// apps/api/src/inventory/inventory.module.ts
import { Module } from '@nestjs/common'

import { PrismaModule } from '@prisma'

import { PrismaInventoryItemRepository } from './infrastructure/prisma-inventory-item.repository'
import { PrismaInventoryUsageRepository } from './infrastructure/prisma-inventory-usage.repository'
import { PrismaInventoryRepository } from './infrastructure/prisma-inventory.repository'
import { PrismaMaterialRollRepository } from './infrastructure/prisma-material-roll.repository'
import { PrismaServiceDefaultsRepository } from './infrastructure/prisma-service-defaults.repository'
import { InventoryItemsController } from './inventory-items.controller'
import { MaterialRollsController } from './material-rolls.controller'
import {
  INVENTORY_ITEM_REPOSITORY,
  INVENTORY_REPOSITORY,
  INVENTORY_USAGE_REPOSITORY,
  MATERIAL_ROLL_REPOSITORY,
  SERVICE_DEFAULTS_REPOSITORY,
} from './inventory.tokens'
import { InventoryController } from './inventory.controller'
import { InventoryService } from './inventory.service'

@Module({
  imports: [PrismaModule],
  controllers: [
    InventoryController,
    InventoryItemsController,
    MaterialRollsController,
  ],
  providers: [
    { provide: INVENTORY_REPOSITORY, useClass: PrismaInventoryRepository },
    {
      provide: INVENTORY_ITEM_REPOSITORY,
      useClass: PrismaInventoryItemRepository,
    },
    {
      provide: MATERIAL_ROLL_REPOSITORY,
      useClass: PrismaMaterialRollRepository,
    },
    {
      provide: INVENTORY_USAGE_REPOSITORY,
      useClass: PrismaInventoryUsageRepository,
    },
    {
      provide: SERVICE_DEFAULTS_REPOSITORY,
      useClass: PrismaServiceDefaultsRepository,
    },
    InventoryService,
  ],
  exports: [InventoryService],
})
export class InventoryModule {}
```

- [ ] **Step 2: inventory/index.ts**

```typescript
// apps/api/src/inventory/index.ts
export { InventoryModule } from './inventory.module'
export { InventoryService } from './inventory.service'
```

- [ ] **Step 3: Add InventoryModule to app.module.ts**

In `apps/api/src/app.module.ts`, add the import:

```typescript
import { InventoryModule } from './inventory/inventory.module'
```

And add `InventoryModule` to the `imports` array (after `BrandsModule`):

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
  InventoryModule,
],
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/inventory/inventory.module.ts apps/api/src/inventory/index.ts apps/api/src/app.module.ts
python3 -c "
msg = '✨ feat(inventory): wire InventoryModule and register in AppModule'
with open('/tmp/commit_msg.txt', 'w') as f:
    f.write(msg)
" && git commit -F /tmp/commit_msg.txt
```

---

## Task 10: WorkOrders integration

**Files:**

- Create: `apps/api/src/work-orders/work-order-usages.controller.ts`
- Create: `apps/api/src/work-orders/work-order-usages.controller.spec.ts`
- Modify: `apps/api/src/work-orders/work-orders.service.ts`
- Modify: `apps/api/src/work-orders/work-orders.service.spec.ts`
- Modify: `apps/api/src/work-orders/work-orders.module.ts`

- [ ] **Step 1: Add InventoryService integration tests to work-orders.service.spec.ts**

Add the following `describe` blocks to the existing `work-orders.service.spec.ts`. They go after the existing `removeItem` describe block. The spec setup needs two extra providers: `InventoryService` (mocked) and the `INVENTORY_SERVICE` token. Use a jest mock instead of the real service since we're testing coordination, not inventory logic.

First add the mock at the top of the file (after existing imports):

```typescript
// Add to existing imports in work-orders.service.spec.ts
import { InventoryService } from './../../inventory/inventory.service'
```

Wait — the path alias `@inventory` should be available. Use:

```typescript
import { InventoryService } from '@inventory'
```

Add near the top of the describe block alongside `woRepo`, `itemRepo`:

```typescript
let inventoryService: {
  maybeCreateUsage: jest.Mock
  commitUsages: jest.Mock
  deleteUsagesByWorkOrder: jest.Mock
}
```

Update `beforeEach` to add the mock and wire it:

```typescript
inventoryService = {
  maybeCreateUsage: jest.fn().mockResolvedValue(undefined),
  commitUsages: jest.fn().mockResolvedValue({ warnings: [] }),
  deleteUsagesByWorkOrder: jest.fn().mockResolvedValue(undefined),
}

// Add to Test.createTestingModule providers:
{ provide: InventoryService, useValue: inventoryService },
```

Add the following new describe blocks to the spec file:

```typescript
describe('addItem — inventory integration', () => {
  it('calls inventoryService.maybeCreateUsage with workOrderId and serviceId', async () => {
    const wo = await service.create(BRANCH, ORG, { assetId: ASSET })
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
    const wo = await service.create(BRANCH, ORG, { assetId: ASSET })
    await service.transition(wo.id, ORG, WorkOrderStatus.CONFIRMED)
    await service.transition(wo.id, ORG, WorkOrderStatus.IN_PROGRESS)
    await service.transition(wo.id, ORG, WorkOrderStatus.COMPLETED)
    expect(inventoryService.commitUsages).toHaveBeenCalledWith(wo.id)
  })

  it('calls deleteUsagesByWorkOrder when transitioning to CANCELLED', async () => {
    const wo = await service.create(BRANCH, ORG, { assetId: ASSET })
    await service.transition(wo.id, ORG, WorkOrderStatus.CANCELLED)
    expect(inventoryService.deleteUsagesByWorkOrder).toHaveBeenCalledWith(wo.id)
  })
})
```

- [ ] **Step 2: Run the new tests to confirm they fail**

```bash
cd apps/api && npx jest work-orders.service.spec --no-coverage 2>&1 | grep -E 'PASS|FAIL|inventory'
```

Expected: the 3 new tests fail because `WorkOrdersService` doesn't inject `InventoryService` yet.

- [ ] **Step 3: Update work-orders.service.ts to inject InventoryService**

Add the import (Tier 4 path alias, after existing Tier 4 imports):

```typescript
import { InventoryService } from '@inventory'
```

Add `InventoryService` to the constructor:

```typescript
constructor(
  @Inject(WORK_ORDER_REPOSITORY)
  private readonly workOrders: WorkOrderRepositoryInterface,
  @Inject(WORK_ORDER_ITEM_REPOSITORY)
  private readonly workOrderItems: WorkOrderItemRepositoryInterface,
  private readonly inventoryService: InventoryService
) {}
```

In `addItem`, after `await this.syncTotal(workOrderId, organizationId)`, add:

```typescript
await this.inventoryService.maybeCreateUsage(workOrderId, dto.serviceId)
```

In `transition`, find the block that handles `COMPLETED` status. The `transition` method calls `this.workOrders.updateStatus`. After the status update, add:

```typescript
if (status === WorkOrderStatus.COMPLETED) {
  await this.inventoryService.commitUsages(id)
} else if (status === WorkOrderStatus.CANCELLED) {
  await this.inventoryService.deleteUsagesByWorkOrder(id)
}
```

The updated `transition` method:

```typescript
async transition(
  id: string,
  organizationId: string,
  status: WorkOrderStatus
): Promise<Prisma.WorkOrderModel> {
  const wo = await this.findOne(id, organizationId)
  const allowed = VALID_TRANSITIONS[wo.status]
  if (!allowed.includes(status)) {
    throw new ConflictException({ error: 'invalid_status_transition' })
  }
  const completedAt = status === WorkOrderStatus.COMPLETED ? new Date() : undefined
  const updated = await this.workOrders.updateStatus(id, organizationId, status, completedAt)

  if (status === WorkOrderStatus.COMPLETED) {
    await this.inventoryService.commitUsages(id)
  } else if (status === WorkOrderStatus.CANCELLED) {
    await this.inventoryService.deleteUsagesByWorkOrder(id)
  }

  return updated
}
```

- [ ] **Step 4: Run work-orders.service.spec to confirm all tests pass**

```bash
cd apps/api && npx jest work-orders.service.spec --no-coverage 2>&1 | tail -10
```

Expected: `PASS src/work-orders/work-orders.service.spec.ts` — all tests green including the 3 new ones.

- [ ] **Step 5: Create work-order-usages.controller.ts**

```typescript
// apps/api/src/work-orders/work-order-usages.controller.ts
import { Body, Controller, HttpCode, Param, Patch } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'

import { Role } from '@glossops/database'

import { CurrentAccount, Roles } from '@auth/decorators'
import type { AuthContext } from '@auth/interfaces'

import { InventoryService } from '@inventory'

import { UpdateInventoryUsageDto } from '../inventory/dto'

@ApiTags('Work Orders')
@ApiBearerAuth()
@Controller('work-orders/:workOrderId/usages')
export class WorkOrderUsagesController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Patch(':usageId')
  @HttpCode(200)
  @Roles(Role.OWNER, Role.MANAGER, Role.TECHNICIAN)
  @ApiOperation({ summary: 'Adjust quantity used for an inventory usage' })
  update(
    @CurrentAccount() _account: AuthContext,
    @Param('workOrderId') workOrderId: string,
    @Param('usageId') usageId: string,
    @Body() dto: UpdateInventoryUsageDto
  ) {
    return this.inventoryService.updateUsage(
      workOrderId,
      usageId,
      dto.quantityUsed
    )
  }
}
```

- [ ] **Step 6: Create work-order-usages.controller.spec.ts**

```typescript
// apps/api/src/work-orders/work-order-usages.controller.spec.ts
import { Test } from '@nestjs/testing'

import { Role } from '@glossops/database'

import type { AuthContext } from '@auth/interfaces'

import { InventoryService } from '@inventory'

import { WorkOrderUsagesController } from './work-order-usages.controller'

const makeAccount = (role: Role): AuthContext => ({
  sub: 'acc-1',
  memberId: 'mem-1',
  email: 'test@test.com',
  branchId: 'branch-1',
  organizationId: 'org-1',
  role,
})

describe('WorkOrderUsagesController', () => {
  let controller: WorkOrderUsagesController
  let inventoryService: { updateUsage: jest.Mock }

  beforeEach(async () => {
    inventoryService = { updateUsage: jest.fn().mockResolvedValue({}) }
    const module = await Test.createTestingModule({
      controllers: [WorkOrderUsagesController],
      providers: [{ provide: InventoryService, useValue: inventoryService }],
    }).compile()
    controller = module.get(WorkOrderUsagesController)
  })

  it('passes workOrderId, usageId, and quantityUsed to inventoryService', async () => {
    const dto = { quantityUsed: 2.5 } as never
    await controller.update(
      makeAccount(Role.TECHNICIAN),
      'wo-1',
      'usage-1',
      dto
    )
    expect(inventoryService.updateUsage).toHaveBeenCalledWith(
      'wo-1',
      'usage-1',
      2.5
    )
  })
})
```

- [ ] **Step 7: Run the usage controller spec**

```bash
cd apps/api && npx jest work-order-usages.controller.spec --no-coverage 2>&1 | tail -10
```

Expected: `PASS`.

- [ ] **Step 8: Update work-orders.module.ts**

Add imports and register the new controller and `InventoryModule`:

```typescript
// apps/api/src/work-orders/work-orders.module.ts
import { Module } from '@nestjs/common'

import { PrismaModule } from '@prisma'

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
})
export class WorkOrdersModule {}
```

- [ ] **Step 9: Run full test suite**

```bash
cd apps/api && npx jest --no-coverage 2>&1 | tail -20
```

Expected: all specs pass. If any spec in `work-orders.service.spec.ts` fails because the `InventoryService` provider is missing, add `{ provide: InventoryService, useValue: inventoryService }` to the test module providers in `beforeEach`.

- [ ] **Step 10: Commit**

```bash
git add apps/api/src/work-orders/work-order-usages.controller.ts apps/api/src/work-orders/work-order-usages.controller.spec.ts apps/api/src/work-orders/work-orders.service.ts apps/api/src/work-orders/work-orders.service.spec.ts apps/api/src/work-orders/work-orders.module.ts
python3 -c "
msg = '✨ feat(work-orders): integrate InventoryService for usage tracking'
with open('/tmp/commit_msg.txt', 'w') as f:
    f.write(msg)
" && git commit -F /tmp/commit_msg.txt
```

---

## Self-Review Checklist

- [x] **Spec coverage:**
  - GET /inventory → Task 8 `InventoryController.findAll`
  - POST/PATCH/DELETE /inventory/items → Task 8 `InventoryItemsController`
  - POST/PATCH/DELETE /inventory/material-rolls → Task 8 `MaterialRollsController`
  - GET /inventory/:id/usages → Task 8 `InventoryController.findUsages`
  - PATCH /work-orders/:id/usages/:usageId → Task 10 `WorkOrderUsagesController`
  - Schema migration → Task 1
  - Path aliases → Task 2
  - In-memory repos → Task 5
  - Prisma repos → Task 7
  - Module wiring → Task 9
  - WorkOrders integration (addItem, COMPLETED, CANCELLED) → Task 10
  - `maybeCreateUsage` → Task 6 spec + Task 10 integration
  - `commitUsages` with warnings → Task 6 spec covers all warning scenarios
  - `deleteUsagesByWorkOrder` on cancel → Task 10 integration test

- [x] **Type consistency:** `InventoryService.updateUsage(workOrderId, usageId, quantityUsed: number)` called from controller with `dto.quantityUsed: number`. `usages.update` receives `new Prisma.Decimal(quantityUsed)`. Consistent across Tasks 6, 8, 10.

- [x] **findByIdDirect:** Defined in Task 6 Step 3 as amendment to `InventoryRepositoryInterface` and `InMemoryInventoryRepository`. `PrismaInventoryRepository` implementation noted in Task 7 Step 1. `InMemoryInventoryRepository` already has it in Task 5 Step 1.
