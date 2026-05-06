# Brands Module — CRUD Catalog

## Context

`SuppliersModule` (Ola 1) is complete. `BrandsModule` is the third dependency-free catalog. It
enables `InventoryModule` (which has a nullable `brandId` FK on every stock item). Without it,
inventory items cannot be associated with a brand.

`CustomerAssetsModule` already references `Brand` via a `brandId` FK, but there are currently no
endpoints to manage brands — this module provides them.

`Brand` is org-scoped **with a global tier**: brands with `organizationId = null` and
`isSeeded = true` are pre-seeded system-wide (e.g. Toyota, 3M, Avery Dennison). Org-specific brands
(`isSeeded = false`) are created by the org via the API. Read endpoints return both tiers merged.
Write endpoints only operate on org-specific brands; attempting to mutate a seeded brand returns 403.

**Design decisions locked in:**

- **No activate/deactivate.** The schema has no `isActive` field. Hard delete only, with FK
  protection.
- **`(organizationId, slug)` uniqueness at DB level.** `@@unique([organizationId, slug])` already
  exists in the schema — no migration needed. The repository catches `P2002` →
  `ConflictException({ error: 'slug_already_exists' })`.
- **FK protection on delete.** Catching `P2003` (FK from `CustomerAsset` or `Inventory`) →
  `ConflictException({ error: 'brand_has_references' })`.
- **Seeded brand protection.** Service checks `brand.isSeeded` before any mutation →
  `ForbiddenException({ error: 'brand_is_seeded' })`.
- **Search on name.** Case-insensitive match on `name`. Optional `category` filter.
- **RBAC.** OWNER and MANAGER can create and update. Only OWNER can hard delete. All roles can read.

**Expected outcome:**

- No schema change — `@@unique([organizationId, slug])` already in place.
- `apps/api/src/brands/` exists with the standard repository pattern.
- 5 endpoints registered in `AppModule` and visible in Swagger UI.
- Test suite grows without breaking any existing spec.

---

## Files To Modify

### TS path aliases (`apps/api/`)

- **`tsconfig.paths.json`** — add three entries:

  ```json
  "@brands": ["./src/brands/index.ts"],
  "@brands/dto": ["./src/brands/dto/index.ts"],
  "@brands/interfaces": ["./src/brands/interfaces/index.ts"]
  ```

- **`apps/api/package.json`** — mirror the same three aliases in `jest.moduleNameMapper`.

### New module (`apps/api/src/brands/`)

```
brands/
├── dto/
│   ├── create-brand.dto.ts
│   ├── update-brand.dto.ts
│   ├── list-brands.dto.ts
│   └── index.ts
├── infrastructure/
│   ├── prisma-brand.repository.ts
│   ├── in-memory-brand.repository.ts
│   ├── in-memory-brand.repository.spec.ts
│   └── index.ts
├── interfaces/
│   ├── brand.repository.interface.ts
│   └── index.ts
├── brands.tokens.ts
├── brands.module.ts
├── brands.controller.ts
├── brands.controller.spec.ts
├── brands.service.ts
├── brands.service.spec.ts
└── index.ts
```

#### `brands.tokens.ts`

```ts
export const BRAND_REPOSITORY = Symbol('BrandRepositoryInterface')
```

#### `interfaces/brand.repository.interface.ts`

```ts
import type { Prisma } from '@glossops/database'

export interface CreateBrandData {
  name: string
  slug: string
  category: string
  logoUrl?: string
}

export interface UpdateBrandData {
  name?: string
  slug?: string
  category?: string
  logoUrl?: string | null
}

export interface BrandQuery {
  search?: string
  category?: string
  page: number
  limit: number
}

export interface BrandPageMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface BrandPage {
  data: Prisma.BrandModel[]
  meta: BrandPageMeta
}

export interface BrandRepositoryInterface {
  create(
    organizationId: string,
    data: CreateBrandData
  ): Promise<Prisma.BrandModel>

  findById(
    id: string,
    organizationId: string
  ): Promise<Prisma.BrandModel | null>

  findAll(organizationId: string, query: BrandQuery): Promise<BrandPage>

  update(
    id: string,
    organizationId: string,
    data: UpdateBrandData
  ): Promise<Prisma.BrandModel>

  delete(id: string, organizationId: string): Promise<void>
}
```

Key behaviors:

- `findById` returns the brand if it belongs to the org **or** if `isSeeded = true` (global).
- `findAll` returns brands belonging to the org **plus** all seeded brands. Ordered by `name ASC`.
- `create` sets `organizationId` to the caller's org and `isSeeded = false`.
- `create` / `update` catch Prisma `P2002` on `brand_organization_id_slug_key` →
  `ConflictException({ error: 'slug_already_exists' })`.
- `delete` catches Prisma `P2003` (FK from `CustomerAsset` or `Inventory`) →
  `ConflictException({ error: 'brand_has_references' })`.

#### `infrastructure/in-memory-brand.repository.ts`

Backed by `Map<string, BrandModel>`. Two tiers in the same map — global brands are loaded via
`seedGlobalBrands([...])`. Seeded reference maps for FK checks:

- `customerAssets: { id: string; brandId: string }[]` — seeded via `seedCustomerAssets([...])`
- `inventory: { id: string; brandId: string }[]` — seeded via `seedInventory([...])`

`findById` and `findAll` include brands where `brand.organizationId === organizationId || brand.isSeeded`.

#### `dto/create-brand.dto.ts`

```ts
export class CreateBrandDto {
  @ApiProperty({ example: 'Avery Dennison', maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string

  @ApiProperty({ example: 'avery-dennison', maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug: string

  @ApiProperty({ example: 'vinyl', maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  category: string

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/avery.png',
    maxLength: 500,
  })
  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  logoUrl?: string
}
```

#### `dto/update-brand.dto.ts`

All fields optional + nullable. Same validations as create.

#### `dto/list-brands.dto.ts`

```ts
export class ListBrandsDto {
  @IsOptional() @IsString() search?: string
  @IsOptional() @IsString() category?: string
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number
}
```

#### `brands.service.ts`

```ts
@Injectable()
export class BrandsService {
  constructor(
    @Inject(BRAND_REPOSITORY)
    private readonly brands: BrandRepositoryInterface
  ) {}

  create(organizationId: string, data: CreateBrandData) {
    return this.brands.create(organizationId, data)
  }

  findAll(organizationId: string, dto: ListBrandsDto): Promise<BrandPage> {
    return this.brands.findAll(organizationId, {
      search: dto.search,
      category: dto.category,
      page: dto.page ?? 1,
      limit: dto.limit ?? 20,
    })
  }

  async findOne(id: string, organizationId: string) {
    const brand = await this.brands.findById(id, organizationId)
    if (!brand) throw new NotFoundException({ error: 'brand_not_found' })
    return brand
  }

  async update(id: string, organizationId: string, data: UpdateBrandData) {
    const brand = await this.findOne(id, organizationId)
    if (brand.isSeeded)
      throw new ForbiddenException({ error: 'brand_is_seeded' })
    return this.brands.update(id, organizationId, data)
  }

  async remove(id: string, organizationId: string): Promise<void> {
    const brand = await this.findOne(id, organizationId)
    if (brand.isSeeded)
      throw new ForbiddenException({ error: 'brand_is_seeded' })
    await this.brands.delete(id, organizationId)
  }
}
```

#### `brands.controller.ts`

Single controller at `/brands` with 5 handlers: `create`, `findAll`, `findOne`, `update`, `remove`.
See spec for full RBAC table.

#### `brands.module.ts`

```ts
@Module({
  imports: [PrismaModule],
  controllers: [BrandsController],
  providers: [
    { provide: BRAND_REPOSITORY, useClass: PrismaBrandRepository },
    BrandsService,
  ],
  exports: [BrandsService],
})
export class BrandsModule {}
```

`BrandsService` is exported so `InventoryModule` can inject it for brand-existence validation.

### Wire the module (`apps/api/src/app.module.ts`)

Import `BrandsModule` and add it to the `imports` array after `SuppliersModule`.

### Tests

All specs use the in-memory repository.

- **`in-memory-brand.repository.spec.ts`** — every method exercised; slug-collision detection within
  same org; global brands visible in `findById` and `findAll`; same slug allowed in different org;
  FK check for delete against both `CustomerAsset` and `Inventory`; `search` on name;
  `category` filter; pagination meta.
- **`brands.service.spec.ts`** — create happy path; 409 on slug collision; `findOne` 404;
  `update` 404, 403 on seeded brand, 409 on slug collision; `remove` 404, 403 on seeded brand,
  409 when referenced, 204 when clean.
- **`brands.controller.spec.ts`** — RBAC for all 5 endpoints; DTO validation (missing `name` → 400;
  invalid `slug` format → 400).

---

## Implementation Order

1. **Path aliases** — `tsconfig.paths.json` + Jest mapper. No schema migration needed.
2. **Interfaces, DTOs, tokens** — types-only foundation.
3. **In-memory repository + spec** — green before moving on.
4. **Prisma repository** — same surface; P2002 and P2003 error handling.
5. **Service + spec** — `findOne` gating + `isSeeded` guard for mutations.
6. **Controller + spec** — RBAC and DTO wiring.
7. **Module wiring** — `BrandsModule`, register in `AppModule`.
8. **Verification** — lint, build, full test suite.

Each step compiles independently. Steps 3–6 each pass `npx jest "brand"` before moving on.

---

## Verification

From `apps/api/`:

```bash
npx jest "brand"   # all brand specs pass
pnpm lint          # no errors
pnpm build         # no TypeScript errors
```

**Manual end-to-end via Swagger UI (`http://localhost:4000/docs`):**

1. Authenticate as Owner. Capture JWT.
2. `GET /brands` → returns all seeded global brands.
3. `POST /brands` with `{ name: "Custom Brand", slug: "custom-brand", category: "vinyl" }` → 201.
4. Same `slug` again → 409 `slug_already_exists`.
5. `GET /brands` → returns seeded brands + the new org-specific brand.
6. `GET /brands?search=custom` → returns 1.
7. `GET /brands?category=vinyl` → returns filtered list.
8. `PATCH /brands/<seeded-id>` → 403 `brand_is_seeded`.
9. `PATCH /brands/<own-id>` with `{ name: "Custom Brand Pro" }` → 200.
10. `DELETE /brands/<own-id>` as Manager → 403.
11. `DELETE /brands/<own-id>` as Owner (no references) → 204.
12. `DELETE /brands/<seeded-id>` as Owner → 403 `brand_is_seeded`.

---

## Out of Scope

- Brand portal or external access.
- Brand logo upload — `logoUrl` is a plain URL string, no file upload.
- Branch-level brand restrictions.
- Seeding the global brands table — handled separately outside this module.
