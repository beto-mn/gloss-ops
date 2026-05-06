# Suppliers Module — Design Spec

**Date:** 2026-05-05
**Status:** Draft

---

## Goal

Expose `Supplier` as a first-class CRUD module so automotive shops can maintain a catalog of
vendors — material suppliers for vinyl, PPF, ceramic, chemicals, etc. Without this module,
`InventoryModule` cannot reference a supplier on stock items, and `PurchaseOrdersModule` cannot
address orders to a supplier.

The module is org-scoped (shared across all branches in an organization), exposes 5 standard CRUD
endpoints, and has no activation toggle — suppliers are either active records or they are deleted.

---

## Background

The `supplier` table already exists in the schema with all required columns. One schema change is
needed: adding `@@unique([organizationId, name])` so duplicate supplier names within the same org
are rejected at the database level.

Two FK relationships exist that constrain deletes:

- `Inventory.supplierId` (optional) — an inventory item can reference a supplier.
- `PurchaseOrder.supplierId` (required) — a purchase order always references a supplier.

Deleting a supplier that has either type of reference must be blocked. The Prisma repository catches
`P2003` and converts it to `ConflictException({ error: 'supplier_has_references' })`.

---

## Data Model

One constraint is added to the existing model:

```prisma
model Supplier {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organizationId String   @map("organization_id") @db.Uuid
  name           String
  contactName    String?  @map("contact_name")
  phone          String?
  email          String?
  note           String?
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  organization   Organization    @relation(fields: [organizationId], references: [id])
  inventory      Inventory[]
  purchaseOrders PurchaseOrder[]

  @@unique([organizationId, name])   // NEW
  @@map("supplier")
}
```

Migration adds one unique index:

```sql
CREATE UNIQUE INDEX "supplier_organization_id_name_key"
  ON "supplier"("organization_id", "name");
```

No data migration is needed — the table is expected to be empty or contain no duplicates.

---

## API Contract

All endpoints require a valid JWT. `organizationId` is extracted from `request.user.organizationId`
— never from the URL or body. A single controller is mounted at `/suppliers`.

### `POST /suppliers`

Create a new supplier.

**Roles:** OWNER, MANAGER

| Situation                       | HTTP | Body                               |
| ------------------------------- | ---- | ---------------------------------- |
| Body fails validation           | 400  | validation error                   |
| Caller is not OWNER or MANAGER  | 403  | —                                  |
| Name already exists in this org | 409  | `{ error: 'name_already_exists' }` |
| Success                         | 201  | the created `Supplier`             |

Body:

```ts
{
  name: string          // 1–200 chars, required
  contactName?: string  // ≤ 200 chars
  phone?: string        // ≤ 30 chars
  email?: string        // valid email, ≤ 200 chars
  note?: string         // ≤ 1000 chars
}
```

### `GET /suppliers`

List suppliers for the organization.

**Roles:** all

| Param  | Type           | Default | Notes                                                    |
| ------ | -------------- | ------- | -------------------------------------------------------- |
| search | string         | —       | Case-insensitive match on `name`, `contactName`, `email` |
| page   | int ≥ 1        | `1`     | —                                                        |
| limit  | int ∈ [1, 100] | `20`    | —                                                        |

| Situation | HTTP | Body             |
| --------- | ---- | ---------------- |
| Success   | 200  | `{ data, meta }` |

### `GET /suppliers/:id`

Read a single supplier.

**Roles:** all

| Situation                          | HTTP | Body                              |
| ---------------------------------- | ---- | --------------------------------- |
| Supplier missing or in another org | 404  | `{ error: 'supplier_not_found' }` |
| Success                            | 200  | the `Supplier`                    |

### `PATCH /suppliers/:id`

Update one or more fields.

**Roles:** OWNER, MANAGER

| Situation                                           | HTTP | Body                               |
| --------------------------------------------------- | ---- | ---------------------------------- |
| Body fails validation                               | 400  | validation error                   |
| Caller is not OWNER or MANAGER                      | 403  | —                                  |
| Supplier missing or in another org                  | 404  | `{ error: 'supplier_not_found' }`  |
| New name collides with another supplier in this org | 409  | `{ error: 'name_already_exists' }` |
| Success                                             | 200  | the updated `Supplier`             |

### `DELETE /suppliers/:id`

Hard delete. Only succeeds when the supplier has no `Inventory` or `PurchaseOrder` references.

**Roles:** OWNER only

| Situation                                    | HTTP | Body                                   |
| -------------------------------------------- | ---- | -------------------------------------- |
| Caller is not OWNER                          | 403  | —                                      |
| Supplier missing or in another org           | 404  | `{ error: 'supplier_not_found' }`      |
| Supplier has Inventory or PurchaseOrder refs | 409  | `{ error: 'supplier_has_references' }` |
| Success                                      | 204  | (empty)                                |

---

## Repository Layer

### Interface

```ts
interface SupplierRepositoryInterface {
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

Supporting types:

```ts
interface CreateSupplierData {
  name: string
  contactName?: string
  phone?: string
  email?: string
  note?: string
}

interface UpdateSupplierData {
  name?: string
  contactName?: string | null
  phone?: string | null
  email?: string | null
  note?: string | null
}

interface SupplierQuery {
  search?: string
  page: number
  limit: number
}

interface SupplierPageMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

interface SupplierPage {
  data: Prisma.SupplierModel[]
  meta: SupplierPageMeta
}
```

### Prisma implementation

- `findById` returns any supplier scoped to the org:

  ```ts
  prisma.supplier.findFirst({ where: { id, organizationId } })
  ```

- `findAll` filters by search on `name`, `contactName`, and `email` (case-insensitive):

  ```ts
  prisma.supplier.findMany({
    where: {
      organizationId,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { contactName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    orderBy: { name: 'asc' },
    skip: (page - 1) * limit,
    take: limit,
  })
  ```

- `create` and `update` catch Prisma error code `P2002` on the
  `supplier_organization_id_name_key` constraint and rethrow as
  `ConflictException({ error: 'name_already_exists' })`.

- `delete` catches Prisma error code `P2003` (FK constraint violation from `Inventory` or
  `PurchaseOrder`) and rethrows as `ConflictException({ error: 'supplier_has_references' })`.

### In-memory implementation

Backed by `Map<string, SupplierModel>`. Seeded reference maps for FK checks:

- `inventory: Map<string, { supplierId: string }>` — seeded via `seedInventory([...])`
- `purchaseOrders: Map<string, { supplierId: string }>` — seeded via `seedPurchaseOrders([...])`

Name-collision check is done by scanning the map before write. FK check for delete is done by
scanning both seeded maps.

---

## Service Layer

`findOne` is the single source of "exists in this org" truth. All mutating methods call it first so
404 behavior stays uniform.

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

---

## Controller Layer

Single controller at `/suppliers` with 5 handlers:

```ts
@ApiTags('Suppliers')
@ApiBearerAuth()
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly service: SuppliersService) {}

  @Post()
  @HttpCode(201)
  @Roles(Role.OWNER, Role.MANAGER)
  create(
    @CurrentAccount() account: AuthContext,
    @Body() dto: CreateSupplierDto
  ) {
    return this.service.create(account.organizationId!, dto)
  }

  @Get()
  findAll(
    @CurrentAccount() account: AuthContext,
    @Query() dto: ListSuppliersDto
  ) {
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
    @Body() dto: UpdateSupplierDto
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

| Situation                                    | HTTP | Body                                   |
| -------------------------------------------- | ---- | -------------------------------------- |
| DTO validation failure                       | 400  | class-validator error                  |
| Caller lacks required role                   | 403  | (RolesGuard response)                  |
| Supplier missing or in another org           | 404  | `{ error: 'supplier_not_found' }`      |
| Name already exists in org                   | 409  | `{ error: 'name_already_exists' }`     |
| Supplier has Inventory or PurchaseOrder refs | 409  | `{ error: 'supplier_has_references' }` |

404 messages are uniform regardless of whether the record is missing or belongs to another org —
callers cannot probe foreign IDs.

---

## Testing Strategy

No Prisma mocks. All specs use `InMemorySupplierRepository`.

### In-memory repository spec

- `create` persists with correct `organizationId`.
- `create` sets optional fields to `null` when not provided.
- `create` throws `ConflictException` when name already exists in the same org.
- `create` allows the same name in a different org.
- `findById` returns `null` when supplier belongs to another org.
- `findAll` excludes suppliers from other orgs.
- `findAll` filters by `search` across `name`, `contactName`, and `email`.
- `findAll` paginates correctly and returns correct meta.
- `update` updates fields and returns updated supplier.
- `update` throws `ConflictException` when new name collides with another supplier.
- `update` allows updating name to its own current name.
- `delete` removes the supplier.
- `delete` throws `ConflictException` when supplier has `Inventory` references.
- `delete` throws `ConflictException` when supplier has `PurchaseOrder` references.
- `delete` succeeds when supplier has no references.

### Service spec

- `create` happy path.
- `create` 409 when name already exists.
- `findOne` 404 for missing or foreign supplier.
- `update` 404 for missing supplier.
- `update` 409 when new name collides.
- `remove` 404 for missing supplier.
- `remove` 409 when supplier has references.
- `remove` succeeds when no references exist.

### Controller spec

- `POST /suppliers` → OWNER and MANAGER can create; TECHNICIAN and FRONT_DESK get 403.
- `GET /suppliers` → all roles can list.
- `GET /suppliers/:id` → all roles can read.
- `PATCH /suppliers/:id` → OWNER and MANAGER only.
- `DELETE /suppliers/:id` → OWNER only; MANAGER gets 403.
- DTO validation: missing `name` returns 400.

---

## Out of Scope

- Supplier categories or tagging.
- Supplier rating or evaluation.
- Branch-level supplier restrictions.
- Supplier portal or external access.
- `isActive` toggle — suppliers are hard-deleted when no longer needed and unreferenced.

---

## Files Changed

| Action        | File                                                                          |
| ------------- | ----------------------------------------------------------------------------- |
| Modify        | `packages/database/prisma/schema.prisma`                                      |
| New migration | `packages/database/prisma/migrations/20260505_add_supplier_unique_name/`      |
| Modify        | `apps/api/tsconfig.paths.json`                                                |
| Modify        | `apps/api/package.json` (jest moduleNameMapper)                               |
| Modify        | `apps/api/src/app.module.ts`                                                  |
| New           | `apps/api/src/suppliers/suppliers.module.ts`                                  |
| New           | `apps/api/src/suppliers/suppliers.tokens.ts`                                  |
| New           | `apps/api/src/suppliers/suppliers.controller.ts`                              |
| New           | `apps/api/src/suppliers/suppliers.controller.spec.ts`                         |
| New           | `apps/api/src/suppliers/suppliers.service.ts`                                 |
| New           | `apps/api/src/suppliers/suppliers.service.spec.ts`                            |
| New           | `apps/api/src/suppliers/index.ts`                                             |
| New           | `apps/api/src/suppliers/dto/create-supplier.dto.ts`                           |
| New           | `apps/api/src/suppliers/dto/update-supplier.dto.ts`                           |
| New           | `apps/api/src/suppliers/dto/list-suppliers.dto.ts`                            |
| New           | `apps/api/src/suppliers/dto/index.ts`                                         |
| New           | `apps/api/src/suppliers/interfaces/supplier.repository.interface.ts`          |
| New           | `apps/api/src/suppliers/interfaces/index.ts`                                  |
| New           | `apps/api/src/suppliers/infrastructure/prisma-supplier.repository.ts`         |
| New           | `apps/api/src/suppliers/infrastructure/in-memory-supplier.repository.ts`      |
| New           | `apps/api/src/suppliers/infrastructure/in-memory-supplier.repository.spec.ts` |
| New           | `apps/api/src/suppliers/infrastructure/index.ts`                              |
