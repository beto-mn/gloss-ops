# Services Module — Design Spec

**Date:** 2026-05-05
**Status:** Draft

---

## Goal

Expose `Service` as a first-class CRUD module so automotive shops can maintain a catalog of services — ceramic coating, PPF, detail, tint, etc. — with pricing and warranty configuration. Without this module, no work order can include line items, and the warranty auto-generation logic in `WorkOrdersModule` has no config to read from.

The module is org-scoped (shared across all branches in an organization), exposes standard CRUD endpoints, and uses dedicated `activate`/`deactivate` endpoints instead of soft-delete because a service is a catalog entry, not a disposable record.

---

## Background

The `service` table already exists in the schema with all required columns. Two design choices were locked in during brainstorming:

1. **`isActive` is a business toggle, not a deletion flag.** Services referenced by past work orders must never disappear — they carry pricing snapshots and warranty config that were in effect at order time. Deactivating hides a service from new orders without breaking existing history. `DELETE` is reserved for hard delete when the service has no references.

2. **`(organizationId, name)` uniqueness is enforced at the database level** via `@@unique`. The repository catches Prisma's `P2002` error and converts it to a `ConflictException`. No extra `findByName` round-trip before each write.

One schema change is needed: adding the `@@unique([organizationId, name])` constraint. The rest of the table is already correct.

---

## Data Model

A single constraint is added to the existing model:

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

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  organization   Organization    @relation(fields: [organizationId], references: [id])
  workOrderItems WorkOrderItem[]
  warranties     Warranty[]

  @@unique([organizationId, name])   // NEW
  @@map("service")
}
```

Migration adds one unique index:

```sql
CREATE UNIQUE INDEX "service_organization_id_name_key"
  ON "service"("organization_id", "name");
```

No data migration is needed — the table is expected to be empty or contain no duplicates.

---

## API Contract

All endpoints require a valid JWT. `organizationId` is extracted from `request.user.organizationId` — never from the URL or body. A single controller is mounted at `/services`.

### `POST /services`

Create a new service.

**Roles:** OWNER, MANAGER

| Situation                       | HTTP | Body                               |
| ------------------------------- | ---- | ---------------------------------- |
| Body fails validation           | 400  | validation error                   |
| Caller is not OWNER or MANAGER  | 403  | —                                  |
| Name already exists in this org | 409  | `{ error: 'name_already_exists' }` |
| Success                         | 201  | the created `Service`              |

Body:

```ts
{
  name: string           // 1–200 chars, required
  description?: string   // ≤ 1000 chars
  basePrice?: number     // ≥ 0, up to 2 decimal places (default 0)
  claveProdServ?: string // alphanumeric, ≤ 15 chars (SAT format validation)
  claveUnidad?: string   // alphanumeric, ≤ 10 chars (SAT format validation)
  warrantyDays?: number  // integer ≥ 0
  warrantyDescription?: string  // ≤ 1000 chars
  warrantyTerm?: string         // ≤ 1000 chars
}
```

### `GET /services`

List services for the organization.

**Roles:** all

| Param           | Type           | Default | Notes                                           |
| --------------- | -------------- | ------- | ----------------------------------------------- |
| search          | string         | —       | Case-insensitive match on `name`, `description` |
| includeInactive | boolean        | `false` | When `true`, includes inactive services         |
| page            | int ≥ 1        | `1`     | —                                               |
| limit           | int ∈ [1, 100] | `20`    | —                                               |

| Situation | HTTP | Body             |
| --------- | ---- | ---------------- |
| Success   | 200  | `{ data, meta }` |

### `GET /services/:id`

Read a single service (active or inactive).

**Roles:** all

| Situation                         | HTTP | Body                             |
| --------------------------------- | ---- | -------------------------------- |
| Service missing or in another org | 404  | `{ error: 'service_not_found' }` |
| Success                           | 200  | the `Service`                    |

### `PATCH /services/:id`

Update one or more fields. Works on active and inactive services.

**Roles:** OWNER, MANAGER

| Situation                                          | HTTP | Body                               |
| -------------------------------------------------- | ---- | ---------------------------------- |
| Body fails validation                              | 400  | validation error                   |
| Caller is not OWNER or MANAGER                     | 403  | —                                  |
| Service missing or in another org                  | 404  | `{ error: 'service_not_found' }`   |
| New name collides with another service in this org | 409  | `{ error: 'name_already_exists' }` |
| Success                                            | 200  | the updated `Service`              |

### `DELETE /services/:id`

Hard delete. Only succeeds when the service has no `WorkOrderItem` or `Warranty` references.

**Roles:** OWNER only

| Situation                                        | HTTP | Body                                  |
| ------------------------------------------------ | ---- | ------------------------------------- |
| Caller is not OWNER                              | 403  | —                                     |
| Service missing or in another org                | 404  | `{ error: 'service_not_found' }`      |
| Service has WorkOrderItem or Warranty references | 409  | `{ error: 'service_has_references' }` |
| Success                                          | 204  | (empty)                               |

### `POST /services/:id/activate`

Set `isActive = true`.

**Roles:** OWNER, MANAGER

| Situation                         | HTTP | Body                                  |
| --------------------------------- | ---- | ------------------------------------- |
| Caller is not OWNER or MANAGER    | 403  | —                                     |
| Service missing or in another org | 404  | `{ error: 'service_not_found' }`      |
| Service is already active         | 409  | `{ error: 'service_already_active' }` |
| Success                           | 200  | the updated `Service`                 |

### `POST /services/:id/deactivate`

Set `isActive = false`.

**Roles:** OWNER, MANAGER

| Situation                         | HTTP | Body                                    |
| --------------------------------- | ---- | --------------------------------------- |
| Caller is not OWNER or MANAGER    | 403  | —                                       |
| Service missing or in another org | 404  | `{ error: 'service_not_found' }`        |
| Service is already inactive       | 409  | `{ error: 'service_already_inactive' }` |
| Success                           | 200  | the updated `Service`                   |

---

## Repository Layer

### Interface

```ts
interface ServiceRepositoryInterface {
  create(
    organizationId: string,
    data: CreateServiceData
  ): Promise<Prisma.ServiceModel>

  findById(
    id: string,
    organizationId: string
  ): Promise<Prisma.ServiceModel | null>

  findAll(organizationId: string, query: ServiceQuery): Promise<ServicePage>

  update(
    id: string,
    organizationId: string,
    data: UpdateServiceData
  ): Promise<Prisma.ServiceModel>

  activate(id: string, organizationId: string): Promise<Prisma.ServiceModel>
  deactivate(id: string, organizationId: string): Promise<Prisma.ServiceModel>

  delete(id: string, organizationId: string): Promise<void>
}
```

Supporting types:

```ts
interface CreateServiceData {
  name: string
  description?: string
  basePrice?: number
  claveProdServ?: string
  claveUnidad?: string
  warrantyDays?: number
  warrantyDescription?: string
  warrantyTerm?: string
}

interface UpdateServiceData {
  name?: string
  description?: string | null
  basePrice?: number
  claveProdServ?: string | null
  claveUnidad?: string | null
  warrantyDays?: number | null
  warrantyDescription?: string | null
  warrantyTerm?: string | null
}

interface ServiceQuery {
  search?: string
  includeInactive: boolean
  page: number
  limit: number
}

interface ServicePageMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

interface ServicePage {
  data: Prisma.ServiceModel[]
  meta: ServicePageMeta
}
```

### Prisma implementation

- `findById` returns any service (active or inactive) scoped to the org:

  ```ts
  prisma.service.findFirst({ where: { id, organizationId } })
  ```

- `findAll` filters by `isActive` unless `includeInactive` is true:

  ```ts
  prisma.service.findMany({
    where: {
      organizationId,
      ...(includeInactive ? {} : { isActive: true }),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    orderBy: { name: 'asc' },
    skip: (page - 1) * limit,
    take: limit,
  })
  ```

- `create` and `update` catch Prisma error code `P2002` on the `service_organization_id_name_key` constraint and rethrow as `ConflictException({ error: 'name_already_exists' })`.

- `delete` catches Prisma error code `P2003` (FK constraint violation) and rethrows as `ConflictException({ error: 'service_has_references' })`. If Prisma throws `P2025` (record not found), the repository returns void and the service layer handles the 404.

- `activate` and `deactivate` use `update`:
  ```ts
  prisma.service.update({
    where: { id, organizationId },
    data: { isActive: true / false },
  })
  ```
  If the record is not found, Prisma throws `P2025` — the service layer converts this to a 404.

### In-memory implementation

Backed by `Map<string, ServiceModel>`. Error conditions are reproduced by inspecting the map:

- `create` and `update` scan the map for a name collision within the same `organizationId` and throw `ConflictException` before writing.
- `delete` inspects a seeded `workOrderItems: Map<string, { serviceId }>` and `warranties: Map<string, { serviceId }>` for references and throws `ConflictException` if any are found.

---

## Service Layer

```ts
@Injectable()
export class ServicesService {
  constructor(
    @Inject(SERVICE_REPOSITORY)
    private readonly services: ServiceRepositoryInterface
  ) {}

  async create(organizationId: string, data: CreateServiceData) {
    return this.services.create(organizationId, data)
    // P2002 bubbles up from the repository as ConflictException
  }

  findAll(organizationId: string, dto: ListServicesDto): Promise<ServicePage> {
    return this.services.findAll(organizationId, {
      search: dto.search,
      includeInactive: dto.includeInactive ?? false,
      page: dto.page ?? 1,
      limit: dto.limit ?? 20,
    })
  }

  async findOne(
    id: string,
    organizationId: string
  ): Promise<Prisma.ServiceModel> {
    const service = await this.services.findById(id, organizationId)
    if (!service) throw new NotFoundException({ error: 'service_not_found' })
    return service
  }

  async update(id: string, organizationId: string, data: UpdateServiceData) {
    await this.findOne(id, organizationId)
    return this.services.update(id, organizationId, data)
    // P2002 bubbles up as ConflictException
  }

  async activate(id: string, organizationId: string) {
    const service = await this.findOne(id, organizationId)
    if (service.isActive)
      throw new ConflictException({ error: 'service_already_active' })
    return this.services.activate(id, organizationId)
  }

  async deactivate(id: string, organizationId: string) {
    const service = await this.findOne(id, organizationId)
    if (!service.isActive)
      throw new ConflictException({ error: 'service_already_inactive' })
    return this.services.deactivate(id, organizationId)
  }

  async remove(id: string, organizationId: string): Promise<void> {
    await this.findOne(id, organizationId)
    await this.services.delete(id, organizationId)
    // P2003 bubbles up as ConflictException
  }
}
```

`findOne` is the single source of "exists in this org" truth. All mutating methods go through it so 404 behavior stays uniform.

---

## Controller Layer

Single controller at `/services`:

```ts
@ApiTags('Services')
@ApiBearerAuth()
@Controller('services')
export class ServicesController {
  constructor(private readonly service: ServicesService) {}

  @Post()
  @HttpCode(201)
  @Roles(Role.OWNER, Role.MANAGER)
  create(
    @CurrentAccount() account: AuthContext,
    @Body() dto: CreateServiceDto
  ) {
    return this.service.create(account.organizationId!, dto)
  }

  @Get()
  findAll(
    @CurrentAccount() account: AuthContext,
    @Query() dto: ListServicesDto
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
    @Body() dto: UpdateServiceDto
  ) {
    return this.service.update(id, account.organizationId!, dto)
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles(Role.OWNER)
  remove(@CurrentAccount() account: AuthContext, @Param('id') id: string) {
    return this.service.remove(id, account.organizationId!)
  }

  @Post(':id/activate')
  @Roles(Role.OWNER, Role.MANAGER)
  activate(@CurrentAccount() account: AuthContext, @Param('id') id: string) {
    return this.service.activate(id, account.organizationId!)
  }

  @Post(':id/deactivate')
  @Roles(Role.OWNER, Role.MANAGER)
  deactivate(@CurrentAccount() account: AuthContext, @Param('id') id: string) {
    return this.service.deactivate(id, account.organizationId!)
  }
}
```

DTOs snapshot:

```ts
class CreateServiceDto {
  @ApiProperty({ example: 'Ceramic Coating Pro', maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string

  @ApiPropertyOptional({
    example: 'Full body ceramic coating',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string

  @ApiPropertyOptional({ example: 15000.0, minimum: 0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  basePrice?: number

  @ApiPropertyOptional({ example: '78101802', maxLength: 15 })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9]+$/)
  @MaxLength(15)
  claveProdServ?: string

  @ApiPropertyOptional({ example: 'E48', maxLength: 10 })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9]+$/)
  @MaxLength(10)
  claveUnidad?: string

  @ApiPropertyOptional({ example: 365, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  warrantyDays?: number

  @ApiPropertyOptional({
    example: 'Covers delamination and peeling',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  warrantyDescription?: string

  @ApiPropertyOptional({
    example: 'Subject to proper maintenance',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  warrantyTerm?: string
}

// UpdateServiceDto: all fields optional + nullable (except name, which stays string | undefined)
// isActive is NOT in this DTO — it is only changed via /activate and /deactivate

class ListServicesDto {
  @IsOptional() @IsString() search?: string
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeInactive?: boolean
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number
}
```

---

## Error Responses

| Situation                                        | HTTP | Body                                    |
| ------------------------------------------------ | ---- | --------------------------------------- |
| DTO validation failure                           | 400  | class-validator error                   |
| Caller lacks required role                       | 403  | (RolesGuard response)                   |
| Service missing or in another org                | 404  | `{ error: 'service_not_found' }`        |
| Name already exists in org                       | 409  | `{ error: 'name_already_exists' }`      |
| Service has WorkOrderItem or Warranty references | 409  | `{ error: 'service_has_references' }`   |
| Service is already active                        | 409  | `{ error: 'service_already_active' }`   |
| Service is already inactive                      | 409  | `{ error: 'service_already_inactive' }` |

404 messages are uniform regardless of whether the record is missing or belongs to another org — callers cannot probe foreign IDs.

---

## Testing Strategy

No Prisma mocks. All specs use `InMemoryServiceRepository`.

### In-memory repository spec

- `create` persists with `isActive = true`.
- `create` throws `ConflictException` when name already exists in the same org.
- `findById` returns `null` when service belongs to another org.
- `findAll` filters by `isActive` by default; `includeInactive: true` returns all.
- `findAll` applies `search` across `name` and `description`.
- `activate` sets `isActive = true`; `deactivate` sets `isActive = false`.
- `delete` throws `ConflictException` when seeded references exist.
- `delete` removes the row when no references exist.

### Service spec

- `create` happy path → 201.
- `create` 409 when name already exists in org.
- `findAll` defaults `includeInactive` to `false`.
- `findAll` returns inactive services when `includeInactive: true`.
- `findOne` 404 for missing or foreign service.
- `update` 404 for missing service.
- `update` 409 when new name collides with another service.
- `activate` 404 for missing service.
- `activate` 409 when service is already active.
- `deactivate` 409 when service is already inactive.
- `remove` 404 for missing service.
- `remove` 409 when service has references.
- `remove` succeeds when no references exist.

### Controller spec

- `POST /services` → OWNER and MANAGER can create; TECHNICIAN and FRONT_DESK get 403.
- `GET /services` → all roles can list.
- `GET /services/:id` → all roles can read.
- `PATCH /services/:id` → OWNER and MANAGER only.
- `DELETE /services/:id` → OWNER only; MANAGER gets 403.
- `POST /services/:id/activate` → OWNER and MANAGER only.
- `POST /services/:id/deactivate` → OWNER and MANAGER only.
- DTO validation: missing `name` returns 400.
- `includeInactive` coerces string `'true'` to boolean `true`.

---

## Out of Scope

- Per-service pricing tiers or branch-level price overrides.
- Service categories or grouping (e.g., "Ceramic", "PPF", "Detail").
- Restore endpoint (`POST /services/:id/restore`) — services are activated, not restored.
- SAT catalog validation for `claveProdServ`/`claveUnidad` — deferred to InvoicesModule.
- `GET /services/catalog` non-paginated endpoint — not needed while catalog size ≤ 100.
- A cleanup cron for unreferenced inactive services.

---

## Files Changed

| Action        | File                                                                        |
| ------------- | --------------------------------------------------------------------------- |
| Modify        | `packages/database/prisma/schema.prisma`                                    |
| New migration | `packages/database/prisma/migrations/…add-service-unique-name/`             |
| Modify        | `apps/api/tsconfig.paths.json`                                              |
| Modify        | `apps/api/package.json` (jest moduleNameMapper)                             |
| Modify        | `apps/api/src/app.module.ts`                                                |
| New           | `apps/api/src/services/services.module.ts`                                  |
| New           | `apps/api/src/services/services.tokens.ts`                                  |
| New           | `apps/api/src/services/services.controller.ts`                              |
| New           | `apps/api/src/services/services.controller.spec.ts`                         |
| New           | `apps/api/src/services/services.service.ts`                                 |
| New           | `apps/api/src/services/services.service.spec.ts`                            |
| New           | `apps/api/src/services/index.ts`                                            |
| New           | `apps/api/src/services/dto/create-service.dto.ts`                           |
| New           | `apps/api/src/services/dto/update-service.dto.ts`                           |
| New           | `apps/api/src/services/dto/list-services.dto.ts`                            |
| New           | `apps/api/src/services/dto/index.ts`                                        |
| New           | `apps/api/src/services/interfaces/service.repository.interface.ts`          |
| New           | `apps/api/src/services/interfaces/index.ts`                                 |
| New           | `apps/api/src/services/infrastructure/prisma-service.repository.ts`         |
| New           | `apps/api/src/services/infrastructure/in-memory-service.repository.ts`      |
| New           | `apps/api/src/services/infrastructure/in-memory-service.repository.spec.ts` |
| New           | `apps/api/src/services/infrastructure/index.ts`                             |
