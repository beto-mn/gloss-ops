# Customer Assets Module — CRUD with Soft Delete

## Context

`Customer` is org-scoped and shared across branches. The next layer down — physical things customers bring to the shop — has no API yet. Without a `customer-assets` module, no work order can be tied to anything tangible. This plan ships the CRUD module so a customer's vehicles, motorcycles, boats, and other assets can be registered, listed, updated, and (soft-)deleted.

Two refinements were locked in during design:

1. **`assetType` is a closed enum with an `OTHER` escape hatch.** When the user picks `OTHER`, a free-form `customAssetType` string becomes required so the value is still searchable and reportable.
2. **`identifier` is unique within an organization, scoped by `country`.** A Mexican plate "ABC-123" and a US plate "ABC-123" are different real-world objects; without `country` we cannot tell them apart. Uniqueness is enforced at the application layer only when both `country` and `identifier` are provided.

**Design decisions locked in:**

- **Endpoint shape — mixed.** Create/list-by-customer is nested under the customer (`POST/GET /customers/:customerId/assets`). Read/update/delete by id is flat (`GET/PATCH/DELETE /customer-assets/:id`).
- **Soft delete pattern A.** `DELETE /customer-assets/:id` flips `status` to `DELETED`. Owner can pass `?permanent=true` to hard delete. No cron job (matches `customers`).
- **`assetType` enum + custom escape hatch.** New Prisma enum `AssetType` with `VEHICLE | MOTORCYCLE | BOAT | JET_SKI | TRUCK | OTHER`. `customAssetType` is `String?` and validated as required at the service level when `assetType === OTHER`.
- **`identifier` + `country`.** Both are independently optional. When both are present, uniqueness `(organizationId, country, identifier)` is enforced at the application layer (matches the customer email/phone pattern).
- **Brand validation (multi-tenant safe).** When `brandId` is provided, the brand must exist **and** either belong to the caller's organization (`brand.organizationId === currentOrg`) or be system-seeded (`brand.organizationId IS NULL`). Otherwise → `404 brand_not_found`.
- **Customer validation.** Every mutation validates that the target customer exists and is ACTIVE in the caller's organization → `404 customer_not_found`.
- **`metadata`** stays a free-form JSON column for now — no per-`assetType` validation in this iteration.

**Expected outcome:**

- `customer_asset` gains `status`, `deletedAt`, `customAssetType`, `country`; `asset_type` is migrated from `String` to the new `AssetType` enum.
- `apps/api/src/customer-assets/` exists with the standard repository pattern (interface + Prisma + in-memory + tokens + module).
- Endpoints registered in `AppModule` and visible in Swagger UI.
- 5 cross-cutting validations enforced (customer-in-org, brand-in-org, assetType-OTHER-requires-customAssetType, identifier+country uniqueness, status filter on list).
- Test counts grow without breaking any existing spec.

---

## Files To Modify

### Schema & migration (`packages/database/`)

- **`prisma/schema.prisma`** — add a new enum and modify the `CustomerAsset` model:

  ```prisma
  enum AssetType {
    VEHICLE
    MOTORCYCLE
    BOAT
    JET_SKI
    TRUCK
    OTHER
  }

  model CustomerAsset {
    id              String         @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
    customerId      String         @map("customer_id") @db.Uuid
    brandId         String?        @map("brand_id") @db.Uuid
    assetType       AssetType      @map("asset_type")                       // CHANGED — was String
    customAssetType String?        @map("custom_asset_type")                // NEW
    model           String?
    year            Int?
    identifier      String?
    country         String?        @db.VarChar(2)                           // NEW (ISO 3166-1 alpha-2)
    color           String?
    metadata        Json?
    note            String?
    status          ResourceStatus @default(ACTIVE)                          // NEW
    deletedAt       DateTime?      @map("deleted_at")                       // NEW
    createdAt       DateTime       @default(now()) @map("created_at")
    updatedAt       DateTime       @updatedAt @map("updated_at")

    customer   Customer    @relation(fields: [customerId], references: [id])
    brand      Brand?      @relation(fields: [brandId], references: [id])
    workOrders WorkOrder[]

    @@map("customer_asset")
  }
  ```

- **New migration** `20260429_add_customer_asset_soft_delete_enum`:

  ```sql
  -- Create enum
  CREATE TYPE "AssetType" AS ENUM ('VEHICLE', 'MOTORCYCLE', 'BOAT', 'JET_SKI', 'TRUCK', 'OTHER');

  -- Migrate asset_type column from String to enum (best-effort mapping; unknown values become OTHER)
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

  -- Add new columns
  ALTER TABLE "customer_asset" ADD COLUMN "custom_asset_type" VARCHAR(50);
  ALTER TABLE "customer_asset" ADD COLUMN "country" VARCHAR(2);
  ALTER TABLE "customer_asset" ADD COLUMN "status" "ResourceStatus" NOT NULL DEFAULT 'ACTIVE';
  ALTER TABLE "customer_asset" ADD COLUMN "deleted_at" TIMESTAMP(3);
  ```

- **`prisma/seed.ts`** — no change needed (the seed currently does not insert customer assets). If it did, those seed rows would migrate via the SQL above.

### TS path aliases (`apps/api/`)

- **`tsconfig.paths.json`** — add three entries (alphabetically near `@customers`):

  ```json
  "@customer-assets": ["./src/customer-assets/index.ts"],
  "@customer-assets/dto": ["./src/customer-assets/dto/index.ts"],
  "@customer-assets/interfaces": ["./src/customer-assets/interfaces/index.ts"]
  ```

- **`apps/api/package.json`** — mirror the same three aliases in `jest.moduleNameMapper`.

### New module (`apps/api/src/customer-assets/`)

```
customer-assets/
├── dto/
│   ├── create-customer-asset.dto.ts
│   ├── update-customer-asset.dto.ts
│   ├── list-customer-assets.dto.ts
│   └── index.ts
├── infrastructure/
│   ├── prisma-customer-asset.repository.ts
│   ├── in-memory-customer-asset.repository.ts
│   ├── in-memory-customer-asset.repository.spec.ts
│   └── index.ts
├── interfaces/
│   ├── customer-asset.repository.interface.ts
│   └── index.ts
├── customer-assets.tokens.ts
├── customer-assets.module.ts
├── customer-assets.controller.ts            # /customer-assets/:id  (read/update/delete)
├── customer-assets.controller.spec.ts
├── customer-assets-nested.controller.ts     # /customers/:customerId/assets  (create/list)
├── customer-assets-nested.controller.spec.ts
├── customer-assets.service.ts
├── customer-assets.service.spec.ts
└── index.ts
```

#### `customer-assets.tokens.ts`

```ts
export const CUSTOMER_ASSET_REPOSITORY = Symbol(
  'CustomerAssetRepositoryInterface'
)
```

#### `interfaces/customer-asset.repository.interface.ts`

```ts
import type { Prisma, AssetType, ResourceStatus } from '@glossops/database'

export interface CreateCustomerAssetData {
  assetType: AssetType
  customAssetType?: string
  brandId?: string
  model?: string
  year?: number
  identifier?: string
  country?: string
  color?: string
  metadata?: Prisma.JsonValue
  note?: string
}

export interface UpdateCustomerAssetData {
  assetType?: AssetType
  customAssetType?: string | null
  brandId?: string | null
  model?: string | null
  year?: number | null
  identifier?: string | null
  country?: string | null
  color?: string | null
  metadata?: Prisma.JsonValue | null
  note?: string | null
}

export type CustomerAssetStatusFilter = ResourceStatus | 'ALL'

export interface CustomerAssetQuery {
  status: CustomerAssetStatusFilter
  search?: string
  assetType?: AssetType
  page: number
  limit: number
}

export interface CustomerAssetPageMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface CustomerAssetPage {
  data: Prisma.CustomerAssetModel[]
  meta: CustomerAssetPageMeta
}

export interface CustomerAssetRepositoryInterface {
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

- `findById` filters by `status = ACTIVE` and joins to `customer.organizationId === organizationId`.
- `findAllByCustomer` honors `status` filter (`ACTIVE | DELETED | ALL`); the controller resolves the default of `ACTIVE`.
- `findByIdentifier` supports the uniqueness check; only invoked when both `country` and `identifier` are non-null.
- `customerExistsInOrg` checks the customer is ACTIVE in the org — keeps the module self-contained.
- `findBrandForOrg` returns the brand only if `organizationId IS NULL` (system-seeded) or matches the caller's org.

#### `infrastructure/prisma-customer-asset.repository.ts`

Standard Prisma implementation. Notes:

- `findById` uses a relation filter:
  ```ts
  prisma.customerAsset.findFirst({
    where: {
      id,
      status: ResourceStatus.ACTIVE,
      customer: { organizationId, status: ResourceStatus.ACTIVE },
    },
  })
  ```
- `findAllByCustomer` filters via `customer: { organizationId, status: ACTIVE }` to enforce tenant scoping in the same query.
- `findBrandForOrg`:
  ```ts
  prisma.brand.findFirst({
    where: {
      id: brandId,
      OR: [{ organizationId: null }, { organizationId }],
    },
  })
  ```
- `softDelete`: `updateMany({ where: { id, customer: { organizationId } }, data: { status: DELETED, deletedAt: new Date() } })` then re-read.
- `delete`: `deleteMany({ where: { id, customer: { organizationId } } })`.

#### `infrastructure/in-memory-customer-asset.repository.ts`

Backed by a `Map<string, CustomerAssetModel>` plus `seedCustomers(...)` and `seedBrands(...)` helpers (mirrors the cascade-style seeding used in `InMemoryOrganizationRepository`). The in-memory repo holds:

- `assets: Map<string, CustomerAssetModel>`
- `customers: Map<string, { id; organizationId; status }>` (seeded by tests)
- `brands: Map<string, { id; organizationId | null }>` (seeded by tests)

Filtering by `customer.organizationId` in `findById`/`findAllByCustomer` is done by looking up the seeded customer; if missing, returns null/empty.

#### `dto/create-customer-asset.dto.ts`

```ts
import {
  IsOptional,
  IsString,
  IsInt,
  IsEnum,
  IsUUID,
  IsObject,
  MaxLength,
  MinLength,
  Min,
  Max,
  Length,
} from 'class-validator'
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger'

import { AssetType } from '@glossops/database'

export class CreateCustomerAssetDto {
  @ApiProperty({ enum: AssetType, example: AssetType.VEHICLE })
  @IsEnum(AssetType)
  assetType: AssetType

  @ApiPropertyOptional({
    example: 'Drone',
    maxLength: 50,
    description: 'Required when assetType === OTHER',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  customAssetType?: string

  @ApiPropertyOptional({ example: 'd3f5...uuid' })
  @IsOptional()
  @IsUUID()
  brandId?: string

  @ApiPropertyOptional({ example: 'Civic', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  model?: string

  @ApiPropertyOptional({ example: 2023, minimum: 1900, maximum: 2100 })
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  year?: number

  @ApiPropertyOptional({ example: '3VWFE21C04M000001', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  identifier?: string

  @ApiPropertyOptional({ example: 'MX', minLength: 2, maxLength: 2 })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  country?: string

  @ApiPropertyOptional({ example: 'Black', maxLength: 30 })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  color?: string

  @ApiPropertyOptional({ description: 'Free-form domain-specific fields' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>

  @ApiPropertyOptional({
    example: 'Slight scratch on rear bumper',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string
}
```

#### `dto/update-customer-asset.dto.ts`

```ts
export class UpdateCustomerAssetDto extends PartialType(
  CreateCustomerAssetDto
) {}
```

#### `dto/list-customer-assets.dto.ts`

`status` (default `ACTIVE`), `assetType` filter, `search` (matches `model`, `identifier`, `color`, `note`), `page`, `limit`.

#### `customer-assets.service.ts`

Key methods:

- `create(organizationId, customerId, data)`:
  1. `customerExistsInOrg(customerId, organizationId)` → 404 `customer_not_found` if false.
  2. If `data.assetType === AssetType.OTHER` and no `customAssetType` → 422 `custom_asset_type_required`.
  3. If `data.assetType !== AssetType.OTHER` and `data.customAssetType` → 422 `custom_asset_type_not_allowed` (so the field is only filled when relevant; alternative: silently null it — pick the strict version for clearer errors).
  4. If `data.brandId` → `findBrandForOrg(...)` → 404 `brand_not_found` if null.
  5. If `data.identifier && data.country` → `findByIdentifier(country, identifier, organizationId)` → 409 `identifier_already_exists` if hit.
  6. `repository.create(customerId, data)`.

- `findAllByCustomer(organizationId, customerId, dto)`:
  1. `customerExistsInOrg` → 404 `customer_not_found`.
  2. Defaults `status` to `ACTIVE`.
  3. `repository.findAllByCustomer(...)`.

- `findOne(id, organizationId)`:
  1. `repository.findById(id, organizationId)` → 404 `customer_asset_not_found`.

- `update(id, organizationId, data)`:
  1. `findOne` to confirm existence.
  2. Compute `effectiveAssetType` = `data.assetType ?? current.assetType`.
  3. Re-validate the OTHER/customAssetType combo against the merged state.
  4. Re-validate brand if `brandId` is in `data`.
  5. Re-validate identifier uniqueness if `identifier` or `country` is in `data` and the merged pair is fully populated and differs from the current value.
  6. `repository.update(...)`.

- `remove(id, organizationId, permanent)`:
  - `permanent=true` → `repository.delete`; rethrow as 404 if missing.
  - else → `findOne` then `repository.softDelete`.

#### `customer-assets-nested.controller.ts` — nested under customer

```ts
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

#### `customer-assets.controller.ts` — flat by id

```ts
@ApiTags('Customer Assets')
@ApiBearerAuth()
@Controller('customer-assets')
export class CustomerAssetsController {
  constructor(private readonly service: CustomerAssetsService) {}

  @Get(':id')
  findOne(@CurrentAccount() account: AuthContext, @Param('id') id: string) {
    return this.service.findOne(id, account.organizationId!)
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.MANAGER, Role.FRONT_DESK)
  update(
    @CurrentAccount() account: AuthContext,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerAssetDto
  ) {
    return this.service.update(id, account.organizationId!, dto)
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles(Role.OWNER, Role.MANAGER)
  remove(
    @CurrentAccount() account: AuthContext,
    @Param('id') id: string,
    @Query('permanent') permanent?: string
  ) {
    const isPermanent = permanent === 'true'
    if (isPermanent && account.role !== Role.OWNER) {
      throw new ForbiddenException({ error: 'forbidden' })
    }
    return this.service.remove(id, account.organizationId!, isPermanent)
  }
}
```

(Mirrors the customers-controller `?permanent=true` Owner check at `customers.controller.ts:79-93`.)

#### `customer-assets.module.ts`

```ts
@Module({
  imports: [PrismaModule],
  controllers: [CustomerAssetsController, CustomerAssetsNestedController],
  providers: [
    {
      provide: CUSTOMER_ASSET_REPOSITORY,
      useClass: PrismaCustomerAssetRepository,
    },
    CustomerAssetsService,
  ],
})
export class CustomerAssetsModule {}
```

### Wire the module (`apps/api/src/app.module.ts`)

- Import `CustomerAssetsModule` and add it to the `imports` array next to `BranchesModule`.

### Tests

All specs use the in-memory repository.

- **`infrastructure/in-memory-customer-asset.repository.spec.ts`** — every method exercised; cascading `customer.organizationId` filtering verified.
- **`customer-assets.service.spec.ts`**:
  - `create` happy path
  - `create` rejects when customer is missing or in another org → 404
  - `create` rejects when `assetType === OTHER` without `customAssetType` → 422
  - `create` rejects when `brandId` is foreign or unknown → 404
  - `create` rejects on duplicate `(country, identifier)` within the org → 409
  - `findAllByCustomer` defaults `status` to `ACTIVE`; honors `DELETED` and `ALL`
  - `findOne` 404 for foreign org or DELETED record
  - `update` re-runs all validations against the merged state
  - `remove` soft / hard / Owner-only behavior
- **`customer-assets-nested.controller.spec.ts`** — RBAC and DTO wiring for nested routes.
- **`customer-assets.controller.spec.ts`** — RBAC, `?permanent=true` Owner-only behavior (mirrors `customers.controller.spec.ts`).

---

## Implementation Order

1. **Schema** — add `AssetType` enum, migrate `customer_asset.asset_type` to the enum, add `customAssetType`, `country`, `status`, `deletedAt`. Run the migration; regenerate the Prisma client.
2. **Path aliases** — `tsconfig.paths.json` + Jest mapper.
3. **Interfaces, DTOs, tokens** — types-only foundation.
4. **In-memory repository + spec** — TDD-friendly, no DB.
5. **Prisma repository** — same surface as the in-memory one.
6. **Service + spec** — encodes the 5 cross-cutting validations.
7. **Controllers + specs** — both nested and flat.
8. **Module wiring** — `CustomerAssetsModule`, register in `AppModule`.
9. **Verification** — lint, build, full test suite, manual smoke via Swagger UI.

Each step compiles independently. Steps 4–7 each pass `pnpm test` before moving on.

---

## Verification

From the monorepo root:

```bash
# 1. Apply migration and regenerate Prisma client
cd packages/database
DATABASE_URL=$(grep DATABASE_URL ../../.env | head -1 | cut -d= -f2- | tr -d '"') \
  pnpm prisma migrate deploy
pnpm prisma generate
pnpm build

# 2. Lint, typecheck, full suite
cd ../../apps/api && pnpm lint && pnpm test
```

**Manual end-to-end via Swagger UI (`http://localhost:4000/docs`):**

1. Register an org, create a customer (or use the seed). Capture `customerId`.
2. `POST /customers/:customerId/assets` with `{ assetType: "VEHICLE", model: "Civic", year: 2023, identifier: "ABC-123", country: "MX" }` → 201.
3. Same call again with the same `(country, identifier)` → 409 `identifier_already_exists`.
4. Same `identifier` but `country: "US"` → 201 (different country = different asset).
5. `POST` with `{ assetType: "OTHER" }` (no `customAssetType`) → 422 `custom_asset_type_required`.
6. `POST` with a `brandId` from a **different organization** → 404 `brand_not_found`.
7. `POST` with a system-seeded `brandId` (`organization_id IS NULL`) → 201.
8. `GET /customers/:customerId/assets` returns the ACTIVE assets; `?status=DELETED` and `?status=ALL` work.
9. `PATCH /customer-assets/:id` rename `model`, then attempt to switch to `assetType: "OTHER"` without `customAssetType` → 422.
10. `DELETE /customer-assets/:id` (Manager) → 204; row's `status = DELETED`; `GET /customer-assets/:id` → 404.
11. `DELETE /customer-assets/:id?permanent=true` (Manager) → 403; (Owner) → 204; row is gone.

---

## Out of Scope

- Per-`assetType` validation of `metadata` (e.g., trim level only on vehicles, hull type only on boats).
- Restoring a soft-deleted asset (`POST /customer-assets/:id/restore`).
- A search endpoint across all assets in the org (not nested under a customer). Easy follow-up — can list directly via the repository's `findAllByOrg` if added later.
- A `brands` CRUD module — current plan validates against the existing `brand` table without exposing CRUD.
- File uploads (photos of the asset) — handled when `asset_checkpoint` lands.
