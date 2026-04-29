# Customer Assets Module — Design Spec

**Date:** 2026-04-28
**Status:** Draft

---

## Goal

Expose `CustomerAsset` as a first-class CRUD module so the physical objects a customer brings to the shop — vehicles, motorcycles, boats, jet skis, trucks, and miscellaneous items — can be registered, listed, updated, and (soft-)deleted via the API. Without this module, no work order can be tied to a tangible thing.

The module sits between two already-built layers (`customers` upstream, `work-orders` downstream) and is a hard prerequisite for the work-orders module: a work order references `customer_asset.id`, so we cannot ship work-orders before assets are addressable.

Two design refinements shaped the data model:

1. **`assetType` is a closed enum (`VEHICLE | MOTORCYCLE | BOAT | JET_SKI | TRUCK | OTHER`) plus a `customAssetType` escape-hatch string.** A closed enum keeps reporting and grouping reliable; the escape hatch (required only when `assetType === OTHER`) absorbs the long tail (drone, helicopter, golf cart) without an enum migration each time.
2. **`identifier` uniqueness is scoped by `country`.** A Mexican plate "ABC-123" and a US plate "ABC-123" are different real-world objects. Without `country` we cannot enforce uniqueness without false positives across borders. The pair `(organizationId, country, identifier)` is the only meaningful uniqueness key.

---

## Background

The `customer_asset` table currently has no `status`, no `deletedAt`, no `country`, no `customAssetType`, and `asset_type` is a free `String`. There are no service- or repository-layer rules about brand/customer ownership.

Two real-world constraints shaped the design:

- **Multi-tenant brand catalog.** `Brand` rows can be either system-seeded (`organizationId IS NULL`, visible to every tenant) or org-private (e.g. a custom wrap-film brand a shop added). When a customer-asset references a brand, the API must accept system-seeded and same-org brands and reject foreign ones. Otherwise an org could probe the existence of another org's private brands by guessing UUIDs.
- **Cross-country plates.** Mexican and US license plates can collide character-for-character without representing the same vehicle. Enforcing global uniqueness on `identifier` alone would block legitimate registrations; ignoring uniqueness entirely would let the same VIN appear twice. `country` resolves both extremes.

A third constraint is more subtle: `assetType` deserves to be an enum because reports ("how many vehicles vs boats serviced this month?") become reliable, but the spectrum of physical things in a wrap/detail/PPF/tint shop is wider than any closed list. The `OTHER` + `customAssetType` pair gives the system a structured majority and a typed minority.

---

## Data Model

A new enum is added:

```prisma
enum AssetType {
  VEHICLE
  MOTORCYCLE
  BOAT
  JET_SKI
  TRUCK
  OTHER
}
```

`CustomerAsset` gains four columns and migrates `asset_type` from `String` to the new enum:

```prisma
model CustomerAsset {
  id              String         @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  customerId      String         @map("customer_id") @db.Uuid
  brandId         String?        @map("brand_id") @db.Uuid
  assetType       AssetType      @map("asset_type")                     // CHANGED — was String
  customAssetType String?        @map("custom_asset_type")              // NEW
  model           String?
  year            Int?
  identifier      String?
  country         String?        @db.VarChar(2)                         // NEW (ISO 3166-1 alpha-2)
  color           String?
  metadata        Json?
  note            String?
  status          ResourceStatus @default(ACTIVE)                       // NEW
  deletedAt       DateTime?      @map("deleted_at")                     // NEW
  createdAt       DateTime       @default(now()) @map("created_at")
  updatedAt       DateTime       @updatedAt @map("updated_at")

  customer   Customer    @relation(fields: [customerId], references: [id])
  brand      Brand?      @relation(fields: [brandId], references: [id])
  workOrders WorkOrder[]

  @@map("customer_asset")
}
```

A single migration covers the changes:

```sql
CREATE TYPE "AssetType" AS ENUM ('VEHICLE', 'MOTORCYCLE', 'BOAT', 'JET_SKI', 'TRUCK', 'OTHER');

ALTER TABLE "customer_asset" ADD COLUMN "asset_type_new" "AssetType";
UPDATE "customer_asset" SET "asset_type_new" = CASE UPPER(REPLACE("asset_type", ' ', '_'))
  WHEN 'VEHICLE'    THEN 'VEHICLE'::"AssetType"
  WHEN 'CAR'        THEN 'VEHICLE'::"AssetType"
  WHEN 'MOTORCYCLE' THEN 'MOTORCYCLE'::"AssetType"
  WHEN 'BOAT'       THEN 'BOAT'::"AssetType"
  WHEN 'JET_SKI'    THEN 'JET_SKI'::"AssetType"
  WHEN 'TRUCK'      THEN 'TRUCK'::"AssetType"
  ELSE 'OTHER'::"AssetType"
END;
ALTER TABLE "customer_asset" DROP COLUMN "asset_type";
ALTER TABLE "customer_asset" RENAME COLUMN "asset_type_new" TO "asset_type";
ALTER TABLE "customer_asset" ALTER COLUMN "asset_type" SET NOT NULL;

ALTER TABLE "customer_asset" ADD COLUMN "custom_asset_type" VARCHAR(50);
ALTER TABLE "customer_asset" ADD COLUMN "country" VARCHAR(2);
ALTER TABLE "customer_asset" ADD COLUMN "status" "ResourceStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "customer_asset" ADD COLUMN "deleted_at" TIMESTAMP(3);
```

Existing rows whose `asset_type` does not match a known string become `OTHER`. There is no `customAssetType` to backfill — operators can patch those rows manually after the migration.

The `(organizationId, country, identifier)` uniqueness is **not** enforced in the database. It is enforced in the service layer, scoped to ACTIVE rows only, and matches the customer email/phone uniqueness pattern (`prisma-customer.repository.ts:84,93`). A DELETED asset does not block a future ACTIVE asset from reusing the same `(country, identifier)` pair.

---

## API Contract

All endpoints require a valid JWT. `organizationId` is read from `request.user.organizationId` — never from the URL or body. The module uses **two controllers** to keep the URL shapes clean:

- `CustomerAssetsNestedController` mounted at `/customers/:customerId/assets` for create + list-by-customer.
- `CustomerAssetsController` mounted at `/customer-assets` for read/update/delete by id.

### `POST /customers/:customerId/assets`

Create a new asset under a customer.

| Situation                                                       | HTTP | Body                                         |
| --------------------------------------------------------------- | ---- | -------------------------------------------- |
| Body fails validation (missing `assetType`, bad enum, …)        | 400  | validation error                             |
| Caller is not Owner / Manager / Front Desk                      | 403  | (existing `Roles` guard)                     |
| Customer missing or in another org                              | 404  | `{ error: 'customer_not_found' }`            |
| `brandId` is unknown or belongs to another org                  | 404  | `{ error: 'brand_not_found' }`               |
| `assetType === OTHER` and `customAssetType` not provided        | 422  | `{ error: 'custom_asset_type_required' }`    |
| `assetType !== OTHER` and `customAssetType` provided            | 422  | `{ error: 'custom_asset_type_not_allowed' }` |
| Both `country` and `identifier` provided and pair already taken | 409  | `{ error: 'identifier_already_exists' }`     |
| Success                                                         | 201  | the created `CustomerAsset`                  |

Body:

```ts
{
  assetType: 'VEHICLE' | 'MOTORCYCLE' | 'BOAT' | 'JET_SKI' | 'TRUCK' | 'OTHER'
  customAssetType?: string  // 1..50 chars, required iff assetType === OTHER
  brandId?: string          // UUID
  model?: string            // ≤ 100 chars
  year?: number             // 1900..2100
  identifier?: string       // ≤ 50 chars
  country?: string          // ISO 3166-1 alpha-2, exactly 2 chars
  color?: string            // ≤ 30 chars
  metadata?: object         // JSON, free-form
  note?: string             // ≤ 500 chars
}
```

### `GET /customers/:customerId/assets`

List assets for a single customer.

Query parameters:

| Param     | Type                       | Default  | Notes                                                            |
| --------- | -------------------------- | -------- | ---------------------------------------------------------------- |
| status    | `ACTIVE \| DELETED \| ALL` | `ACTIVE` | Status filter                                                    |
| assetType | `AssetType`                | —        | Optional enum filter                                             |
| search    | string                     | —        | Case-insensitive match on `model`, `identifier`, `color`, `note` |
| page      | int ≥ 1                    | `1`      | —                                                                |
| limit     | int ∈ [1, 100]             | `20`     | —                                                                |

| Situation                          | HTTP | Body                              |
| ---------------------------------- | ---- | --------------------------------- |
| Customer missing or in another org | 404  | `{ error: 'customer_not_found' }` |
| Success                            | 200  | `{ data, meta }`                  |

### `GET /customer-assets/:id`

Read a single ACTIVE asset.

| Situation                                          | HTTP | Body                                    |
| -------------------------------------------------- | ---- | --------------------------------------- |
| Asset missing, customer in another org, or DELETED | 404  | `{ error: 'customer_asset_not_found' }` |
| Success                                            | 200  | the `CustomerAsset`                     |

### `PATCH /customer-assets/:id`

Update one or more fields on an ACTIVE asset. The validations from `POST` are re-run against the **merged** state (current row + incoming patch), so a partial update cannot leave the row in an invalid combination (e.g. switching to `assetType: OTHER` without supplying `customAssetType`).

| Situation                                            | HTTP | Body                                         |
| ---------------------------------------------------- | ---- | -------------------------------------------- |
| Body fails validation                                | 400  | validation error                             |
| Caller is not Owner / Manager / Front Desk           | 403  | (existing `Roles` guard)                     |
| Asset missing, customer in another org, or DELETED   | 404  | `{ error: 'customer_asset_not_found' }`      |
| `brandId` (when in patch) is unknown or foreign      | 404  | `{ error: 'brand_not_found' }`               |
| Merged state is `OTHER` without `customAssetType`    | 422  | `{ error: 'custom_asset_type_required' }`    |
| Merged state is non-`OTHER` with `customAssetType`   | 422  | `{ error: 'custom_asset_type_not_allowed' }` |
| Merged `(country, identifier)` collides with another | 409  | `{ error: 'identifier_already_exists' }`     |
| Success                                              | 200  | the updated `CustomerAsset`                  |

### `DELETE /customer-assets/:id`

Soft delete by default; Owner-only hard delete via `?permanent=true`.

| Situation                                                 | HTTP | Body                                    |
| --------------------------------------------------------- | ---- | --------------------------------------- |
| Caller is not Owner / Manager (soft) or not Owner (hard)  | 403  | `{ error: 'forbidden' }`                |
| Asset missing, customer in another org, or DELETED (soft) | 404  | `{ error: 'customer_asset_not_found' }` |
| Success                                                   | 204  | (empty)                                 |

This mirrors the customers controller (`customers.controller.ts:79-93`) — Owner is the only role that can hard-delete.

---

## Repository Layer

### Interface

```ts
interface CustomerAssetRepositoryInterface {
  create(
    customerId: string,
    data: CreateCustomerAssetData
  ): Promise<Prisma.CustomerAssetModel>

  findById(
    id: string,
    organizationId: string
  ): Promise<Prisma.CustomerAssetModel | null>

  findAllByCustomer(
    customerId: string,
    organizationId: string,
    query: CustomerAssetQuery
  ): Promise<CustomerAssetPage>

  findByIdentifier(
    country: string,
    identifier: string,
    organizationId: string
  ): Promise<Prisma.CustomerAssetModel | null>

  update(
    id: string,
    organizationId: string,
    data: UpdateCustomerAssetData
  ): Promise<Prisma.CustomerAssetModel>

  softDelete(
    id: string,
    organizationId: string
  ): Promise<Prisma.CustomerAssetModel>

  delete(id: string, organizationId: string): Promise<void>

  // Tenant-validation helpers (kept here to avoid cross-module deps)
  customerExistsInOrg(
    customerId: string,
    organizationId: string
  ): Promise<boolean>

  findBrandForOrg(
    brandId: string,
    organizationId: string
  ): Promise<Prisma.BrandModel | null>
}
```

`findById` and `findAllByCustomer` filter by `status = ACTIVE` (default behavior). `findAllByCustomer` accepts a `status` value of `ALL` to bypass the filter.

The two helpers (`customerExistsInOrg`, `findBrandForOrg`) keep cross-module wiring out of the equation: the customer-assets module owns the validation queries instead of reaching into the customers or brands modules. The cost is one extra query per validation; the benefit is no cross-module DI graph.

### Prisma implementation

- `findById`:

  ```ts
  prisma.customerAsset.findFirst({
    where: {
      id,
      status: ResourceStatus.ACTIVE,
      customer: { organizationId, status: ResourceStatus.ACTIVE },
    },
  })
  ```

  The relation filter on `customer` is what enforces tenant scoping in a single round trip.

- `findAllByCustomer` uses the same relation filter and applies `status` / `assetType` / `search` filters on the asset row.

- `findBrandForOrg`:

  ```ts
  prisma.brand.findFirst({
    where: {
      id: brandId,
      OR: [{ organizationId: null }, { organizationId }],
    },
  })
  ```

  The `OR` is what makes system-seeded brands shareable across tenants.

- `softDelete` does `updateMany({ where: { id, customer: { organizationId } }, data: { status: DELETED, deletedAt: new Date() } })` then re-reads.

- `delete` does `deleteMany({ where: { id, customer: { organizationId } } })`.

### In-memory implementation

A `Map<string, CustomerAssetModel>` plus two seeded reference maps:

- `customers: Map<string, { id; organizationId; status }>` (seeded by tests via `seedCustomers([...])`)
- `brands: Map<string, { id; organizationId | null }>` (seeded by tests via `seedBrands([...])`)

`findById` and `findAllByCustomer` consult the seeded customer map for tenant filtering. `findBrandForOrg` consults the brand map. `findByIdentifier` filters in-memory by the seeded customers' organizationId.

---

## Service Layer

```ts
@Injectable()
export class CustomerAssetsService {
  constructor(
    @Inject(CUSTOMER_ASSET_REPOSITORY)
    private readonly assets: CustomerAssetRepositoryInterface
  ) {}

  async create(
    organizationId: string,
    customerId: string,
    data: CreateCustomerAssetData
  ): Promise<Prisma.CustomerAssetModel> {
    const customerExists = await this.assets.customerExistsInOrg(
      customerId,
      organizationId
    )
    if (!customerExists) {
      throw new NotFoundException({ error: 'customer_not_found' })
    }

    this.assertAssetTypeShape(data.assetType, data.customAssetType)

    if (data.brandId) {
      const brand = await this.assets.findBrandForOrg(
        data.brandId,
        organizationId
      )
      if (!brand) throw new NotFoundException({ error: 'brand_not_found' })
    }

    if (data.country && data.identifier) {
      const collision = await this.assets.findByIdentifier(
        data.country,
        data.identifier,
        organizationId
      )
      if (collision) {
        throw new ConflictException({ error: 'identifier_already_exists' })
      }
    }

    return this.assets.create(customerId, data)
  }

  // …findAllByCustomer / findOne / update / remove follow the same pattern
}
```

The five validations are factored into small private helpers:

- `assertAssetTypeShape(assetType, customAssetType)` — enforces the `OTHER` ↔ `customAssetType` rule. Used by both `create` and `update`. On `update`, it operates on the **merged** state (current row + incoming patch) so a partial update cannot leave the row inconsistent.

- The brand check, customer check, and identifier-collision check each become reusable in `update` with minor adjustments (skip self-collision for identifier; skip brand check if `brandId` not in the patch).

`findOne` is the single source of "exists in this org and is ACTIVE"; mutating methods compose through it so the 404 behavior stays uniform — same pattern as branches/customers.

`remove(id, organizationId, permanent)` mirrors the customers service:

```ts
async remove(id, organizationId, permanent = false): Promise<void> {
  if (permanent) {
    try {
      await this.assets.delete(id, organizationId)
    } catch {
      throw new NotFoundException({ error: 'customer_asset_not_found' })
    }
  } else {
    await this.findOne(id, organizationId)
    await this.assets.softDelete(id, organizationId)
  }
}
```

---

## Controller Layer

Two controllers, one service:

```ts
// /customers/:customerId/assets — create + list-by-customer
@ApiTags('Customer Assets')
@ApiBearerAuth()
@Controller('customers/:customerId/assets')
export class CustomerAssetsNestedController {
  constructor(private readonly service: CustomerAssetsService) {}

  @Post()
  @Roles(Role.OWNER, Role.MANAGER, Role.FRONT_DESK)
  create(
    @CurrentAccount() account: AuthContext,
    @Param('customerId') customerId: string,
    @Body() dto: CreateCustomerAssetDto
  ) {
    return this.service.create(account.organizationId!, customerId, dto)
  }

  @Get()
  findAll(
    @CurrentAccount() account: AuthContext,
    @Param('customerId') customerId: string,
    @Query() dto: ListCustomerAssetsDto
  ) {
    return this.service.findAllByCustomer(
      account.organizationId!,
      customerId,
      dto
    )
  }
}
```

```ts
// /customer-assets/:id — read/update/delete
@ApiTags('Customer Assets')
@ApiBearerAuth()
@Controller('customer-assets')
export class CustomerAssetsController {
  constructor(private readonly service: CustomerAssetsService) {}

  @Get(':id')
  findOne(@CurrentAccount() account, @Param('id') id) { ... }

  @Patch(':id')
  @Roles(Role.OWNER, Role.MANAGER, Role.FRONT_DESK)
  update(...) { ... }

  @Delete(':id')
  @HttpCode(204)
  @Roles(Role.OWNER, Role.MANAGER)
  remove(
    @CurrentAccount() account: AuthContext,
    @Param('id') id: string,
    @Query('permanent') permanent?: string,
  ) {
    const isPermanent = permanent === 'true'
    if (isPermanent && account.role !== Role.OWNER) {
      throw new ForbiddenException({ error: 'forbidden' })
    }
    return this.service.remove(id, account.organizationId!, isPermanent)
  }
}
```

DTO snapshot:

```ts
class CreateCustomerAssetDto {
  @IsEnum(AssetType) assetType: AssetType
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  customAssetType?: string
  @IsOptional() @IsUUID() brandId?: string
  @IsOptional() @IsString() @MaxLength(100) model?: string
  @IsOptional() @IsInt() @Min(1900) @Max(2100) year?: number
  @IsOptional() @IsString() @MaxLength(50) identifier?: string
  @IsOptional() @IsString() @Length(2, 2) country?: string
  @IsOptional() @IsString() @MaxLength(30) color?: string
  @IsOptional() @IsObject() metadata?: Record<string, unknown>
  @IsOptional() @IsString() @MaxLength(500) note?: string
}

class UpdateCustomerAssetDto extends PartialType(CreateCustomerAssetDto) {}

class ListCustomerAssetsDto {
  @IsOptional() @IsIn(['ACTIVE', 'DELETED', 'ALL']) status?:
    | 'ACTIVE'
    | 'DELETED'
    | 'ALL'
  @IsOptional() @IsEnum(AssetType) assetType?: AssetType
  @IsOptional() @IsString() search?: string
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number
}
```

---

## Error Responses

| Situation                                                         | HTTP | Body                                           |
| ----------------------------------------------------------------- | ---- | ---------------------------------------------- |
| DTO validation failure                                            | 400  | (class-validator error)                        |
| Caller lacks the required role for the verb                       | 403  | `{ error: 'forbidden' }` (or guard's response) |
| Customer missing / DELETED / in another org                       | 404  | `{ error: 'customer_not_found' }`              |
| Asset missing / DELETED / customer in another org                 | 404  | `{ error: 'customer_asset_not_found' }`        |
| `brandId` missing / DELETED / belongs to another org              | 404  | `{ error: 'brand_not_found' }`                 |
| `(country, identifier)` collides with another ACTIVE asset        | 409  | `{ error: 'identifier_already_exists' }`       |
| `assetType === OTHER` without `customAssetType` (in merged state) | 422  | `{ error: 'custom_asset_type_required' }`      |
| `assetType !== OTHER` with `customAssetType` (in merged state)    | 422  | `{ error: 'custom_asset_type_not_allowed' }`   |

All 404 messages are uniform regardless of whether the underlying record is missing, in another organization, or soft-deleted, so callers cannot probe foreign IDs.

---

## Testing Strategy

No Prisma mocks. Service, controller, and repository specs use `InMemoryCustomerAssetRepository`.

### In-memory repository spec

- `create` persists with `status = ACTIVE`, `deletedAt = null`.
- `findById` returns `null` for DELETED assets, and for assets whose customer is in another org.
- `findAllByCustomer` honors `status` filter (`ACTIVE | DELETED | ALL`); applies `assetType` and `search`.
- `findByIdentifier` returns `null` for DELETED assets (so the pair can be reused after cleanup).
- `customerExistsInOrg` returns `false` for DELETED customers and customers in another org.
- `findBrandForOrg` returns the brand for system-seeded (`organizationId IS NULL`) and same-org brands; returns `null` for foreign brands.
- `softDelete` flips status and sets `deletedAt`.
- `delete` removes the row entirely.

### Service spec

- `create` happy path
- `create` 404 when customer is missing / DELETED / in another org
- `create` 404 when `brandId` is foreign or unknown
- `create` 422 when `assetType === OTHER` without `customAssetType`
- `create` 422 when `assetType !== OTHER` with `customAssetType`
- `create` 409 when `(country, identifier)` collides
- `create` allows the same `identifier` with a different `country`
- `findAllByCustomer` defaults `status` to `ACTIVE`; honors `DELETED` and `ALL`
- `findOne` 404 for foreign org or DELETED record
- `update` re-runs all validations against the merged state (e.g. switching `assetType` to `OTHER` requires `customAssetType` even if not in the patch)
- `update` does not 409 when the merged identifier matches the row's own current value
- `remove(permanent=false)` soft-deletes; second call → 404
- `remove(permanent=true)` hard-deletes; second call → 404

### Nested controller spec

- DTO validation rejects missing `assetType` (400)
- RBAC: only `OWNER`, `MANAGER`, `FRONT_DESK` reach `create`; any role reaches `findAll`

### Flat controller spec

- DTO validation rejects unknown enum values (400)
- RBAC: `update` → `OWNER | MANAGER | FRONT_DESK`; `remove(soft)` → `OWNER | MANAGER`; `remove(?permanent=true)` → Owner only (mirrors `customers.controller.spec.ts`)

---

## Out of Scope

- Per-`assetType` validation of `metadata` (e.g. trim level only on vehicles, hull type only on boats).
- Restoring a soft-deleted asset (`POST /customer-assets/:id/restore`).
- Org-wide search across all assets (no nested customer) — easy follow-up via `findAllByOrg`.
- A `brands` CRUD module — current plan validates against the existing `brand` table without exposing CRUD.
- File uploads (asset photos) — handled when the `asset_checkpoint` module lands alongside work-orders.
- A 30-day cleanup cron for soft-deleted assets — Pattern A (`?permanent=true`) is sufficient; can be added later without breaking changes.

---

## Files Changed

| Action        | File                                                                                      |
| ------------- | ----------------------------------------------------------------------------------------- |
| Modify        | `packages/database/prisma/schema.prisma`                                                  |
| New migration | `packages/database/prisma/migrations/…add-customer-asset-soft-delete-enum/`               |
| Modify        | `apps/api/tsconfig.paths.json`                                                            |
| Modify        | `apps/api/package.json` (jest moduleNameMapper)                                           |
| Modify        | `apps/api/src/app.module.ts`                                                              |
| New           | `apps/api/src/customer-assets/customer-assets.module.ts`                                  |
| New           | `apps/api/src/customer-assets/customer-assets.tokens.ts`                                  |
| New           | `apps/api/src/customer-assets/customer-assets.controller.ts`                              |
| New           | `apps/api/src/customer-assets/customer-assets.controller.spec.ts`                         |
| New           | `apps/api/src/customer-assets/customer-assets-nested.controller.ts`                       |
| New           | `apps/api/src/customer-assets/customer-assets-nested.controller.spec.ts`                  |
| New           | `apps/api/src/customer-assets/customer-assets.service.ts`                                 |
| New           | `apps/api/src/customer-assets/customer-assets.service.spec.ts`                            |
| New           | `apps/api/src/customer-assets/index.ts`                                                   |
| New           | `apps/api/src/customer-assets/dto/create-customer-asset.dto.ts`                           |
| New           | `apps/api/src/customer-assets/dto/update-customer-asset.dto.ts`                           |
| New           | `apps/api/src/customer-assets/dto/list-customer-assets.dto.ts`                            |
| New           | `apps/api/src/customer-assets/dto/index.ts`                                               |
| New           | `apps/api/src/customer-assets/interfaces/customer-asset.repository.interface.ts`          |
| New           | `apps/api/src/customer-assets/interfaces/index.ts`                                        |
| New           | `apps/api/src/customer-assets/infrastructure/prisma-customer-asset.repository.ts`         |
| New           | `apps/api/src/customer-assets/infrastructure/in-memory-customer-asset.repository.ts`      |
| New           | `apps/api/src/customer-assets/infrastructure/in-memory-customer-asset.repository.spec.ts` |
| New           | `apps/api/src/customer-assets/infrastructure/index.ts`                                    |
