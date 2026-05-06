# Suppliers Module — CRUD Catalog

## Context

`ServicesModule` (Ola 1) is complete. `SuppliersModule` is the second dependency-free catalog. It
enables `InventoryModule` (to track which supplier provides each stock item) and
`PurchaseOrdersModule` (to address orders to a supplier). Without it, neither of those modules can
be implemented.

`Supplier` is org-scoped, has no `isActive` toggle (hard delete only), and exposes 5 standard CRUD
endpoints.

**Design decisions locked in:**

- **No activate/deactivate.** The schema has no `isActive` field. Suppliers that are no longer used
  should be deleted if they have no references, or left in place if they do.
- **`(organizationId, name)` uniqueness at DB level.** `@@unique([organizationId, name])` is added
  to the schema. The repository catches `P2002` → `ConflictException({ error: 'name_already_exists' })`.
- **FK protection on delete.** Catching `P2003` (FK from `Inventory` or `PurchaseOrder`) →
  `ConflictException({ error: 'supplier_has_references' })`.
- **Search across name, contactName, email.** The three fields most likely to be queried when
  looking up a vendor.
- **RBAC.** OWNER and MANAGER can create and update. Only OWNER can hard delete. All roles can read.

**Expected outcome:**

- `supplier` table gains `@@unique([organizationId, name])` via migration.
- `apps/api/src/suppliers/` exists with the standard repository pattern.
- 5 endpoints registered in `AppModule` and visible in Swagger UI.
- Test suite grows without breaking any existing spec.

---

## Files To Modify

### Schema & migration (`packages/database/`)

- **`prisma/schema.prisma`** — add `@@unique([organizationId, name])` to the `Supplier` model.

- **New migration** `20260505_add_supplier_unique_name`:

  ```sql
  CREATE UNIQUE INDEX "supplier_organization_id_name_key"
    ON "supplier"("organization_id", "name");
  ```

### TS path aliases (`apps/api/`)

- **`tsconfig.paths.json`** — add three entries:

  ```json
  "@suppliers": ["./src/suppliers/index.ts"],
  "@suppliers/dto": ["./src/suppliers/dto/index.ts"],
  "@suppliers/interfaces": ["./src/suppliers/interfaces/index.ts"]
  ```

- **`apps/api/package.json`** — mirror the same three aliases in `jest.moduleNameMapper`.

### New module (`apps/api/src/suppliers/`)

```
suppliers/
├── dto/
│   ├── create-supplier.dto.ts
│   ├── update-supplier.dto.ts
│   ├── list-suppliers.dto.ts
│   └── index.ts
├── infrastructure/
│   ├── prisma-supplier.repository.ts
│   ├── in-memory-supplier.repository.ts
│   ├── in-memory-supplier.repository.spec.ts
│   └── index.ts
├── interfaces/
│   ├── supplier.repository.interface.ts
│   └── index.ts
├── suppliers.tokens.ts
├── suppliers.module.ts
├── suppliers.controller.ts
├── suppliers.controller.spec.ts
├── suppliers.service.ts
├── suppliers.service.spec.ts
└── index.ts
```

#### `suppliers.tokens.ts`

```ts
export const SUPPLIER_REPOSITORY = Symbol('SupplierRepositoryInterface')
```

#### `interfaces/supplier.repository.interface.ts`

```ts
import type { Prisma } from '@glossops/database'

export interface CreateSupplierData {
  name: string
  contactName?: string
  phone?: string
  email?: string
  note?: string
}

export interface UpdateSupplierData {
  name?: string
  contactName?: string | null
  phone?: string | null
  email?: string | null
  note?: string | null
}

export interface SupplierQuery {
  search?: string
  page: number
  limit: number
}

export interface SupplierPageMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface SupplierPage {
  data: Prisma.SupplierModel[]
  meta: SupplierPageMeta
}

export interface SupplierRepositoryInterface {
  create(
    organizationId: string,
    data: CreateSupplierData
  ): Promise<Prisma.SupplierModel>

  findById(
    id: string,
    organizationId: string
  ): Promise<Prisma.SupplierModel | null>

  findAll(organizationId: string, query: SupplierQuery): Promise<SupplierPage>

  update(
    id: string,
    organizationId: string,
    data: UpdateSupplierData
  ): Promise<Prisma.SupplierModel>

  delete(id: string, organizationId: string): Promise<void>
}
```

Key behaviors:

- `findById` returns any supplier scoped to org — service layer decides 404.
- `findAll` searches `name`, `contactName`, `email` (case-insensitive); orders by `name ASC`.
- `create` / `update` catch Prisma `P2002` on `supplier_organization_id_name_key` →
  `ConflictException({ error: 'name_already_exists' })`.
- `delete` catches Prisma `P2003` (FK from `Inventory` or `PurchaseOrder`) →
  `ConflictException({ error: 'supplier_has_references' })`.

#### `infrastructure/in-memory-supplier.repository.ts`

Backed by `Map<string, SupplierModel>`. Seeded reference maps for FK checks:

- `inventory: Map<string, { supplierId: string }>` — seeded via `seedInventory([...])`
- `purchaseOrders: Map<string, { supplierId: string }>` — seeded via `seedPurchaseOrders([...])`

#### `dto/create-supplier.dto.ts`

```ts
export class CreateSupplierDto {
  @ApiProperty({ example: 'Avery Dennison MX', maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string

  @ApiPropertyOptional({ example: 'Carlos Ríos', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  contactName?: string

  @ApiPropertyOptional({ example: '+52 55 1234 5678', maxLength: 30 })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string

  @ApiPropertyOptional({ example: 'ventas@avery.com.mx', maxLength: 200 })
  @IsOptional()
  @IsEmail()
  @MaxLength(200)
  email?: string

  @ApiPropertyOptional({
    example: 'Distribuidor regional zona norte',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string
}
```

#### `dto/update-supplier.dto.ts`

All fields optional + nullable. Same validations as create.

#### `dto/list-suppliers.dto.ts`

```ts
export class ListSuppliersDto {
  @IsOptional() @IsString() search?: string
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number
}
```

#### `suppliers.service.ts`

```ts
@Injectable()
export class SuppliersService {
  constructor(
    @Inject(SUPPLIER_REPOSITORY)
    private readonly suppliers: SupplierRepositoryInterface
  ) {}

  create(organizationId: string, data: CreateSupplierData) {
    return this.suppliers.create(organizationId, data)
  }

  findAll(
    organizationId: string,
    dto: ListSuppliersDto
  ): Promise<SupplierPage> {
    return this.suppliers.findAll(organizationId, {
      search: dto.search,
      page: dto.page ?? 1,
      limit: dto.limit ?? 20,
    })
  }

  async findOne(id: string, organizationId: string) {
    const supplier = await this.suppliers.findById(id, organizationId)
    if (!supplier) throw new NotFoundException({ error: 'supplier_not_found' })
    return supplier
  }

  async update(id: string, organizationId: string, data: UpdateSupplierData) {
    await this.findOne(id, organizationId)
    return this.suppliers.update(id, organizationId, data)
  }

  async remove(id: string, organizationId: string): Promise<void> {
    await this.findOne(id, organizationId)
    await this.suppliers.delete(id, organizationId)
  }
}
```

#### `suppliers.controller.ts`

Single controller at `/suppliers` with 5 handlers: `create`, `findAll`, `findOne`, `update`,
`remove`. See spec for full RBAC table.

#### `suppliers.module.ts`

```ts
@Module({
  imports: [PrismaModule],
  controllers: [SuppliersController],
  providers: [
    { provide: SUPPLIER_REPOSITORY, useClass: PrismaSupplierRepository },
    SuppliersService,
  ],
  exports: [SuppliersService],
})
export class SuppliersModule {}
```

`SuppliersService` is exported so `PurchaseOrdersModule` can inject it for supplier-existence
validation when creating purchase orders.

### Wire the module (`apps/api/src/app.module.ts`)

Import `SuppliersModule` and add it to the `imports` array after `ServicesModule`.

### Tests

All specs use the in-memory repository.

- **`in-memory-supplier.repository.spec.ts`** — every method exercised; name-collision detection;
  FK check for delete against both `Inventory` and `PurchaseOrder`; `search` across name,
  contactName, and email; pagination meta.
- **`suppliers.service.spec.ts`** — create happy path; 409 on name collision; `findOne` 404;
  `update` 404 and 409; `remove` 404, 409 when referenced, 204 when clean.
- **`suppliers.controller.spec.ts`** — RBAC for all 5 endpoints; DTO validation (missing `name`
  → 400; invalid `email` format → 400).

---

## Implementation Order

1. **Schema** — add `@@unique([organizationId, name])`. Create migration manually; run
   `prisma migrate deploy`; regenerate Prisma client.
2. **Path aliases** — `tsconfig.paths.json` + Jest mapper.
3. **Interfaces, DTOs, tokens** — types-only foundation.
4. **In-memory repository + spec** — green before moving on.
5. **Prisma repository** — same surface; P2002 and P2003 error handling.
6. **Service + spec** — `findOne` gating for all mutating methods.
7. **Controller + spec** — RBAC and DTO wiring.
8. **Module wiring** — `SuppliersModule`, register in `AppModule`.
9. **Verification** — lint, build, full test suite.

Each step compiles independently. Steps 4–7 each pass `pnpm test` before moving on.

---

## Verification

From the monorepo root:

```bash
# 1. Apply migration and regenerate Prisma client
cd packages/database
pnpm prisma migrate deploy
pnpm prisma generate

# 2. Lint, typecheck, full suite
cd ../../apps/api && pnpm lint && pnpm test
```

**Manual end-to-end via Swagger UI (`http://localhost:4000/docs`):**

1. Authenticate as Owner. Capture JWT.
2. `POST /suppliers` with `{ name: "Avery Dennison MX", email: "ventas@avery.com.mx" }` → 201.
3. Same `name` again → 409 `name_already_exists`.
4. Different `name` → 201.
5. `GET /suppliers` → returns 2 rows.
6. `GET /suppliers?search=avery` → returns 1.
7. `PATCH /suppliers/:id` with `{ contactName: "Carlos Ríos" }` → 200.
8. `DELETE /suppliers/:id` as Manager → 403.
9. `DELETE /suppliers/:id` as Owner (clean supplier) → 204.
10. `DELETE /suppliers/:id` as Owner (supplier with PurchaseOrder) → 409 `supplier_has_references`.

---

## Out of Scope

- Supplier categories or tagging.
- `isActive` toggle — suppliers are hard-deleted when unreferenced.
- Supplier portal or external access.
- Branch-level supplier restrictions.
