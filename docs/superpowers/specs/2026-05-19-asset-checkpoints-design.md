# Asset Checkpoints Module — Design Spec

**Status:** Approved
**Date:** 2026-05-19
**Branch:** feat/asset-checkpoints

---

## Goal

Expose CRUD over asset checkpoints scoped to a work order. A checkpoint captures the condition of a vehicle at two key moments — reception (when the vehicle arrives) and delivery (when it is returned to the customer) — recording mileage, fuel level, general condition, photos, and an optional customer signature.

---

## Architecture

Repository pattern — one repository, one service, one controller. `AssetCheckpointsModule` imports `WorkOrdersModule` to call `WorkOrdersService.findOne()` for ownership validation and status checks before any write operation.

**Scope:** `AssetCheckpoint` is scoped to a `WorkOrder`, which is branch-scoped. Ownership is verified by resolving the WO through the caller's `branchId`.

---

## File Structure

```
apps/api/src/asset-checkpoints/
  interfaces/
    asset-checkpoint.repository.interface.ts
    index.ts
  infrastructure/
    prisma-asset-checkpoint.repository.ts
    in-memory-asset-checkpoint.repository.ts
  dto/
    create-asset-checkpoint.dto.ts
    update-asset-checkpoint.dto.ts
    index.ts
  asset-checkpoints.tokens.ts
  asset-checkpoints.service.ts
  asset-checkpoints.service.spec.ts
  asset-checkpoints.controller.ts
  asset-checkpoints.module.ts
  index.ts
```

---

## Endpoints

| Method   | Path                                        | Description               | Roles          |
| -------- | ------------------------------------------- | ------------------------- | -------------- |
| `POST`   | `/work-orders/:workOrderId/checkpoints`     | Create a checkpoint       | ALL            |
| `GET`    | `/work-orders/:workOrderId/checkpoints`     | List checkpoints for a WO | ALL            |
| `GET`    | `/work-orders/:workOrderId/checkpoints/:id` | Get a single checkpoint   | ALL            |
| `PATCH`  | `/work-orders/:workOrderId/checkpoints/:id` | Update a checkpoint       | OWNER, MANAGER |
| `DELETE` | `/work-orders/:workOrderId/checkpoints/:id` | Delete a checkpoint       | OWNER, MANAGER |

---

## Validation Rules

**On `POST`:**

1. Resolve WO via `WorkOrdersService.findOne(workOrderId, account.organizationId)` → 404 if not found or wrong org
2. If WO status is `CANCELLED` → 409 `work_order_cancelled`
3. If `type` is `RECEPTION` and WO status is `COMPLETED` → 409 `work_order_completed`
4. If a checkpoint with the same `(workOrderId, type)` already exists → 409 `checkpoint_already_exists`

**On `PATCH` / `DELETE`:**

1. Resolve WO via `WorkOrdersService.findOne(workOrderId, account.organizationId)` → 404 if not found
2. Find checkpoint by `id` → 404 `checkpoint_not_found` if missing
3. Verify `checkpoint.workOrderId === workOrderId` from the URL path → 404 if mismatch (prevents cross-WO access)

No status re-validation on update or delete — admin-level users (`OWNER`, `MANAGER`) can correct a checkpoint regardless of WO state.

---

## Data Shapes

### `AssetCheckpointRecord`

```typescript
interface AssetCheckpointRecord {
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
```

### DTOs

**`CreateAssetCheckpointDto`**

```typescript
{
  type: CheckpointType           // required, IsEnum
  mileage?: number               // optional, IsInt, Min(0)
  fuelLevel?: FuelLevel          // optional, IsEnum
  generalCondition: AssetCondition  // required, IsEnum
  note?: string                  // optional, IsString
  photo?: string[]               // optional, IsArray, IsUrl each element
  customerSignatureUrl?: string  // optional, IsUrl
}
```

**`UpdateAssetCheckpointDto`** (all optional, `type` not updatable)

```typescript
{
  mileage?: number | null
  fuelLevel?: FuelLevel | null
  generalCondition?: AssetCondition
  note?: string | null
  photo?: string[]
  customerSignatureUrl?: string | null
}
```

No `ListAssetCheckpointsDto` — a WO has at most 2 checkpoints; the list endpoint returns a plain array.

---

## Repository Interface

```typescript
interface AssetCheckpointRepositoryInterface {
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

### `CreateAssetCheckpointData`

```typescript
interface CreateAssetCheckpointData {
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
```

### `UpdateAssetCheckpointData`

```typescript
interface UpdateAssetCheckpointData {
  mileage?: number | null
  fuelLevel?: FuelLevel | null
  generalCondition?: AssetCondition
  note?: string | null
  photo?: string[]
  customerSignatureUrl?: string | null
}
```

---

## Error Handling

| Condition                                         | Code | Error key                   |
| ------------------------------------------------- | ---- | --------------------------- |
| WO not found for caller's org                     | 404  | `work_order_not_found`      |
| WO is CANCELLED                                   | 409  | `work_order_cancelled`      |
| WO is COMPLETED and type is RECEPTION             | 409  | `work_order_completed`      |
| Checkpoint already exists for (workOrderId, type) | 409  | `checkpoint_already_exists` |
| Checkpoint not found                              | 404  | `checkpoint_not_found`      |

---

## Testing Strategy

`AssetCheckpointsService` spec uses `InMemoryAssetCheckpointRepository`. `WorkOrdersService` is a jest mock.

**Test cases:**

- `create` — creates RECEPTION on active WO; creates DELIVERY on active WO; 409 if WO CANCELLED; 409 if RECEPTION on COMPLETED WO; 409 if checkpoint type already exists
- `findAll` — returns checkpoints for WO
- `findOne` — 404 if not found
- `update` — updates fields; 404 if not found
- `remove` — deletes; 404 if not found

---

## Module Wiring

```typescript
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

`WorkOrdersModule` must add `exports: [WorkOrdersService]` so `AssetCheckpointsModule` can inject it.

`AppModule` adds `AssetCheckpointsModule` to imports after `WorkOrdersModule`.

Path aliases added to `tsconfig.paths.json` and Jest `moduleNameMapper`:

- `@asset-checkpoints`
- `@asset-checkpoints/dto`
- `@asset-checkpoints/interfaces`
