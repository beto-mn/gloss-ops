# Purchase Orders Module — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the purchase orders module with CRUD, batch-receive flow (auto-increments inventory stock/length and updates unit cost), and cancel endpoint.

**Architecture:** Repository pattern — `PurchaseOrderRepositoryInterface` + `PurchaseOrderItemRepositoryInterface`, one service, one controller. `PurchaseOrdersModule` imports `InventoryModule` to call `InventoryService.applyReceive()`. The Inventory module is extended with `incrementStock`/`incrementLength` methods used only by the receive flow.

**Tech Stack:** NestJS, TypeScript, Prisma ORM, PostgreSQL, class-validator, class-transformer.

> **Date constraint:** ALL commits on this branch must be dated 2026-05-13. Use the pattern below for every commit:
>
> ```bash
> python3 -c "
> msg = '<emoji> <type>(<scope>): <subject>'
> with open('/tmp/commit_msg.txt', 'w', encoding='utf-8') as f:
>     f.write(msg)
> " && GIT_AUTHOR_DATE="2026-05-13 12:00:00 -0600" GIT_COMMITTER_DATE="2026-05-13 12:00:00 -0600" git commit -F /tmp/commit_msg.txt
> ```

---

## File Structure

**New files:**

```
apps/api/src/purchase-orders/
  interfaces/
    purchase-order.repository.interface.ts
    purchase-order-item.repository.interface.ts
    index.ts
  infrastructure/
    prisma-purchase-order.repository.ts
    prisma-purchase-order-item.repository.ts
    in-memory-purchase-order.repository.ts
    in-memory-purchase-order-item.repository.ts
  dto/
    create-purchase-order.dto.ts
    update-purchase-order.dto.ts
    list-purchase-orders.dto.ts
    receive-purchase-order.dto.ts
    index.ts
  purchase-orders.tokens.ts
  purchase-orders.service.ts
  purchase-orders.service.spec.ts
  purchase-orders.controller.ts
  purchase-orders.module.ts
  index.ts
```

**Modified files:**

```
apps/api/tsconfig.paths.json                                        ← add @purchase-orders aliases
apps/api/package.json                                               ← add jest moduleNameMapper entries
apps/api/src/inventory/interfaces/inventory-item.repository.interface.ts  ← add incrementStock
apps/api/src/inventory/interfaces/material-roll.repository.interface.ts   ← add incrementLength
apps/api/src/inventory/interfaces/index.ts                          ← no change needed (re-exports all)
apps/api/src/inventory/infrastructure/in-memory-inventory-item.repository.ts  ← implement incrementStock
apps/api/src/inventory/infrastructure/in-memory-material-roll.repository.ts   ← implement incrementLength
apps/api/src/inventory/infrastructure/prisma-inventory-item.repository.ts     ← implement incrementStock
apps/api/src/inventory/infrastructure/prisma-material-roll.repository.ts      ← implement incrementLength
apps/api/src/inventory/inventory.service.ts                         ← add applyReceive method
apps/api/src/inventory/inventory.service.spec.ts                    ← add applyReceive tests
apps/api/src/app.module.ts                                          ← add PurchaseOrdersModule
```

---

## Task 1: Path aliases

**Files:**

- Modify: `apps/api/tsconfig.paths.json`
- Modify: `apps/api/package.json`

- [ ] **Step 1: Add path aliases to tsconfig.paths.json**

Open `apps/api/tsconfig.paths.json`. The current last three entries are the `@inventory` ones. Add three new entries after them (keep the file sorted by line length within the existing convention):

```json
{
  "compilerOptions": {
    "paths": {
      "@auth": ["./src/auth/index.ts"],
      "@auth/decorators": ["./src/auth/decorators/index.ts"],
      "@auth/dto": ["./src/auth/dto/index.ts"],
      "@auth/guards": ["./src/auth/guards/index.ts"],
      "@auth/interfaces": ["./src/auth/interfaces/index.ts"],
      "@branches": ["./src/branches/index.ts"],
      "@branches/dto": ["./src/branches/dto/index.ts"],
      "@branches/interfaces": ["./src/branches/interfaces/index.ts"],
      "@config": ["./src/config/index.ts"],
      "@customer-assets": ["./src/customer-assets/index.ts"],
      "@customer-assets/dto": ["./src/customer-assets/dto/index.ts"],
      "@customer-assets/interfaces": [
        "./src/customer-assets/interfaces/index.ts"
      ],
      "@customers": ["./src/customers/index.ts"],
      "@customers/dto": ["./src/customers/dto/index.ts"],
      "@customers/interfaces": ["./src/customers/interfaces/index.ts"],
      "@organizations": ["./src/organizations/index.ts"],
      "@organizations/dto": ["./src/organizations/dto/index.ts"],
      "@organizations/interfaces": ["./src/organizations/interfaces/index.ts"],
      "@prisma": ["./src/prisma/index.ts"],
      "@services": ["./src/services/index.ts"],
      "@services/dto": ["./src/services/dto/index.ts"],
      "@services/interfaces": ["./src/services/interfaces/index.ts"],
      "@suppliers": ["./src/suppliers/index.ts"],
      "@suppliers/dto": ["./src/suppliers/dto/index.ts"],
      "@suppliers/interfaces": ["./src/suppliers/interfaces/index.ts"],
      "@brands": ["./src/brands/index.ts"],
      "@brands/dto": ["./src/brands/dto/index.ts"],
      "@brands/interfaces": ["./src/brands/interfaces/index.ts"],
      "@work-orders": ["./src/work-orders/index.ts"],
      "@work-orders/dto": ["./src/work-orders/dto/index.ts"],
      "@work-orders/interfaces": ["./src/work-orders/interfaces/index.ts"],
      "@inventory": ["./src/inventory/index.ts"],
      "@inventory/dto": ["./src/inventory/dto/index.ts"],
      "@inventory/interfaces": ["./src/inventory/interfaces/index.ts"],
      "@purchase-orders": ["./src/purchase-orders/index.ts"],
      "@purchase-orders/dto": ["./src/purchase-orders/dto/index.ts"],
      "@purchase-orders/interfaces": [
        "./src/purchase-orders/interfaces/index.ts"
      ]
    }
  }
}
```

- [ ] **Step 2: Add jest moduleNameMapper entries to package.json**

In `apps/api/package.json`, find the `"moduleNameMapper"` object inside `"jest"`. Add three entries after the existing `@inventory` entries:

```json
"^@purchase-orders$": "<rootDir>/purchase-orders/index.ts",
"^@purchase-orders/dto$": "<rootDir>/purchase-orders/dto/index.ts",
"^@purchase-orders/interfaces$": "<rootDir>/purchase-orders/interfaces/index.ts"
```

- [ ] **Step 3: Verify no tests broke**

```bash
cd apps/api && pnpm test --passWithNoTests
```

Expected: all suites pass (no new files yet, so nothing changes).

- [ ] **Step 4: Commit**

```bash
git add apps/api/tsconfig.paths.json apps/api/package.json
python3 -c "
msg = '🔧 chore(api): add @purchase-orders path aliases to tsconfig and jest'
with open('/tmp/commit_msg.txt', 'w', encoding='utf-8') as f:
    f.write(msg)
" && GIT_AUTHOR_DATE="2026-05-13 12:00:00 -0600" GIT_COMMITTER_DATE="2026-05-13 12:00:00 -0600" git commit -F /tmp/commit_msg.txt
```

---

## Task 2: Extend Inventory module — incrementStock / incrementLength / applyReceive

**Files:**

- Modify: `apps/api/src/inventory/interfaces/inventory-item.repository.interface.ts`
- Modify: `apps/api/src/inventory/interfaces/material-roll.repository.interface.ts`
- Modify: `apps/api/src/inventory/infrastructure/in-memory-inventory-item.repository.ts`
- Modify: `apps/api/src/inventory/infrastructure/in-memory-material-roll.repository.ts`
- Modify: `apps/api/src/inventory/infrastructure/prisma-inventory-item.repository.ts`
- Modify: `apps/api/src/inventory/infrastructure/prisma-material-roll.repository.ts`
- Modify: `apps/api/src/inventory/inventory.service.ts`
- Modify: `apps/api/src/inventory/inventory.service.spec.ts`

- [ ] **Step 1: Write the failing tests for applyReceive**

Add these three describe blocks at the end of `apps/api/src/inventory/inventory.service.spec.ts`, before the closing `})` of the outer `describe('InventoryService')`:

```typescript
describe('applyReceive', () => {
  it('increments stock and updates unitCost for ITEM', async () => {
    const item = await service.createItem(BRANCH, {
      name: 'Tape',
      unit: 'roll',
      stock: 10,
    })
    await service.applyReceive(item.id, 5, 25.5)
    const updated = await invRepo.findByIdDirect(item.id)
    expect(Number(updated!.inventoryItem!.stock)).toBe(15)
    expect(Number(updated!.unitCost)).toBe(25.5)
  })

  it('increments remainingLength and updates unitCost for ROLL', async () => {
    const roll = await service.createRoll(BRANCH, {
      name: 'Vinyl',
      series: 'S1',
      finish: 'Gloss',
      color: 'Black',
      width: 1.52,
      remainingLength: 20,
    })
    await service.applyReceive(roll.id, 10, 50)
    const updated = await invRepo.findByIdDirect(roll.id)
    expect(Number(updated!.materialRoll!.remainingLength)).toBe(30)
    expect(Number(updated!.unitCost)).toBe(50)
  })

  it('throws NotFoundException if inventory not found', async () => {
    await expect(service.applyReceive('nonexistent', 5, 10)).rejects.toThrow(
      NotFoundException
    )
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd apps/api && pnpm test inventory.service --passWithNoTests
```

Expected: FAIL — `service.applyReceive is not a function`

- [ ] **Step 3: Add incrementStock to InventoryItemRepositoryInterface**

In `apps/api/src/inventory/interfaces/inventory-item.repository.interface.ts`, add `incrementStock` to the interface:

```typescript
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
  incrementStock(
    id: string,
    quantity: Prisma.Decimal,
    unitCost: Prisma.Decimal
  ): Promise<void>
}
```

- [ ] **Step 4: Add incrementLength to MaterialRollRepositoryInterface**

In `apps/api/src/inventory/interfaces/material-roll.repository.interface.ts`:

```typescript
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
  incrementLength(
    id: string,
    quantity: Prisma.Decimal,
    unitCost: Prisma.Decimal
  ): Promise<void>
}
```

- [ ] **Step 5: Implement incrementStock in InMemoryInventoryItemRepository**

In `apps/api/src/inventory/infrastructure/in-memory-inventory-item.repository.ts`, add `incrementStock` at the end of the class (before the closing `}`):

```typescript
incrementStock(
  id: string,
  quantity: Prisma.Decimal,
  unitCost: Prisma.Decimal
): Promise<void> {
  const record = this.store.get(id)!
  const item = record.inventoryItem!
  const newStock = new Prisma.Decimal(Number(item.stock) + Number(quantity))
  this.store.set(id, {
    ...record,
    unitCost,
    inventoryItem: { ...item, stock: newStock },
  })
  return Promise.resolve()
}
```

- [ ] **Step 6: Implement incrementLength in InMemoryMaterialRollRepository**

In `apps/api/src/inventory/infrastructure/in-memory-material-roll.repository.ts`, add `incrementLength` at the end of the class:

```typescript
incrementLength(
  id: string,
  quantity: Prisma.Decimal,
  unitCost: Prisma.Decimal
): Promise<void> {
  const record = this.store.get(id)!
  const roll = record.materialRoll!
  const newLength = new Prisma.Decimal(
    Number(roll.remainingLength) + Number(quantity)
  )
  this.store.set(id, {
    ...record,
    unitCost,
    materialRoll: { ...roll, remainingLength: newLength },
  })
  return Promise.resolve()
}
```

- [ ] **Step 7: Implement incrementStock in PrismaInventoryItemRepository**

In `apps/api/src/inventory/infrastructure/prisma-inventory-item.repository.ts`, add `incrementStock` at the end of the class:

```typescript
async incrementStock(
  id: string,
  quantity: Prisma.Decimal,
  unitCost: Prisma.Decimal
): Promise<void> {
  await this.prisma.$transaction([
    this.prisma.inventoryItem.update({
      where: { id },
      data: { stock: { increment: quantity } },
    }),
    this.prisma.inventory.update({
      where: { id },
      data: { unitCost },
    }),
  ])
}
```

- [ ] **Step 8: Implement incrementLength in PrismaMaterialRollRepository**

In `apps/api/src/inventory/infrastructure/prisma-material-roll.repository.ts`, add `incrementLength` at the end of the class:

```typescript
async incrementLength(
  id: string,
  quantity: Prisma.Decimal,
  unitCost: Prisma.Decimal
): Promise<void> {
  await this.prisma.$transaction([
    this.prisma.materialRoll.update({
      where: { id },
      data: { remainingLength: { increment: quantity } },
    }),
    this.prisma.inventory.update({
      where: { id },
      data: { unitCost },
    }),
  ])
}
```

- [ ] **Step 9: Add applyReceive to InventoryService**

In `apps/api/src/inventory/inventory.service.ts`, update the import from `@glossops/database` to include `InventoryType`:

```typescript
import { InventoryType, Prisma } from '@glossops/database'
```

Then add `applyReceive` at the end of the class (after `deleteUsagesByWorkOrder`):

```typescript
async applyReceive(
  inventoryId: string,
  quantity: number,
  unitCost: number
): Promise<void> {
  const inv = await this.inventory.findByIdDirect(inventoryId)
  if (!inv) throw new NotFoundException({ error: 'inventory_not_found' })
  const qty = new Prisma.Decimal(quantity)
  const cost = new Prisma.Decimal(unitCost)
  if (inv.type === InventoryType.ITEM) {
    await this.inventoryItems.incrementStock(inv.id, qty, cost)
  } else {
    await this.materialRolls.incrementLength(inv.id, qty, cost)
  }
}
```

- [ ] **Step 10: Run tests — verify they pass**

```bash
cd apps/api && pnpm test inventory.service --passWithNoTests
```

Expected: all inventory.service tests pass (including the 3 new applyReceive tests).

- [ ] **Step 11: Run full suite**

```bash
cd apps/api && pnpm test --passWithNoTests
```

Expected: all suites pass.

- [ ] **Step 12: Commit**

```bash
git add apps/api/src/inventory/
python3 -c "
msg = '✨ feat(inventory): add incrementStock, incrementLength, and applyReceive for purchase receive flow'
with open('/tmp/commit_msg.txt', 'w', encoding='utf-8') as f:
    f.write(msg)
" && GIT_AUTHOR_DATE="2026-05-13 12:00:00 -0600" GIT_COMMITTER_DATE="2026-05-13 12:00:00 -0600" git commit -F /tmp/commit_msg.txt
```

---

## Task 3: DI tokens + repository interfaces

**Files:**

- Create: `apps/api/src/purchase-orders/purchase-orders.tokens.ts`
- Create: `apps/api/src/purchase-orders/interfaces/purchase-order.repository.interface.ts`
- Create: `apps/api/src/purchase-orders/interfaces/purchase-order-item.repository.interface.ts`
- Create: `apps/api/src/purchase-orders/interfaces/index.ts`

- [ ] **Step 1: Create purchase-orders.tokens.ts**

```typescript
export const PURCHASE_ORDER_REPOSITORY = Symbol(
  'PurchaseOrderRepositoryInterface'
)
export const PURCHASE_ORDER_ITEM_REPOSITORY = Symbol(
  'PurchaseOrderItemRepositoryInterface'
)
```

- [ ] **Step 2: Create purchase-order.repository.interface.ts**

```typescript
import type { PurchaseOrderStatus, type Prisma } from '@glossops/database'

export interface PurchaseOrderItemRecord {
  id: string
  purchaseOrderId: string
  inventoryId: string
  quantity: Prisma.Decimal
  receivedQuantity: Prisma.Decimal
  unitCost: Prisma.Decimal
  note: string | null
  createdAt: Date
}

export interface PurchaseOrderWithItems {
  id: string
  branchId: string
  supplierId: string
  status: PurchaseOrderStatus
  expectedAt: Date | null
  receivedAt: Date | null
  note: string | null
  createdAt: Date
  updatedAt: Date
  items: PurchaseOrderItemRecord[]
}

export interface CreatePurchaseOrderItemData {
  inventoryId: string
  quantity: number
  unitCost: number
  note?: string
}

export interface CreatePurchaseOrderData {
  branchId: string
  supplierId: string
  expectedAt?: Date
  note?: string
  items: CreatePurchaseOrderItemData[]
}

export interface UpdatePurchaseOrderData {
  supplierId?: string
  expectedAt?: Date | null
  note?: string | null
}

export interface PurchaseOrderQuery {
  status?: PurchaseOrderStatus
  supplierId?: string
  page: number
  limit: number
}

export interface PurchaseOrderPageMeta {
  total: number
  totalPages: number
  page: number
  limit: number
  hasNext: boolean
  hasPrev: boolean
}

export interface PurchaseOrderPage {
  data: PurchaseOrderWithItems[]
  meta: PurchaseOrderPageMeta
}

export interface ReceiveItemUpdate {
  itemId: string
  newReceivedQuantity: Prisma.Decimal
}

export interface PurchaseOrderRepositoryInterface {
  create(data: CreatePurchaseOrderData): Promise<PurchaseOrderWithItems>
  findById(id: string, branchId: string): Promise<PurchaseOrderWithItems | null>
  findAll(
    branchId: string,
    query: PurchaseOrderQuery
  ): Promise<PurchaseOrderPage>
  update(
    id: string,
    branchId: string,
    data: UpdatePurchaseOrderData
  ): Promise<PurchaseOrderWithItems>
  delete(id: string, branchId: string): Promise<void>
  updateStatusAndItems(
    id: string,
    status: PurchaseOrderStatus,
    receivedAt: Date | null,
    items: ReceiveItemUpdate[]
  ): Promise<PurchaseOrderWithItems>
}
```

- [ ] **Step 3: Create purchase-order-item.repository.interface.ts**

```typescript
import type { PurchaseOrderItemRecord } from './purchase-order.repository.interface'

export interface PurchaseOrderItemRepositoryInterface {
  findAllByOrder(purchaseOrderId: string): Promise<PurchaseOrderItemRecord[]>
}
```

- [ ] **Step 4: Create interfaces/index.ts**

Sorted by line length, longest first:

```typescript
export type {
  PurchaseOrderRepositoryInterface,
  PurchaseOrderWithItems,
  PurchaseOrderItemRecord,
  CreatePurchaseOrderData,
  CreatePurchaseOrderItemData,
  UpdatePurchaseOrderData,
  PurchaseOrderQuery,
  PurchaseOrderPage,
  PurchaseOrderPageMeta,
  ReceiveItemUpdate,
} from './purchase-order.repository.interface'
export type { PurchaseOrderItemRepositoryInterface } from './purchase-order-item.repository.interface'
```

- [ ] **Step 5: Run tests**

```bash
cd apps/api && pnpm test --passWithNoTests
```

Expected: all suites still pass (no runtime changes yet).

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/purchase-orders/
python3 -c "
msg = '✨ feat(purchase-orders): add DI tokens and repository interfaces'
with open('/tmp/commit_msg.txt', 'w', encoding='utf-8') as f:
    f.write(msg)
" && GIT_AUTHOR_DATE="2026-05-13 12:00:00 -0600" GIT_COMMITTER_DATE="2026-05-13 12:00:00 -0600" git commit -F /tmp/commit_msg.txt
```

---

## Task 4: DTOs

**Files:**

- Create: `apps/api/src/purchase-orders/dto/create-purchase-order.dto.ts`
- Create: `apps/api/src/purchase-orders/dto/update-purchase-order.dto.ts`
- Create: `apps/api/src/purchase-orders/dto/list-purchase-orders.dto.ts`
- Create: `apps/api/src/purchase-orders/dto/receive-purchase-order.dto.ts`
- Create: `apps/api/src/purchase-orders/dto/index.ts`

- [ ] **Step 1: Create create-purchase-order.dto.ts**

```typescript
import { Type } from 'class-transformer'
import {
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator'

export class CreatePurchaseOrderItemDto {
  @IsUUID()
  inventoryId: string

  @IsNumber()
  @Min(0.001)
  quantity: number

  @IsNumber()
  @Min(0)
  unitCost: number

  @IsOptional()
  @IsString()
  note?: string
}

export class CreatePurchaseOrderDto {
  @IsUUID()
  supplierId: string

  @IsOptional()
  @IsDateString()
  expectedAt?: string

  @IsOptional()
  @IsString()
  note?: string

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseOrderItemDto)
  items: CreatePurchaseOrderItemDto[]
}
```

- [ ] **Step 2: Create update-purchase-order.dto.ts**

```typescript
import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator'

export class UpdatePurchaseOrderDto {
  @IsOptional()
  @IsUUID()
  supplierId?: string

  @IsOptional()
  @IsDateString()
  expectedAt?: string | null

  @IsOptional()
  @IsString()
  note?: string | null
}
```

- [ ] **Step 3: Create list-purchase-orders.dto.ts**

```typescript
import { Type } from 'class-transformer'
import { IsEnum, IsInt, IsOptional, IsUUID, Min } from 'class-validator'

import { PurchaseOrderStatus } from '@glossops/database'

export class ListPurchaseOrdersDto {
  @IsOptional()
  @IsEnum(PurchaseOrderStatus)
  status?: PurchaseOrderStatus

  @IsOptional()
  @IsUUID()
  supplierId?: string

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

- [ ] **Step 4: Create receive-purchase-order.dto.ts**

```typescript
import { Type } from 'class-transformer'
import { IsArray, IsNumber, IsUUID, Min, ValidateNested } from 'class-validator'

export class ReceiveItemDto {
  @IsUUID()
  itemId: string

  @IsNumber()
  @Min(0.001)
  receivedQuantity: number
}

export class ReceivePurchaseOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceiveItemDto)
  items: ReceiveItemDto[]
}
```

- [ ] **Step 5: Create dto/index.ts**

Sorted by line length, longest first:

```typescript
export {
  CreatePurchaseOrderDto,
  CreatePurchaseOrderItemDto,
} from './create-purchase-order.dto'
export {
  ReceivePurchaseOrderDto,
  ReceiveItemDto,
} from './receive-purchase-order.dto'
export { UpdatePurchaseOrderDto } from './update-purchase-order.dto'
export { ListPurchaseOrdersDto } from './list-purchase-orders.dto'
```

- [ ] **Step 6: Run tests**

```bash
cd apps/api && pnpm test --passWithNoTests
```

Expected: all suites pass.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/purchase-orders/
python3 -c "
msg = '✨ feat(purchase-orders): add DTOs for create, update, list, and receive'
with open('/tmp/commit_msg.txt', 'w', encoding='utf-8') as f:
    f.write(msg)
" && GIT_AUTHOR_DATE="2026-05-13 12:00:00 -0600" GIT_COMMITTER_DATE="2026-05-13 12:00:00 -0600" git commit -F /tmp/commit_msg.txt
```

---

## Task 5: In-memory repositories

**Files:**

- Create: `apps/api/src/purchase-orders/infrastructure/in-memory-purchase-order.repository.ts`
- Create: `apps/api/src/purchase-orders/infrastructure/in-memory-purchase-order-item.repository.ts`

- [ ] **Step 1: Create in-memory-purchase-order.repository.ts**

```typescript
import { randomUUID } from 'crypto'

import { Prisma, PurchaseOrderStatus } from '@glossops/database'

import type {
  PurchaseOrderRepositoryInterface,
  PurchaseOrderWithItems,
  PurchaseOrderItemRecord,
  CreatePurchaseOrderData,
  UpdatePurchaseOrderData,
  PurchaseOrderQuery,
  PurchaseOrderPage,
  ReceiveItemUpdate,
} from '@purchase-orders/interfaces'

export class InMemoryPurchaseOrderRepository implements PurchaseOrderRepositoryInterface {
  readonly store = new Map<string, PurchaseOrderWithItems>()

  create(data: CreatePurchaseOrderData): Promise<PurchaseOrderWithItems> {
    const id = randomUUID()
    const po: PurchaseOrderWithItems = {
      id,
      branchId: data.branchId,
      supplierId: data.supplierId,
      status: PurchaseOrderStatus.DRAFT,
      expectedAt: data.expectedAt ?? null,
      receivedAt: null,
      note: data.note ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
      items: data.items.map(
        (item): PurchaseOrderItemRecord => ({
          id: randomUUID(),
          purchaseOrderId: id,
          inventoryId: item.inventoryId,
          quantity: new Prisma.Decimal(item.quantity),
          receivedQuantity: new Prisma.Decimal(0),
          unitCost: new Prisma.Decimal(item.unitCost),
          note: item.note ?? null,
          createdAt: new Date(),
        })
      ),
    }
    this.store.set(id, po)
    return Promise.resolve(po)
  }

  findById(
    id: string,
    branchId: string
  ): Promise<PurchaseOrderWithItems | null> {
    const po = this.store.get(id)
    if (!po || po.branchId !== branchId) return Promise.resolve(null)
    return Promise.resolve(po)
  }

  findAll(
    branchId: string,
    query: PurchaseOrderQuery
  ): Promise<PurchaseOrderPage> {
    let data = [...this.store.values()].filter(p => p.branchId === branchId)
    if (query.status) data = data.filter(p => p.status === query.status)
    if (query.supplierId)
      data = data.filter(p => p.supplierId === query.supplierId)
    data.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    const total = data.length
    const totalPages = total === 0 ? 0 : Math.ceil(total / query.limit)
    const sliced = data.slice(
      (query.page - 1) * query.limit,
      query.page * query.limit
    )
    return Promise.resolve({
      data: sliced,
      meta: {
        total,
        totalPages,
        page: query.page,
        limit: query.limit,
        hasNext: query.page < totalPages,
        hasPrev: query.page > 1,
      },
    })
  }

  update(
    id: string,
    _branchId: string,
    data: UpdatePurchaseOrderData
  ): Promise<PurchaseOrderWithItems> {
    const po = this.store.get(id)!
    const updated: PurchaseOrderWithItems = {
      ...po,
      supplierId: data.supplierId ?? po.supplierId,
      expectedAt:
        data.expectedAt !== undefined ? data.expectedAt : po.expectedAt,
      note: data.note !== undefined ? data.note : po.note,
      updatedAt: new Date(),
    }
    this.store.set(id, updated)
    return Promise.resolve(updated)
  }

  delete(id: string, _branchId: string): Promise<void> {
    this.store.delete(id)
    return Promise.resolve()
  }

  updateStatusAndItems(
    id: string,
    status: PurchaseOrderStatus,
    receivedAt: Date | null,
    items: ReceiveItemUpdate[]
  ): Promise<PurchaseOrderWithItems> {
    const po = this.store.get(id)!
    const updatedItems = po.items.map(item => {
      const update = items.find(u => u.itemId === item.id)
      return update
        ? { ...item, receivedQuantity: update.newReceivedQuantity }
        : item
    })
    const updated: PurchaseOrderWithItems = {
      ...po,
      status,
      receivedAt,
      updatedAt: new Date(),
      items: updatedItems,
    }
    this.store.set(id, updated)
    return Promise.resolve(updated)
  }
}
```

- [ ] **Step 2: Create in-memory-purchase-order-item.repository.ts**

```typescript
import type { PurchaseOrderItemRepositoryInterface } from '@purchase-orders/interfaces'
import type { PurchaseOrderWithItems } from '@purchase-orders/interfaces'
import type { PurchaseOrderItemRecord } from '@purchase-orders/interfaces'

export class InMemoryPurchaseOrderItemRepository implements PurchaseOrderItemRepositoryInterface {
  constructor(private readonly store: Map<string, PurchaseOrderWithItems>) {}

  findAllByOrder(purchaseOrderId: string): Promise<PurchaseOrderItemRecord[]> {
    const po = [...this.store.values()].find(p => p.id === purchaseOrderId)
    return Promise.resolve(po?.items ?? [])
  }
}
```

- [ ] **Step 3: Run tests**

```bash
cd apps/api && pnpm test --passWithNoTests
```

Expected: all suites pass.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/purchase-orders/
python3 -c "
msg = '✨ feat(purchase-orders): add in-memory repository implementations'
with open('/tmp/commit_msg.txt', 'w', encoding='utf-8') as f:
    f.write(msg)
" && GIT_AUTHOR_DATE="2026-05-13 12:00:00 -0600" GIT_COMMITTER_DATE="2026-05-13 12:00:00 -0600" git commit -F /tmp/commit_msg.txt
```

---

## Task 6: PurchaseOrdersService — TDD

**Files:**

- Create: `apps/api/src/purchase-orders/purchase-orders.service.ts`
- Create: `apps/api/src/purchase-orders/purchase-orders.service.spec.ts`

- [ ] **Step 1: Write the full test suite first**

Create `apps/api/src/purchase-orders/purchase-orders.service.spec.ts`:

```typescript
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common'
import { Test } from '@nestjs/testing'

import { PurchaseOrderStatus } from '@glossops/database'

import { InventoryService } from '../inventory/inventory.service'
import { InMemoryPurchaseOrderItemRepository } from './infrastructure/in-memory-purchase-order-item.repository'
import { InMemoryPurchaseOrderRepository } from './infrastructure/in-memory-purchase-order.repository'
import {
  PURCHASE_ORDER_ITEM_REPOSITORY,
  PURCHASE_ORDER_REPOSITORY,
} from './purchase-orders.tokens'
import { PurchaseOrdersService } from './purchase-orders.service'

const BRANCH = 'branch-1'
const OTHER_BRANCH = 'branch-2'
const SUPPLIER = 'supplier-1'
const INV_1 = 'inv-1'
const INV_2 = 'inv-2'

const makeCreateDto = (overrides?: object) => ({
  supplierId: SUPPLIER,
  items: [
    { inventoryId: INV_1, quantity: 10, unitCost: 5 },
    { inventoryId: INV_2, quantity: 5, unitCost: 20 },
  ],
  ...overrides,
})

describe('PurchaseOrdersService', () => {
  let service: PurchaseOrdersService
  let poRepo: InMemoryPurchaseOrderRepository
  let poItemRepo: InMemoryPurchaseOrderItemRepository
  let inventoryService: { applyReceive: jest.Mock }

  beforeEach(async () => {
    poRepo = new InMemoryPurchaseOrderRepository()
    poItemRepo = new InMemoryPurchaseOrderItemRepository(poRepo.store)
    inventoryService = { applyReceive: jest.fn().mockResolvedValue(undefined) }

    const module = await Test.createTestingModule({
      providers: [
        PurchaseOrdersService,
        { provide: PURCHASE_ORDER_REPOSITORY, useValue: poRepo },
        { provide: PURCHASE_ORDER_ITEM_REPOSITORY, useValue: poItemRepo },
        { provide: InventoryService, useValue: inventoryService },
      ],
    }).compile()

    service = module.get(PurchaseOrdersService)
  })

  // ── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates a DRAFT purchase order with items', async () => {
      const po = await service.create(BRANCH, makeCreateDto())
      expect(po.status).toBe(PurchaseOrderStatus.DRAFT)
      expect(po.branchId).toBe(BRANCH)
      expect(po.items).toHaveLength(2)
      expect(po.receivedAt).toBeNull()
    })
  })

  // ── findOne ───────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('returns the order when found', async () => {
      const created = await service.create(BRANCH, makeCreateDto())
      const found = await service.findOne(created.id, BRANCH)
      expect(found.id).toBe(created.id)
    })

    it('throws NotFoundException when order not found', async () => {
      await expect(service.findOne('nonexistent', BRANCH)).rejects.toThrow(
        NotFoundException
      )
    })

    it('throws NotFoundException when order belongs to another branch', async () => {
      const created = await service.create(BRANCH, makeCreateDto())
      await expect(service.findOne(created.id, OTHER_BRANCH)).rejects.toThrow(
        NotFoundException
      )
    })
  })

  // ── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('updates header fields when in DRAFT', async () => {
      const created = await service.create(BRANCH, makeCreateDto())
      const updated = await service.update(created.id, BRANCH, {
        note: 'Rush order',
      })
      expect(updated.note).toBe('Rush order')
    })

    it('throws ConflictException when not in DRAFT', async () => {
      const created = await service.create(BRANCH, makeCreateDto())
      // force status to PARTIALLY_RECEIVED then try to receive again — use repo directly
      await poRepo.updateStatusAndItems(
        created.id,
        PurchaseOrderStatus.RECEIVED,
        new Date(),
        []
      )
      await expect(
        service.update(created.id, BRANCH, { note: 'X' })
      ).rejects.toThrow(ConflictException)
    })
  })

  // ── remove ────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('deletes a DRAFT order', async () => {
      const created = await service.create(BRANCH, makeCreateDto())
      await service.remove(created.id, BRANCH)
      await expect(service.findOne(created.id, BRANCH)).rejects.toThrow(
        NotFoundException
      )
    })

    it('throws ConflictException when not in DRAFT', async () => {
      const created = await service.create(BRANCH, makeCreateDto())
      await poRepo.updateStatusAndItems(
        created.id,
        PurchaseOrderStatus.PARTIALLY_RECEIVED,
        null,
        []
      )
      await expect(service.remove(created.id, BRANCH)).rejects.toThrow(
        ConflictException
      )
    })
  })

  // ── receive ───────────────────────────────────────────────────────────────

  describe('receive', () => {
    it('sets status to PARTIALLY_RECEIVED when not all items fully received', async () => {
      const po = await service.create(BRANCH, makeCreateDto())
      const item1Id = po.items[0].id
      const result = await service.receive(po.id, BRANCH, {
        items: [{ itemId: item1Id, receivedQuantity: 5 }],
      })
      expect(result.status).toBe(PurchaseOrderStatus.PARTIALLY_RECEIVED)
      expect(result.receivedAt).toBeNull()
    })

    it('sets status to RECEIVED and sets receivedAt when all items fully received', async () => {
      const po = await service.create(BRANCH, makeCreateDto())
      const result = await service.receive(po.id, BRANCH, {
        items: [
          { itemId: po.items[0].id, receivedQuantity: 10 },
          { itemId: po.items[1].id, receivedQuantity: 5 },
        ],
      })
      expect(result.status).toBe(PurchaseOrderStatus.RECEIVED)
      expect(result.receivedAt).not.toBeNull()
    })

    it('accumulates receivedQuantity across multiple receive calls', async () => {
      const po = await service.create(BRANCH, makeCreateDto())
      const item1Id = po.items[0].id
      const item2Id = po.items[1].id
      await service.receive(po.id, BRANCH, {
        items: [{ itemId: item1Id, receivedQuantity: 5 }],
      })
      const result = await service.receive(po.id, BRANCH, {
        items: [
          { itemId: item1Id, receivedQuantity: 5 },
          { itemId: item2Id, receivedQuantity: 5 },
        ],
      })
      expect(result.status).toBe(PurchaseOrderStatus.RECEIVED)
    })

    it('calls inventoryService.applyReceive for each received item', async () => {
      const po = await service.create(BRANCH, makeCreateDto())
      await service.receive(po.id, BRANCH, {
        items: [{ itemId: po.items[0].id, receivedQuantity: 3 }],
      })
      expect(inventoryService.applyReceive).toHaveBeenCalledTimes(1)
      expect(inventoryService.applyReceive).toHaveBeenCalledWith(INV_1, 3, 5)
    })

    it('throws ConflictException when order is RECEIVED', async () => {
      const po = await service.create(BRANCH, makeCreateDto())
      await poRepo.updateStatusAndItems(
        po.id,
        PurchaseOrderStatus.RECEIVED,
        new Date(),
        []
      )
      await expect(
        service.receive(po.id, BRANCH, {
          items: [{ itemId: po.items[0].id, receivedQuantity: 1 }],
        })
      ).rejects.toThrow(ConflictException)
    })

    it('throws ConflictException when order is CANCELLED', async () => {
      const po = await service.create(BRANCH, makeCreateDto())
      await poRepo.updateStatusAndItems(
        po.id,
        PurchaseOrderStatus.CANCELLED,
        null,
        []
      )
      await expect(
        service.receive(po.id, BRANCH, {
          items: [{ itemId: po.items[0].id, receivedQuantity: 1 }],
        })
      ).rejects.toThrow(ConflictException)
    })

    it('throws BadRequestException when itemId does not belong to this order', async () => {
      const po = await service.create(BRANCH, makeCreateDto())
      await expect(
        service.receive(po.id, BRANCH, {
          items: [{ itemId: 'unknown-item-id', receivedQuantity: 1 }],
        })
      ).rejects.toThrow(BadRequestException)
    })
  })

  // ── cancel ────────────────────────────────────────────────────────────────

  describe('cancel', () => {
    it('cancels a DRAFT order', async () => {
      const po = await service.create(BRANCH, makeCreateDto())
      const result = await service.cancel(po.id, BRANCH)
      expect(result.status).toBe(PurchaseOrderStatus.CANCELLED)
    })

    it('cancels a PARTIALLY_RECEIVED order', async () => {
      const po = await service.create(BRANCH, makeCreateDto())
      await service.receive(po.id, BRANCH, {
        items: [{ itemId: po.items[0].id, receivedQuantity: 3 }],
      })
      const result = await service.cancel(po.id, BRANCH)
      expect(result.status).toBe(PurchaseOrderStatus.CANCELLED)
    })

    it('throws ConflictException when order is RECEIVED', async () => {
      const po = await service.create(BRANCH, makeCreateDto())
      await poRepo.updateStatusAndItems(
        po.id,
        PurchaseOrderStatus.RECEIVED,
        new Date(),
        []
      )
      await expect(service.cancel(po.id, BRANCH)).rejects.toThrow(
        ConflictException
      )
    })

    it('throws ConflictException when order is already CANCELLED', async () => {
      const po = await service.create(BRANCH, makeCreateDto())
      await service.cancel(po.id, BRANCH)
      await expect(service.cancel(po.id, BRANCH)).rejects.toThrow(
        ConflictException
      )
    })
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd apps/api && pnpm test purchase-orders.service --passWithNoTests
```

Expected: FAIL — `Cannot find module './purchase-orders.service'`

- [ ] **Step 3: Create purchase-orders.service.ts**

```typescript
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Inject,
  NotFoundException,
} from '@nestjs/common'

import { Prisma, PurchaseOrderStatus } from '@glossops/database'

import type {
  PurchaseOrderRepositoryInterface,
  PurchaseOrderItemRepositoryInterface,
  PurchaseOrderWithItems,
  PurchaseOrderPage,
  ReceiveItemUpdate,
} from '@purchase-orders/interfaces'
import type {
  CreatePurchaseOrderDto,
  UpdatePurchaseOrderDto,
  ListPurchaseOrdersDto,
  ReceivePurchaseOrderDto,
} from './dto'
import {
  PURCHASE_ORDER_ITEM_REPOSITORY,
  PURCHASE_ORDER_REPOSITORY,
} from './purchase-orders.tokens'
import { InventoryService } from '../inventory/inventory.service'

const RECEIVABLE_STATUSES = [
  PurchaseOrderStatus.DRAFT,
  PurchaseOrderStatus.PARTIALLY_RECEIVED,
]
const CANCELLABLE_STATUSES = [
  PurchaseOrderStatus.DRAFT,
  PurchaseOrderStatus.PARTIALLY_RECEIVED,
]

@Injectable()
export class PurchaseOrdersService {
  constructor(
    @Inject(PURCHASE_ORDER_REPOSITORY)
    private readonly orders: PurchaseOrderRepositoryInterface,
    @Inject(PURCHASE_ORDER_ITEM_REPOSITORY)
    private readonly orderItems: PurchaseOrderItemRepositoryInterface,
    private readonly inventoryService: InventoryService
  ) {}

  create(
    branchId: string,
    dto: CreatePurchaseOrderDto
  ): Promise<PurchaseOrderWithItems> {
    return this.orders.create({
      branchId,
      supplierId: dto.supplierId,
      expectedAt: dto.expectedAt ? new Date(dto.expectedAt) : undefined,
      note: dto.note,
      items: dto.items.map(i => ({
        inventoryId: i.inventoryId,
        quantity: i.quantity,
        unitCost: i.unitCost,
        note: i.note,
      })),
    })
  }

  async findOne(id: string, branchId: string): Promise<PurchaseOrderWithItems> {
    const po = await this.orders.findById(id, branchId)
    if (!po) throw new NotFoundException({ error: 'purchase_order_not_found' })
    return po
  }

  findAll(
    branchId: string,
    dto: ListPurchaseOrdersDto
  ): Promise<PurchaseOrderPage> {
    return this.orders.findAll(branchId, {
      status: dto.status,
      supplierId: dto.supplierId,
      page: dto.page ?? 1,
      limit: dto.limit ?? 20,
    })
  }

  async update(
    id: string,
    branchId: string,
    dto: UpdatePurchaseOrderDto
  ): Promise<PurchaseOrderWithItems> {
    const po = await this.findOne(id, branchId)
    if (po.status !== PurchaseOrderStatus.DRAFT) {
      throw new ConflictException({ error: 'purchase_order_not_editable' })
    }
    return this.orders.update(id, branchId, {
      supplierId: dto.supplierId,
      expectedAt:
        dto.expectedAt !== undefined
          ? dto.expectedAt
            ? new Date(dto.expectedAt)
            : null
          : undefined,
      note: dto.note,
    })
  }

  async remove(id: string, branchId: string): Promise<void> {
    const po = await this.findOne(id, branchId)
    if (po.status !== PurchaseOrderStatus.DRAFT) {
      throw new ConflictException({ error: 'purchase_order_not_editable' })
    }
    return this.orders.delete(id, branchId)
  }

  async receive(
    id: string,
    branchId: string,
    dto: ReceivePurchaseOrderDto
  ): Promise<PurchaseOrderWithItems> {
    const po = await this.findOne(id, branchId)
    if (!RECEIVABLE_STATUSES.includes(po.status)) {
      throw new ConflictException({ error: 'purchase_order_not_receivable' })
    }

    const poItemIds = new Set(po.items.map(i => i.id))
    for (const item of dto.items) {
      if (!poItemIds.has(item.itemId)) {
        throw new BadRequestException({
          error: 'purchase_order_item_not_found',
        })
      }
    }

    const updates: ReceiveItemUpdate[] = dto.items.map(d => {
      const existing = po.items.find(i => i.id === d.itemId)!
      return {
        itemId: d.itemId,
        newReceivedQuantity: new Prisma.Decimal(
          Number(existing.receivedQuantity) + d.receivedQuantity
        ),
      }
    })

    const updatedItems = po.items.map(item => {
      const u = updates.find(u => u.itemId === item.id)
      return u ? { ...item, receivedQuantity: u.newReceivedQuantity } : item
    })
    const allReceived = updatedItems.every(
      i => Number(i.receivedQuantity) >= Number(i.quantity)
    )
    const newStatus = allReceived
      ? PurchaseOrderStatus.RECEIVED
      : PurchaseOrderStatus.PARTIALLY_RECEIVED
    const receivedAt = allReceived ? new Date() : null

    const result = await this.orders.updateStatusAndItems(
      id,
      newStatus,
      receivedAt,
      updates
    )

    for (const d of dto.items) {
      const poItem = po.items.find(i => i.id === d.itemId)!
      await this.inventoryService.applyReceive(
        poItem.inventoryId,
        d.receivedQuantity,
        Number(poItem.unitCost)
      )
    }

    return result
  }

  async cancel(id: string, branchId: string): Promise<PurchaseOrderWithItems> {
    const po = await this.findOne(id, branchId)
    if (!CANCELLABLE_STATUSES.includes(po.status)) {
      throw new ConflictException({ error: 'purchase_order_not_cancellable' })
    }
    return this.orders.updateStatusAndItems(
      id,
      PurchaseOrderStatus.CANCELLED,
      po.receivedAt,
      []
    )
  }
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd apps/api && pnpm test purchase-orders.service --passWithNoTests
```

Expected: all tests PASS.

- [ ] **Step 5: Run full suite**

```bash
cd apps/api && pnpm test --passWithNoTests
```

Expected: all suites pass.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/purchase-orders/
python3 -c "
msg = '✨ feat(purchase-orders): add PurchaseOrdersService with TDD (CRUD, receive, cancel)'
with open('/tmp/commit_msg.txt', 'w', encoding='utf-8') as f:
    f.write(msg)
" && GIT_AUTHOR_DATE="2026-05-13 12:00:00 -0600" GIT_COMMITTER_DATE="2026-05-13 12:00:00 -0600" git commit -F /tmp/commit_msg.txt
```

---

## Task 7: Prisma repositories

**Files:**

- Create: `apps/api/src/purchase-orders/infrastructure/prisma-purchase-order.repository.ts`
- Create: `apps/api/src/purchase-orders/infrastructure/prisma-purchase-order-item.repository.ts`

- [ ] **Step 1: Create prisma-purchase-order.repository.ts**

```typescript
import { Injectable } from '@nestjs/common'

import { PurchaseOrderStatus } from '@glossops/database'

import { PrismaService } from '@prisma'
import type {
  PurchaseOrderRepositoryInterface,
  PurchaseOrderWithItems,
  CreatePurchaseOrderData,
  UpdatePurchaseOrderData,
  PurchaseOrderQuery,
  PurchaseOrderPage,
  ReceiveItemUpdate,
} from '@purchase-orders/interfaces'

@Injectable()
export class PrismaPurchaseOrderRepository implements PurchaseOrderRepositoryInterface {
  constructor(private readonly prisma: PrismaService) {}

  private readonly include = {
    items: { orderBy: { createdAt: 'asc' as const } },
  }

  create(data: CreatePurchaseOrderData): Promise<PurchaseOrderWithItems> {
    return this.prisma.purchaseOrder.create({
      data: {
        branchId: data.branchId,
        supplierId: data.supplierId,
        expectedAt: data.expectedAt,
        note: data.note,
        items: {
          create: data.items.map(i => ({
            inventoryId: i.inventoryId,
            quantity: i.quantity,
            unitCost: i.unitCost,
            note: i.note,
          })),
        },
      },
      include: this.include,
    }) as Promise<PurchaseOrderWithItems>
  }

  findById(
    id: string,
    branchId: string
  ): Promise<PurchaseOrderWithItems | null> {
    return this.prisma.purchaseOrder.findFirst({
      where: { id, branchId },
      include: this.include,
    }) as Promise<PurchaseOrderWithItems | null>
  }

  async findAll(
    branchId: string,
    query: PurchaseOrderQuery
  ): Promise<PurchaseOrderPage> {
    const where: Record<string, unknown> = { branchId }
    if (query.status) where.status = query.status
    if (query.supplierId) where.supplierId = query.supplierId

    const [total, data] = await Promise.all([
      this.prisma.purchaseOrder.count({ where }),
      this.prisma.purchaseOrder.findMany({
        where,
        include: this.include,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
    ])

    const totalPages = total === 0 ? 0 : Math.ceil(total / query.limit)
    return {
      data: data as PurchaseOrderWithItems[],
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

  update(
    id: string,
    _branchId: string,
    data: UpdatePurchaseOrderData
  ): Promise<PurchaseOrderWithItems> {
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        ...(data.supplierId !== undefined && { supplierId: data.supplierId }),
        ...(data.expectedAt !== undefined && { expectedAt: data.expectedAt }),
        ...(data.note !== undefined && { note: data.note }),
      },
      include: this.include,
    }) as Promise<PurchaseOrderWithItems>
  }

  async delete(id: string, _branchId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.purchaseOrderItem.deleteMany({
        where: { purchaseOrderId: id },
      }),
      this.prisma.purchaseOrder.delete({ where: { id } }),
    ])
  }

  updateStatusAndItems(
    id: string,
    status: PurchaseOrderStatus,
    receivedAt: Date | null,
    items: ReceiveItemUpdate[]
  ): Promise<PurchaseOrderWithItems> {
    return this.prisma.$transaction(async tx => {
      for (const item of items) {
        await tx.purchaseOrderItem.update({
          where: { id: item.itemId },
          data: { receivedQuantity: item.newReceivedQuantity },
        })
      }
      return tx.purchaseOrder.update({
        where: { id },
        data: { status, receivedAt },
        include: this.include,
      })
    }) as Promise<PurchaseOrderWithItems>
  }
}
```

- [ ] **Step 2: Create prisma-purchase-order-item.repository.ts**

```typescript
import { Injectable } from '@nestjs/common'

import { PrismaService } from '@prisma'
import type {
  PurchaseOrderItemRepositoryInterface,
  PurchaseOrderItemRecord,
} from '@purchase-orders/interfaces'

@Injectable()
export class PrismaPurchaseOrderItemRepository implements PurchaseOrderItemRepositoryInterface {
  constructor(private readonly prisma: PrismaService) {}

  findAllByOrder(purchaseOrderId: string): Promise<PurchaseOrderItemRecord[]> {
    return this.prisma.purchaseOrderItem.findMany({
      where: { purchaseOrderId },
      orderBy: { createdAt: 'asc' },
    }) as Promise<PurchaseOrderItemRecord[]>
  }
}
```

- [ ] **Step 3: Run tests**

```bash
cd apps/api && pnpm test --passWithNoTests
```

Expected: all suites pass.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/purchase-orders/
python3 -c "
msg = '✨ feat(purchase-orders): add Prisma repository implementations'
with open('/tmp/commit_msg.txt', 'w', encoding='utf-8') as f:
    f.write(msg)
" && GIT_AUTHOR_DATE="2026-05-13 12:00:00 -0600" GIT_COMMITTER_DATE="2026-05-13 12:00:00 -0600" git commit -F /tmp/commit_msg.txt
```

---

## Task 8: Controller, module wiring, and app.module

**Files:**

- Create: `apps/api/src/purchase-orders/purchase-orders.controller.ts`
- Create: `apps/api/src/purchase-orders/purchase-orders.module.ts`
- Create: `apps/api/src/purchase-orders/index.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Create purchase-orders.controller.ts**

```typescript
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
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

import { Role } from '@glossops/database'

import { CurrentAccount, Roles } from '@auth/decorators'
import type { AuthContext } from '@auth/interfaces'

import {
  CreatePurchaseOrderDto,
  ListPurchaseOrdersDto,
  ReceivePurchaseOrderDto,
  UpdatePurchaseOrderDto,
} from './dto'
import { PurchaseOrdersService } from './purchase-orders.service'

@ApiTags('Purchase Orders')
@ApiBearerAuth()
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly service: PurchaseOrdersService) {}

  @Get()
  @ApiOperation({ summary: 'List purchase orders for the branch' })
  findAll(
    @CurrentAccount() account: AuthContext,
    @Query() dto: ListPurchaseOrdersDto
  ) {
    return this.service.findAll(account.branchId, dto)
  }

  @Post()
  @HttpCode(201)
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Create a purchase order' })
  create(
    @CurrentAccount() account: AuthContext,
    @Body() dto: CreatePurchaseOrderDto
  ) {
    return this.service.create(account.branchId, dto)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a purchase order by id' })
  findOne(@CurrentAccount() account: AuthContext, @Param('id') id: string) {
    return this.service.findOne(id, account.branchId)
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Update a purchase order header (DRAFT only)' })
  update(
    @CurrentAccount() account: AuthContext,
    @Param('id') id: string,
    @Body() dto: UpdatePurchaseOrderDto
  ) {
    return this.service.update(id, account.branchId, dto)
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Delete a purchase order (DRAFT only)' })
  remove(@CurrentAccount() account: AuthContext, @Param('id') id: string) {
    return this.service.remove(id, account.branchId)
  }

  @Post(':id/receive')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Batch receive items for a purchase order' })
  receive(
    @CurrentAccount() account: AuthContext,
    @Param('id') id: string,
    @Body() dto: ReceivePurchaseOrderDto
  ) {
    return this.service.receive(id, account.branchId, dto)
  }

  @Post(':id/cancel')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Cancel a purchase order' })
  cancel(@CurrentAccount() account: AuthContext, @Param('id') id: string) {
    return this.service.cancel(id, account.branchId)
  }
}
```

- [ ] **Step 2: Create purchase-orders.module.ts**

```typescript
import { Module } from '@nestjs/common'

import { PrismaModule } from '@prisma'

import { InventoryModule } from '../inventory/inventory.module'
import { PrismaPurchaseOrderItemRepository } from './infrastructure/prisma-purchase-order-item.repository'
import { PrismaPurchaseOrderRepository } from './infrastructure/prisma-purchase-order.repository'
import { PurchaseOrdersController } from './purchase-orders.controller'
import {
  PURCHASE_ORDER_ITEM_REPOSITORY,
  PURCHASE_ORDER_REPOSITORY,
} from './purchase-orders.tokens'
import { PurchaseOrdersService } from './purchase-orders.service'

@Module({
  imports: [PrismaModule, InventoryModule],
  controllers: [PurchaseOrdersController],
  providers: [
    {
      provide: PURCHASE_ORDER_REPOSITORY,
      useClass: PrismaPurchaseOrderRepository,
    },
    {
      provide: PURCHASE_ORDER_ITEM_REPOSITORY,
      useClass: PrismaPurchaseOrderItemRepository,
    },
    PurchaseOrdersService,
  ],
})
export class PurchaseOrdersModule {}
```

- [ ] **Step 3: Create index.ts**

```typescript
export { PurchaseOrdersModule } from './purchase-orders.module'
export { PurchaseOrdersService } from './purchase-orders.service'
```

- [ ] **Step 4: Add PurchaseOrdersModule to app.module.ts**

In `apps/api/src/app.module.ts`, add the import at the top:

```typescript
import { PurchaseOrdersModule } from './purchase-orders/purchase-orders.module'
```

And add `PurchaseOrdersModule` to the `imports` array after `InventoryModule`:

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
  PurchaseOrdersModule,
],
```

- [ ] **Step 5: Run full test suite**

```bash
cd apps/api && pnpm test --passWithNoTests
```

Expected: all suites pass.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/purchase-orders/ apps/api/src/app.module.ts
python3 -c "
msg = '✨ feat(purchase-orders): wire PurchaseOrdersModule and register in AppModule'
with open('/tmp/commit_msg.txt', 'w', encoding='utf-8') as f:
    f.write(msg)
" && GIT_AUTHOR_DATE="2026-05-13 12:00:00 -0600" GIT_COMMITTER_DATE="2026-05-13 12:00:00 -0600" git commit -F /tmp/commit_msg.txt
```

---

## Verification

After all tasks complete, run:

```bash
cd apps/api && pnpm test --passWithNoTests
```

Expected output includes:

- `purchase-orders.service.spec.ts` — all tests pass
- No regressions in other suites
- Total test count increased by at least 13 (applyReceive × 3 + service × 10+)
