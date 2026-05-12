# Inventory Module — Design Spec

**Date:** 2026-05-18
**Status:** Draft

---

## Goal

Implementar el módulo de inventario para que los talleres puedan gestionar su stock de insumos
(`InventoryItem`) y rollos de material (`MaterialRoll`), registrar el consumo de inventario en
órdenes de trabajo (`InventoryUsage`), y descontar stock automáticamente al completar una orden.

---

## Scope

| Recurso          | Descripción                                                                 |
| ---------------- | --------------------------------------------------------------------------- |
| `Inventory`      | Registro base (branch-scoped) — shared fields para ambos tipos              |
| `InventoryItem`  | Extensión para unidades discretas o cantidades medibles (`stock`, `unit`)   |
| `MaterialRoll`   | Extensión para rollos de vinil/PPF/film (`remainingLength`, `series`, etc.) |
| `InventoryUsage` | Consumo de inventario por orden de trabajo — pre-creado y ajustable         |

**Fuera de scope:** `PurchaseOrder`, `PurchaseOrderItem`, alertas push de bajo stock,
`ActivityLog`, facturación.

---

## Background

### Schema existente

El schema de Prisma ya contiene todos los modelos necesarios con sus campos y relaciones.
`Inventory` usa class table inheritance (CTI): `InventoryItem` y `MaterialRoll` comparten el mismo
`id` que `Inventory` via FK 1-a-1.

`InventoryUsage` vincula directamente `workOrderId → WorkOrder` e `inventoryId → Inventory`.
No existe FK hacia `WorkOrderItem` — un usage pertenece a la orden, no a un ítem individual.

### Schema migration requerida

`Service` no tiene campos de inventario por defecto. Se requiere migración para agregar:

```prisma
model Service {
  // ...campos existentes...
  defaultInventoryId String?  @map("default_inventory_id") @db.Uuid
  defaultQuantity    Decimal? @map("default_quantity") @db.Decimal(10, 3)

  defaultInventory Inventory? @relation(fields: [defaultInventoryId], references: [id])
}
```

Estos campos son opcionales — los servicios sin inventario por defecto siguen funcionando igual.

---

## Data Model

### Inventory (base)

```
id         UUID PK
branchId   UUID FK → Branch
supplierId UUID? FK → Supplier
brandId    UUID? FK → Brand
type       InventoryType  (ITEM | ROLL)
name       String
unitCost   Decimal(10,2)  default 0
createdAt  DateTime
updatedAt  DateTime
```

### InventoryItem (extensión)

```
id            UUID PK FK → Inventory.id
sku           String?
description   String?
stock         Decimal(10,3)  default 0
unit          String         (ej. "pza", "lt", "ml")
lowStockAlert Decimal(10,3)?
```

### MaterialRoll (extensión)

```
id              UUID PK FK → Inventory.id
series          String
finish          String
color           String
width           Decimal(6,3)    — metros
remainingLength Decimal(10,3)   — metros
lotNumber       String?
```

### InventoryUsage

```
id           UUID PK
workOrderId  UUID FK → WorkOrder
inventoryId  UUID FK → Inventory
quantityUsed Decimal(10,3)
costAtUsage  Decimal(10,2)  — snapshot inmutable del unitCost al crear
createdAt    DateTime
```

---

## API Contract

Todos los endpoints requieren JWT válido. `branchId` siempre viene del token JWT — nunca del body.

### GET /inventory

**Roles:** todos

| Query param  | Tipo            | Default | Notas                                            |
| ------------ | --------------- | ------- | ------------------------------------------------ |
| `type`       | `InventoryType` | —       | Filtra por `ITEM` o `ROLL`                       |
| `supplierId` | UUID            | —       | Filtra por proveedor                             |
| `brandId`    | UUID            | —       | Filtra por marca                                 |
| `lowStock`   | boolean         | —       | `true` → solo items con `stock <= lowStockAlert` |
| `page`       | int ≥ 1         | `1`     | —                                                |
| `limit`      | int ∈ [1,100]   | `20`    | —                                                |

Retorna `{ data: InventoryRecord[], meta: PageMeta }` donde `InventoryRecord` es la unión de los
campos base + extensión según el `type`. Ordenado por `name` asc.

---

### POST /inventory/items

**Roles:** OWNER, MANAGER

```ts
{
  name: string             // required
  supplierId?: string      // UUID
  brandId?: string         // UUID
  unitCost?: number        // ≥ 0, 2 decimales, default 0
  sku?: string
  description?: string
  stock?: number           // ≥ 0, 3 decimales, default 0
  unit: string             // required (ej. "pza")
  lowStockAlert?: number   // ≥ 0, 3 decimales
}
```

| Situación         | HTTP | Body                            |
| ----------------- | ---- | ------------------------------- |
| Body inválido     | 400  | validation error                |
| Sin rol requerido | 403  | —                               |
| Éxito             | 201  | `InventoryItem` creado con base |

---

### PATCH /inventory/items/:id

**Roles:** OWNER, MANAGER

Todos los campos del POST son opcionales. `description`, `sku`, `lowStockAlert`, `supplierId`,
`brandId` aceptan `null` para limpiar.

| Situación                  | HTTP | Body                               |
| -------------------------- | ---- | ---------------------------------- |
| No existe o es de otra org | 404  | `{ error: 'inventory_not_found' }` |
| Éxito                      | 200  | `InventoryItem` actualizado        |

---

### DELETE /inventory/items/:id

**Roles:** OWNER, MANAGER

Hard delete. Bloqueado si el item tiene `InventoryUsage` en órdenes activas
(status ≠ `COMPLETED` y ≠ `CANCELLED`).

| Situación                  | HTTP | Body                               |
| -------------------------- | ---- | ---------------------------------- |
| No existe o es de otra org | 404  | `{ error: 'inventory_not_found' }` |
| Usages en órdenes activas  | 409  | `{ error: 'inventory_in_use' }`    |
| Éxito                      | 204  | (vacío)                            |

---

### POST /inventory/material-rolls

**Roles:** OWNER, MANAGER

```ts
{
  name: string             // required
  supplierId?: string      // UUID
  brandId?: string         // UUID
  unitCost?: number        // ≥ 0, 2 decimales, default 0
  series: string           // required
  finish: string           // required
  color: string            // required
  width: number            // > 0, 3 decimales (metros)
  remainingLength: number  // ≥ 0, 3 decimales (metros)
  lotNumber?: string
}
```

| Situación         | HTTP | Body                           |
| ----------------- | ---- | ------------------------------ |
| Body inválido     | 400  | validation error               |
| Sin rol requerido | 403  | —                              |
| Éxito             | 201  | `MaterialRoll` creado con base |

---

### PATCH /inventory/material-rolls/:id

**Roles:** OWNER, MANAGER

Todos los campos del POST son opcionales. `supplierId`, `brandId`, `lotNumber` aceptan `null`.

| Situación                  | HTTP | Body                               |
| -------------------------- | ---- | ---------------------------------- |
| No existe o es de otra org | 404  | `{ error: 'inventory_not_found' }` |
| Éxito                      | 200  | `MaterialRoll` actualizado         |

---

### DELETE /inventory/material-rolls/:id

**Roles:** OWNER, MANAGER

Igual que DELETE items — bloqueado si hay usages en órdenes activas.

| Situación                  | HTTP | Body                               |
| -------------------------- | ---- | ---------------------------------- |
| No existe o es de otra org | 404  | `{ error: 'inventory_not_found' }` |
| Usages en órdenes activas  | 409  | `{ error: 'inventory_in_use' }`    |
| Éxito                      | 204  | (vacío)                            |

---

### GET /inventory/:id/usages

**Roles:** OWNER, MANAGER

Lista todos los `InventoryUsage` del item, con `workOrder` incluido (id + status). Ordenado por
`createdAt` desc. No paginado (un item raramente tiene cientos de usages).

| Situación                  | HTTP | Body                               |
| -------------------------- | ---- | ---------------------------------- |
| No existe o es de otra org | 404  | `{ error: 'inventory_not_found' }` |
| Éxito                      | 200  | `InventoryUsage[]`                 |

---

### PATCH /work-orders/:workOrderId/usages/:usageId

**Roles:** OWNER, MANAGER, TECHNICIAN

Permite al técnico ajustar `quantityUsed` de un usage pre-creado. Solo editable mientras la orden
no esté en estado terminal (`COMPLETED` o `CANCELLED`).

`costAtUsage` es inmutable — no se puede cambiar via este endpoint.

```ts
{
  quantityUsed: number // > 0, 3 decimales
}
```

| Situación                        | HTTP | Body                                     |
| -------------------------------- | ---- | ---------------------------------------- |
| Orden no existe o es de otra org | 404  | `{ error: 'work_order_not_found' }`      |
| Usage no existe en la orden      | 404  | `{ error: 'inventory_usage_not_found' }` |
| Orden en estado terminal         | 409  | `{ error: 'work_order_closed' }`         |
| Éxito                            | 200  | `InventoryUsage` actualizado             |

---

## InventoryUsage Lifecycle

### Pre-creación automática

Al agregar un `WorkOrderItem` (POST `/work-orders/:id/items`), `WorkOrdersService` delega a
`InventoryService.maybeCreateUsage(workOrderId, serviceId)`:

1. Busca el `Service` por `serviceId` — si `defaultInventoryId` es `null`, no hace nada
2. Crea `InventoryUsage` con:
   - `workOrderId`
   - `inventoryId = service.defaultInventoryId`
   - `quantityUsed = service.defaultQuantity ?? 1`
   - `costAtUsage = inventory.unitCost` (snapshot en ese momento)

### Ajuste manual

Técnico usa `PATCH /work-orders/:workOrderId/usages/:usageId` para cambiar `quantityUsed`.

### Commit al completar

Cuando `WorkOrder` transiciona a `COMPLETED`, `WorkOrdersService` llama a
`InventoryService.commitUsages(workOrderId)`:

1. Obtiene todos los `InventoryUsage` de la orden
2. Para cada uno, en un `$transaction`:
   - Si `type = ITEM`: `stock = stock - quantityUsed`
   - Si `type = ROLL`: `remainingLength = remainingLength - quantityUsed`
3. Identifica items con stock negativo o con `stock <= lowStockAlert` post-decremento
4. Retorna `{ warnings: string[] }` — si hay warnings el endpoint de status los incluye en el
   response body, pero la transición se completa de todas formas

### Cancelación

Cuando la orden transiciona a `CANCELLED`, `WorkOrdersService` llama a
`InventoryService.deleteUsagesByWorkOrder(workOrderId)`. Stock no se toca.

---

## Repository Layer

### Interfaces

**`InventoryRepositoryInterface`**

```ts
findById(id: string, branchId: string): Promise<InventoryRecord | null>
findAll(branchId: string, query: InventoryQuery): Promise<InventoryPage>
hasActiveUsages(id: string): Promise<boolean>
```

`InventoryRecord` es el tipo unión:

```ts
type InventoryRecord =
  | (Inventory & { inventoryItem: InventoryItem; materialRoll: null })
  | (Inventory & { inventoryItem: null; materialRoll: MaterialRoll })
```

**`InventoryItemRepositoryInterface`**

```ts
create(data: CreateInventoryItemData): Promise<InventoryRecord>
update(id: string, branchId: string, data: UpdateInventoryItemData): Promise<InventoryRecord>
delete(id: string, branchId: string): Promise<void>
decrementStock(id: string, quantity: Prisma.Decimal, tx: PrismaTransactionClient): Promise<InventoryItem>
```

**`MaterialRollRepositoryInterface`**

```ts
create(data: CreateMaterialRollData): Promise<InventoryRecord>
update(id: string, branchId: string, data: UpdateMaterialRollData): Promise<InventoryRecord>
delete(id: string, branchId: string): Promise<void>
decrementLength(id: string, quantity: Prisma.Decimal, tx: PrismaTransactionClient): Promise<MaterialRoll>
```

**`InventoryUsageRepositoryInterface`**

```ts
create(data: CreateInventoryUsageData): Promise<InventoryUsage>
findById(id: string, workOrderId: string): Promise<InventoryUsage | null>
findAllByWorkOrder(workOrderId: string): Promise<InventoryUsage[]>
update(id: string, workOrderId: string, quantityUsed: Prisma.Decimal): Promise<InventoryUsage>
deleteByWorkOrder(workOrderId: string): Promise<void>
```

### Prisma Implementation

- `PrismaInventoryRepository.findById` usa `include: { inventoryItem: true, materialRoll: true }`
  y filtra por `branchId` para garantizar aislamiento entre branches.
- `PrismaInventoryRepository.findAll` usa `$transaction([findMany, count])`. El filtro `lowStock`
  aplica `WHERE stock <= low_stock_alert` solo para `type = ITEM` via subquery join.
- `PrismaInventoryRepository.hasActiveUsages` busca `InventoryUsage` con `workOrder.status NOT IN
[COMPLETED, CANCELLED]`.
- `PrismaInventoryItemRepository.create` usa `$transaction` para crear `Inventory` base +
  `InventoryItem` extension en un solo paso atómico.
- `PrismaInventoryItemRepository.decrementStock` y `PrismaMaterialRollRepository.decrementLength`
  reciben el cliente de transacción (`tx`) — son llamados desde `InventoryService.commitUsages`
  dentro de un `prisma.$transaction`.
- `PrismaMaterialRollRepository.create` análogo: `$transaction` para `Inventory` + `MaterialRoll`.

### In-Memory Implementation

- `InMemoryInventoryRepository` mantiene `Map<string, InventoryRecord>` (id → record con extensión).
  `hasActiveUsages` acepta un callback `setUsagesGetter` para obtener usages sin depender de Prisma.
- `InMemoryInventoryItemRepository` y `InMemoryMaterialRollRepository` comparten el mismo store
  interno que `InMemoryInventoryRepository` via referencia inyectada en tests.
- `InMemoryInventoryUsageRepository` mantiene `Map<string, InventoryUsage>`.
  `deleteByWorkOrder` filtra por `workOrderId` y elimina todos los matching.
- `decrementStock` y `decrementLength` en in-memory ignoran el parámetro `tx` (no hay transacciones).

---

## Service Layer

`InventoryService` inyecta los cuatro repositorios + `PrismaService`. `PrismaService` se usa en
dos lugares: `prisma.service.findUnique` en `maybeCreateUsage` para leer `defaultInventoryId` y
`defaultQuantity`, y `prisma.$transaction` en `commitUsages` para descontar stock atómicamente.

**Grupos de responsabilidad:**

**CRUD items:**

- `createItem(branchId, dto)` → crea via `InventoryItemRepository.create`
- `updateItem(id, branchId, dto)` → `findById` + `update`
- `removeItem(id, branchId)` → verifica `hasActiveUsages` (409 si true) + `delete`

**CRUD rolls:**

- `createRoll(branchId, dto)` → análogo a `createItem`
- `updateRoll(id, branchId, dto)`
- `removeRoll(id, branchId)`

**Listado:**

- `findAll(branchId, query)` → delega a `InventoryRepository.findAll`
- `findOne(id, branchId)` → delega a `InventoryRepository.findById`, 404 si null
- `findUsages(id, branchId)` → verifica existencia + `InventoryUsageRepository.findAllByWorkOrder`

**Integración con WorkOrders:**

- `maybeCreateUsage(workOrderId, serviceId)` → busca service.defaultInventoryId, crea usage si existe
- `updateUsage(workOrderId, usageId, quantityUsed)` → verifica uso existe en la orden + actualiza
- `commitUsages(workOrderId)` → descuenta stock en `$transaction`, retorna `{ warnings }`
- `deleteUsagesByWorkOrder(workOrderId)` → elimina todos los usages de la orden

---

## Controller Layer

| Controller                 | Prefijo                     |
| -------------------------- | --------------------------- |
| `InventoryController`      | `/inventory`                |
| `InventoryItemsController` | `/inventory/items`          |
| `MaterialRollsController`  | `/inventory/material-rolls` |

El endpoint `PATCH /work-orders/:workOrderId/usages/:usageId` se agrega a
`WorkOrdersModule` como un cuarto controller `WorkOrderUsagesController` — no vive en
`InventoryModule`.

`WorkOrdersModule` importa `InventoryModule` para acceder a `InventoryService`.

---

## Module Structure

```
apps/api/src/inventory/
  interfaces/
    inventory.repository.interface.ts
    inventory-item.repository.interface.ts
    material-roll.repository.interface.ts
    inventory-usage.repository.interface.ts
    index.ts
  infrastructure/
    prisma-inventory.repository.ts
    prisma-inventory-item.repository.ts
    prisma-material-roll.repository.ts
    prisma-inventory-usage.repository.ts
    in-memory-inventory.repository.ts
    in-memory-inventory-item.repository.ts
    in-memory-material-roll.repository.ts
    in-memory-inventory-usage.repository.ts
  dto/
    create-inventory-item.dto.ts
    update-inventory-item.dto.ts
    create-material-roll.dto.ts
    update-material-roll.dto.ts
    list-inventory.dto.ts
    update-inventory-usage.dto.ts
    index.ts
  inventory.tokens.ts
  inventory.service.ts
  inventory.service.spec.ts
  inventory.controller.ts
  inventory.controller.spec.ts
  inventory-items.controller.ts
  inventory-items.controller.spec.ts
  material-rolls.controller.ts
  material-rolls.controller.spec.ts
  inventory.module.ts
  index.ts
```

**Tokens DI:**

```ts
INVENTORY_REPOSITORY
INVENTORY_ITEM_REPOSITORY
MATERIAL_ROLL_REPOSITORY
INVENTORY_USAGE_REPOSITORY
```

**Archivos nuevos en `work-orders/`:**

```
work-order-usages.controller.ts
work-order-usages.controller.spec.ts
```

---

## Testing Strategy

Sin mocks de Prisma. Todos los specs usan repositorios in-memory.

### `inventory.service.spec.ts`

**Items:**

- `createItem` crea `InventoryItem` con `type = ITEM`
- `updateItem` modifica campos; `null` limpia `supplierId`, `brandId`, `lowStockAlert`
- `removeItem` elimina si sin usages activos
- `removeItem` 409 si hay usages en órdenes activas
- `findAll` filtra por `type`
- `findAll` filtra por `lowStock` (solo items con `stock <= lowStockAlert`)
- `findAll` no retorna inventario de otra branch

**Rolls:**

- `createRoll` crea `MaterialRoll` con `type = ROLL`
- `updateRoll` modifica campos; `null` limpia `supplierId`, `brandId`, `lotNumber`
- `removeRoll` elimina si sin usages activos
- `removeRoll` 409 si hay usages en órdenes activas

**InventoryUsage:**

- `maybeCreateUsage` no crea si `defaultInventoryId` es null
- `maybeCreateUsage` crea usage con `costAtUsage = inventory.unitCost` (snapshot)
- `updateUsage` modifica `quantityUsed`
- `updateUsage` 404 si usage no pertenece a la orden
- `commitUsages` decrementa `stock` de `InventoryItem`
- `commitUsages` decrementa `remainingLength` de `MaterialRoll`
- `commitUsages` incluye warning si stock queda negativo
- `commitUsages` incluye warning si `stock <= lowStockAlert` post-decremento
- `commitUsages` completa con éxito aunque haya warnings
- `deleteUsagesByWorkOrder` elimina todos los usages sin tocar stock

### Controller specs

Un test por endpoint, service mockeado con `jest.fn()`. Se verifica que `branchId` viene del token.

### Cambios en `work-orders.service.spec.ts`

- `addItem` llama `inventoryService.maybeCreateUsage(workOrderId, serviceId)`
- `updateStatus → COMPLETED` llama `inventoryService.commitUsages(workOrderId)` y propaga warnings
- `updateStatus → CANCELLED` llama `inventoryService.deleteUsagesByWorkOrder(workOrderId)`

---

## Error Responses — Resumen

| Situación                             | HTTP | `error`                     |
| ------------------------------------- | ---- | --------------------------- |
| DTO inválido                          | 400  | validation error            |
| Sin rol requerido                     | 403  | —                           |
| Inventario no existe o es de otra org | 404  | `inventory_not_found`       |
| Usage no existe en la orden           | 404  | `inventory_usage_not_found` |
| Orden no existe o es de otra org      | 404  | `work_order_not_found`      |
| Inventario con usages activos         | 409  | `inventory_in_use`          |
| Orden en estado terminal              | 409  | `work_order_closed`         |

Los 404 son uniformes — no revelan si el recurso existe en otra branch/org.

---

## Files Changed

| Acción | Archivo                                                                                                |
| ------ | ------------------------------------------------------------------------------------------------------ |
| Modify | `packages/database/prisma/schema.prisma` (agregar `defaultInventoryId`, `defaultQuantity` a `Service`) |
| New    | `packages/database/prisma/migrations/TIMESTAMP_add_service_default_inventory/`                         |
| Modify | `apps/api/tsconfig.paths.json` (agregar `@inventory`, `@inventory/dto`, `@inventory/interfaces`)       |
| Modify | `apps/api/package.json` (jest moduleNameMapper)                                                        |
| Modify | `apps/api/src/app.module.ts`                                                                           |
| Modify | `apps/api/src/work-orders/work-orders.service.ts` (llamadas a InventoryService)                        |
| Modify | `apps/api/src/work-orders/work-orders.service.spec.ts` (tests adicionales)                             |
| Modify | `apps/api/src/work-orders/work-orders.module.ts` (importar InventoryModule)                            |
| New    | `apps/api/src/work-orders/work-order-usages.controller.ts`                                             |
| New    | `apps/api/src/work-orders/work-order-usages.controller.spec.ts`                                        |
| New    | `apps/api/src/inventory/` (todos los archivos del módulo — ver Module Structure)                       |
