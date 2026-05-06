# Brands Module — Design Spec

**Date:** 2026-05-05
**Status:** Draft

---

## Goal

Expose `Brand` as a first-class CRUD module so automotive shops can maintain a catalog of brands —
vinyl manufacturers, PPF producers, chemical suppliers, vehicle makes, etc. Without this module,
`InventoryModule` cannot associate stock items with a brand, and `CustomerAssetsModule` (already
built) cannot display brand names from a managed source.

The module merges two tiers of brands: **global seeded brands** (pre-loaded system-wide, read-only
to callers) and **org-specific brands** (created and owned by the organization). All read endpoints
return both tiers merged. Write endpoints only operate on org-specific brands.

---

## Background

The `brand` table already exists in the schema with all required columns and the
`@@unique([organizationId, slug])` constraint. **No schema migration is needed.**

`organizationId` is nullable: `null` means the brand is a global seeded brand shared across all
organizations. `isSeeded = true` marks these brands as system-managed and read-only via API.

Two FK relationships constrain deletes:

- `CustomerAsset.brandId` (optional) — a vehicle can reference a brand.
- `Inventory.brandId` (optional) — a stock item can reference a brand.

Deleting a brand that has either type of reference must be blocked. The Prisma repository catches
`P2003` and converts it to `ConflictException({ error: 'brand_has_references' })`.

---

## Data Model

No changes to the schema. The existing model:

```prisma
model Brand {
  id             String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organizationId String?   @map("organization_id") @db.Uuid   // NULL = global seeded brand
  name           String
  slug           String
  logoUrl        String?   @map("logo_url")
  category       String
  isSeeded       Boolean   @default(false) @map("is_seeded")
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")

  organization   Organization?   @relation(fields: [organizationId], references: [id])
  customerAssets CustomerAsset[]
  inventory      Inventory[]

  @@unique([organizationId, slug])
  @@map("brand")
}
```

---

## API Contract

All endpoints require a valid JWT. `organizationId` is extracted from `request.user.organizationId`
— never from the URL or body. A single controller is mounted at `/brands`.

### `POST /brands`

Create a new org-specific brand.

**Roles:** OWNER, MANAGER

| Situation                       | HTTP | Body                               |
| ------------------------------- | ---- | ---------------------------------- |
| Body fails validation           | 400  | validation error                   |
| Caller is not OWNER or MANAGER  | 403  | —                                  |
| Slug already exists in this org | 409  | `{ error: 'slug_already_exists' }` |
| Success                         | 201  | the created `Brand`                |

Body:

```ts
{
  name: string      // 1–100 chars, required
  slug: string      // 1–100 chars, lowercase kebab-case, required
  category: string  // 1–100 chars, required
  logoUrl?: string  // valid URL, ≤ 500 chars
}
```

`organizationId` is set server-side from the JWT. `isSeeded` is always `false` for API-created brands.

### `GET /brands`

List brands — returns org-specific brands for the caller's org **plus** all seeded global brands,
merged and ordered by `name ASC`.

**Roles:** all

| Param    | Type           | Default | Notes                            |
| -------- | -------------- | ------- | -------------------------------- |
| search   | string         | —       | Case-insensitive match on `name` |
| category | string         | —       | Exact match on `category`        |
| page     | int ≥ 1        | `1`     | —                                |
| limit    | int ∈ [1, 100] | `20`    | —                                |

| Situation | HTTP | Body             |
| --------- | ---- | ---------------- |
| Success   | 200  | `{ data, meta }` |

### `GET /brands/:id`

Read a single brand. Returns the brand if it belongs to the caller's org **or** if it is a seeded
global brand.

**Roles:** all

| Situation                         | HTTP | Body                           |
| --------------------------------- | ---- | ------------------------------ |
| Brand not found or in another org | 404  | `{ error: 'brand_not_found' }` |
| Success                           | 200  | the `Brand`                    |

### `PATCH /brands/:id`

Update one or more fields on an org-specific brand.

**Roles:** OWNER, MANAGER

| Situation                            | HTTP | Body                               |
| ------------------------------------ | ---- | ---------------------------------- |
| Body fails validation                | 400  | validation error                   |
| Caller is not OWNER or MANAGER       | 403  | —                                  |
| Brand is seeded (global)             | 403  | `{ error: 'brand_is_seeded' }`     |
| Brand not found or in another org    | 404  | `{ error: 'brand_not_found' }`     |
| New slug collides with another brand | 409  | `{ error: 'slug_already_exists' }` |
| Success                              | 200  | the updated `Brand`                |

### `DELETE /brands/:id`

Hard delete. Only succeeds when the brand has no `CustomerAsset` or `Inventory` references and is
not a seeded brand.

**Roles:** OWNER only

| Situation                                 | HTTP | Body                                |
| ----------------------------------------- | ---- | ----------------------------------- |
| Caller is not OWNER                       | 403  | —                                   |
| Brand is seeded (global)                  | 403  | `{ error: 'brand_is_seeded' }`      |
| Brand not found or in another org         | 404  | `{ error: 'brand_not_found' }`      |
| Brand has CustomerAsset or Inventory refs | 409  | `{ error: 'brand_has_references' }` |
| Success                                   | 204  | (empty)                             |

---

## Repository Layer

### Interface

```ts
interface BrandRepositoryInterface {
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

Supporting types:

```ts
interface CreateBrandData {
  name: string
  slug: string
  category: string
  logoUrl?: string
}

interface UpdateBrandData {
  name?: string
  slug?: string
  category?: string
  logoUrl?: string | null
}

interface BrandQuery {
  search?: string
  category?: string
  page: number
  limit: number
}

interface BrandPageMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

interface BrandPage {
  data: Prisma.BrandModel[]
  meta: BrandPageMeta
}
```

### Prisma implementation

- `findById` returns brand if it belongs to the org or is seeded:

  ```ts
  prisma.brand.findFirst({
    where: {
      id,
      OR: [{ organizationId }, { isSeeded: true }],
    },
  })
  ```

- `findAll` filters with merged condition:

  ```ts
  prisma.brand.findMany({
    where: {
      OR: [{ organizationId }, { isSeeded: true }],
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
      ...(category ? { category } : {}),
    },
    orderBy: { name: 'asc' },
    skip: (page - 1) * limit,
    take: limit,
  })
  ```

- `create` always sets `organizationId` and `isSeeded: false`:

  ```ts
  prisma.brand.create({
    data: { organizationId, isSeeded: false, ...data },
  })
  ```

- `update` uses `updateMany` scoped to the org (never touches seeded brands):

  ```ts
  prisma.brand.updateMany({ where: { id, organizationId }, data })
  ```

- `create` and `update` catch Prisma error code `P2002` on the
  `brand_organization_id_slug_key` constraint and rethrow as
  `ConflictException({ error: 'slug_already_exists' })`.

- `delete` uses `deleteMany` scoped to the org; catches Prisma error code `P2003`
  (FK from `CustomerAsset` or `Inventory`) and rethrows as
  `ConflictException({ error: 'brand_has_references' })`.

### In-memory implementation

Backed by `Map<string, BrandModel>`. Global brands loaded via `seedGlobalBrands([...])`.
Seeded reference arrays for FK checks:

- `seedCustomerAssets(items: { id: string; brandId: string }[])` — FK from CustomerAsset
- `seedInventory(items: { id: string; brandId: string }[])` — FK from Inventory

`findById` and `findAll` include brands where
`brand.organizationId === organizationId || brand.isSeeded`.

Slug-collision check scans only brands with the same `organizationId` — global brands are in a
separate slug namespace and do not conflict with org-specific slugs.

---

## Service Layer

`findOne` is the single source of "exists in this org or globally" truth. Mutation methods check
`brand.isSeeded` after `findOne` succeeds, before delegating to the repository.

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

---

## Controller Layer

Single controller at `/brands` with 5 handlers:

```ts
@ApiTags('Brands')
@ApiBearerAuth()
@Controller('brands')
export class BrandsController {
  constructor(private readonly service: BrandsService) {}

  @Post()
  @HttpCode(201)
  @Roles(Role.OWNER, Role.MANAGER)
  create(@CurrentAccount() account: AuthContext, @Body() dto: CreateBrandDto) {
    return this.service.create(account.organizationId!, dto)
  }

  @Get()
  findAll(@CurrentAccount() account: AuthContext, @Query() dto: ListBrandsDto) {
    return this.service.findAll(account.organizationId!, dto)
  }

  @Get(':id')
  findOne(@CurrentAccount() account: AuthContext, @Param('id') id: string) {
    return this.service.findOne(id, account.organizationId!)
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  update(
    @CurrentAccount() account: AuthContext,
    @Param('id') id: string,
    @Body() dto: UpdateBrandDto
  ) {
    return this.service.update(id, account.organizationId!, dto)
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles(Role.OWNER)
  remove(@CurrentAccount() account: AuthContext, @Param('id') id: string) {
    return this.service.remove(id, account.organizationId!)
  }
}
```

---

## Error Responses

| Situation                                 | HTTP | Body                                |
| ----------------------------------------- | ---- | ----------------------------------- |
| DTO validation failure                    | 400  | class-validator error               |
| Caller lacks required role                | 403  | (RolesGuard response)               |
| Brand is seeded (global, read-only)       | 403  | `{ error: 'brand_is_seeded' }`      |
| Brand not found or in another org         | 404  | `{ error: 'brand_not_found' }`      |
| Slug already exists in org                | 409  | `{ error: 'slug_already_exists' }`  |
| Brand has CustomerAsset or Inventory refs | 409  | `{ error: 'brand_has_references' }` |

404 messages are uniform regardless of whether the record is missing or belongs to another org —
callers cannot probe foreign IDs. Global seeded brands are visible to all orgs via GET but their
IDs are not secret; 403 `brand_is_seeded` is returned before any 404 logic for mutations.

---

## Testing Strategy

No Prisma mocks. All specs use `InMemoryBrandRepository`.

### In-memory repository spec

- `create` persists with correct `organizationId` and `isSeeded: false`.
- `create` sets optional `logoUrl` to `null` when not provided.
- `create` throws `ConflictException` when slug already exists in the same org.
- `create` allows the same slug in a different org.
- `create` allows the same slug as a global seeded brand (different namespace).
- `findById` returns the brand when it belongs to the org.
- `findById` returns a global seeded brand regardless of org.
- `findById` returns `null` when brand belongs to another org and is not seeded.
- `findAll` returns org-specific brands + seeded brands.
- `findAll` excludes brands from other orgs (but keeps seeded).
- `findAll` filters by `search` on name (case-insensitive).
- `findAll` filters by `category`.
- `findAll` paginates correctly and returns correct meta.
- `update` updates fields and returns updated brand.
- `update` throws `ConflictException` when new slug collides with another brand in the org.
- `update` allows updating slug to its own current slug.
- `delete` removes the brand.
- `delete` throws `ConflictException` when brand has CustomerAsset references.
- `delete` throws `ConflictException` when brand has Inventory references.
- `delete` succeeds when brand has no references.

### Service spec

- `create` happy path.
- `create` 409 when slug already exists.
- `findOne` 404 for missing brand.
- `findOne` returns global seeded brand.
- `update` 404 for missing brand.
- `update` 403 when brand is seeded.
- `update` 409 when new slug collides.
- `remove` 404 for missing brand.
- `remove` 403 when brand is seeded.
- `remove` 409 when brand has references.
- `remove` succeeds when no references and not seeded.

### Controller spec

- `POST /brands` → OWNER and MANAGER can create; TECHNICIAN and FRONT_DESK get 403.
- `GET /brands` → all roles can list.
- `GET /brands/:id` → all roles can read.
- `PATCH /brands/:id` → OWNER and MANAGER only.
- `DELETE /brands/:id` → OWNER only; MANAGER gets 403.
- DTO validation: missing `name` returns 400; invalid `slug` format returns 400.

---

## Out of Scope

- Brand logo upload — `logoUrl` is a plain URL string, no file upload endpoint.
- Brand categories management — `category` is a free-form string.
- Branch-level brand restrictions.
- Seeding global brands — handled separately outside this module.

---

## Files Changed

| Action | File                                                                    |
| ------ | ----------------------------------------------------------------------- |
| Modify | `apps/api/tsconfig.paths.json`                                          |
| Modify | `apps/api/package.json` (jest moduleNameMapper)                         |
| Modify | `apps/api/src/app.module.ts`                                            |
| New    | `apps/api/src/brands/brands.module.ts`                                  |
| New    | `apps/api/src/brands/brands.tokens.ts`                                  |
| New    | `apps/api/src/brands/brands.controller.ts`                              |
| New    | `apps/api/src/brands/brands.controller.spec.ts`                         |
| New    | `apps/api/src/brands/brands.service.ts`                                 |
| New    | `apps/api/src/brands/brands.service.spec.ts`                            |
| New    | `apps/api/src/brands/index.ts`                                          |
| New    | `apps/api/src/brands/dto/create-brand.dto.ts`                           |
| New    | `apps/api/src/brands/dto/update-brand.dto.ts`                           |
| New    | `apps/api/src/brands/dto/list-brands.dto.ts`                            |
| New    | `apps/api/src/brands/dto/index.ts`                                      |
| New    | `apps/api/src/brands/interfaces/brand.repository.interface.ts`          |
| New    | `apps/api/src/brands/interfaces/index.ts`                               |
| New    | `apps/api/src/brands/infrastructure/prisma-brand.repository.ts`         |
| New    | `apps/api/src/brands/infrastructure/in-memory-brand.repository.ts`      |
| New    | `apps/api/src/brands/infrastructure/in-memory-brand.repository.spec.ts` |
| New    | `apps/api/src/brands/infrastructure/index.ts`                           |
