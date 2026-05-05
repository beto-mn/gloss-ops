# Services Module — CRUD with Activate/Deactivate

## Context

`CustomerAsset` is complete — the shop now knows what vehicles exist. The next layer is the service catalog: what work can the shop perform, at what price, and with what warranty commitment. Without a `services` module, `WorkOrdersModule` cannot create line items, and the warranty auto-generation logic has no config to reference.

`Service` is org-scoped (shared across all branches of an organization). It uses an `isActive` flag instead of soft-delete because services are catalog entries: past work orders snapshot price and warranty data from the service at order time, so the records must persist even when a service is no longer offered.

**Design decisions locked in:**

- **Delete strategy — dedicated endpoints.** `POST /services/:id/activate` and `POST /services/:id/deactivate` toggle `isActive`. `DELETE /services/:id` is a hard delete (OWNER only), allowed only when the service has no `WorkOrderItem` or `Warranty` references.
- **`(organizationId, name)` uniqueness at DB level.** `@@unique([organizationId, name])` is added to the schema. The Prisma repository catches `P2002` and converts it to `ConflictException({ error: 'name_already_exists' })`. No extra pre-write query.
- **FK protection on delete.** The repository catches `P2003` (FK constraint violation when deleting a referenced service) and converts it to `ConflictException({ error: 'service_has_references' })`.
- **CFDI fields — format-only validation.** `claveProdServ` (≤ 15 chars, alphanumeric) and `claveUnidad` (≤ 10 chars, alphanumeric) are validated by regex at the DTO level. Catalog validity is deferred to InvoicesModule.
- **Listing defaults to active only.** `GET /services` returns `isActive = true` services. Pass `?includeInactive=true` to include all. `GET /services/:id` returns any service regardless of `isActive` (for editing inactive ones).
- **`isActive` not in PATCH body.** Activation state is changed only via the dedicated endpoints, keeping intent explicit.
- **Single controller** at `/services` — no nested routes (Services are not nested under any parent entity).
- **RBAC.** OWNER and MANAGER can create, update, activate, and deactivate. Only OWNER can hard delete. All roles can read.

**Expected outcome:**

- `service` table gains `@@unique([organizationId, name])` via migration.
- `apps/api/src/services/` exists with the standard repository pattern (interface + Prisma + in-memory + tokens + module).
- 7 endpoints registered in `AppModule` and visible in Swagger UI.
- Test counts grow without breaking any existing spec.

---

## Files To Modify

### Schema & migration (`packages/database/`)

- **`prisma/schema.prisma`** — add `@@unique([organizationId, name])` to the `Service` model (no other field changes).

- **New migration** `20260505_add_service_unique_name`:

  ```sql
  CREATE UNIQUE INDEX "service_organization_id_name_key"
    ON "service"("organization_id", "name");
  ```

### TS path aliases (`apps/api/`)

- **`tsconfig.paths.json`** — add three entries (alphabetically near `@services`):

  ```json
  "@services": ["./src/services/index.ts"],
  "@services/dto": ["./src/services/dto/index.ts"],
  "@services/interfaces": ["./src/services/interfaces/index.ts"]
  ```

- **`apps/api/package.json`** — mirror the same three aliases in `jest.moduleNameMapper`.

### New module (`apps/api/src/services/`)

```
services/
├── dto/
│   ├── create-service.dto.ts
│   ├── update-service.dto.ts
│   ├── list-services.dto.ts
│   └── index.ts
├── infrastructure/
│   ├── prisma-service.repository.ts
│   ├── in-memory-service.repository.ts
│   ├── in-memory-service.repository.spec.ts
│   └── index.ts
├── interfaces/
│   ├── service.repository.interface.ts
│   └── index.ts
├── services.tokens.ts
├── services.module.ts
├── services.controller.ts
├── services.controller.spec.ts
├── services.service.ts
├── services.service.spec.ts
└── index.ts
```

#### `services.tokens.ts`

```ts
export const SERVICE_REPOSITORY = Symbol('ServiceRepositoryInterface')
```

#### `interfaces/service.repository.interface.ts`

Full interface with supporting types:

```ts
import type { Prisma } from '@glossops/database'

export interface CreateServiceData {
  name: string
  description?: string
  basePrice?: number
  claveProdServ?: string
  claveUnidad?: string
  warrantyDays?: number
  warrantyDescription?: string
  warrantyTerm?: string
}

export interface UpdateServiceData {
  name?: string
  description?: string | null
  basePrice?: number
  claveProdServ?: string | null
  claveUnidad?: string | null
  warrantyDays?: number | null
  warrantyDescription?: string | null
  warrantyTerm?: string | null
}

export interface ServiceQuery {
  search?: string
  includeInactive: boolean
  page: number
  limit: number
}

export interface ServicePageMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface ServicePage {
  data: Prisma.ServiceModel[]
  meta: ServicePageMeta
}

export interface ServiceRepositoryInterface {
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

Key behaviors:

- `findById` returns any service (active or inactive) scoped to org — service layer decides validity.
- `findAll` respects `includeInactive`; orders by `name ASC`.
- `create` / `update` catch Prisma `P2002` on `service_organization_id_name_key` → `ConflictException({ error: 'name_already_exists' })`.
- `delete` catches Prisma `P2003` (FK constraint from `WorkOrderItem` or `Warranty`) → `ConflictException({ error: 'service_has_references' })`.
- `activate` / `deactivate` use `prisma.service.update({ where: { id, organizationId }, data: { isActive: true/false } })`; `P2025` (not found) is left to bubble and the service layer converts it to 404.

#### `infrastructure/in-memory-service.repository.ts`

Backed by `Map<string, ServiceModel>`. Seeded reference maps for FK checks:

- `workOrderItems: Map<string, { serviceId: string }>` — seeded via `seedWorkOrderItems([...])`
- `warranties: Map<string, { serviceId: string }>` — seeded via `seedWarranties([...])`

Name-collision check is done by scanning the map before write. FK check for delete is done by scanning both seeded maps.

#### `dto/create-service.dto.ts`

```ts
import {
  IsString,
  IsOptional,
  IsInt,
  IsNumber,
  Min,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateServiceDto {
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

  @ApiPropertyOptional({
    example: '78101802',
    description: 'SAT clave — alphanumeric, format validated only',
    maxLength: 15,
  })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9]+$/)
  @MaxLength(15)
  claveProdServ?: string

  @ApiPropertyOptional({
    example: 'E48',
    description: 'SAT clave unidad — alphanumeric, format validated only',
    maxLength: 10,
  })
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
```

#### `dto/update-service.dto.ts`

All fields optional. `isActive` is intentionally absent — changed only via `/activate` and `/deactivate`.

```ts
import {
  IsString,
  IsOptional,
  IsInt,
  IsNumber,
  Min,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator'

export class UpdateServiceDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(200) name?: string
  @IsOptional() @IsString() @MaxLength(1000) description?: string | null
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) basePrice?: number
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9]+$/)
  @MaxLength(15)
  claveProdServ?: string | null
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9]+$/)
  @MaxLength(10)
  claveUnidad?: string | null
  @IsOptional() @IsInt() @Min(0) warrantyDays?: number | null
  @IsOptional() @IsString() @MaxLength(1000) warrantyDescription?: string | null
  @IsOptional() @IsString() @MaxLength(1000) warrantyTerm?: string | null
}
```

#### `dto/list-services.dto.ts`

```ts
import {
  IsOptional,
  IsString,
  IsInt,
  IsBoolean,
  Min,
  Max,
} from 'class-validator'
import { Type, Transform } from 'class-transformer'

export class ListServicesDto {
  @IsOptional() @IsString() search?: string
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeInactive?: boolean
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number
}
```

#### `services.service.ts`

```ts
@Injectable()
export class ServicesService {
  constructor(
    @Inject(SERVICE_REPOSITORY)
    private readonly services: ServiceRepositoryInterface
  ) {}

  create(organizationId: string, data: CreateServiceData) {
    return this.services.create(organizationId, data)
  }

  findAll(organizationId: string, dto: ListServicesDto): Promise<ServicePage> {
    return this.services.findAll(organizationId, {
      search: dto.search,
      includeInactive: dto.includeInactive ?? false,
      page: dto.page ?? 1,
      limit: dto.limit ?? 20,
    })
  }

  async findOne(id: string, organizationId: string) {
    const service = await this.services.findById(id, organizationId)
    if (!service) throw new NotFoundException({ error: 'service_not_found' })
    return service
  }

  async update(id: string, organizationId: string, data: UpdateServiceData) {
    await this.findOne(id, organizationId)
    return this.services.update(id, organizationId, data)
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
  }
}
```

#### `services.controller.ts`

Single controller at `/services` with 7 handlers: `create`, `findAll`, `findOne`, `update`, `remove`, `activate`, `deactivate`. See spec for full RBAC table.

#### `services.module.ts`

```ts
@Module({
  imports: [PrismaModule],
  controllers: [ServicesController],
  providers: [
    { provide: SERVICE_REPOSITORY, useClass: PrismaServiceRepository },
    ServicesService,
  ],
  exports: [ServicesService],
})
export class ServicesModule {}
```

`ServicesService` is exported so `WorkOrdersModule` can inject it for service-existence validation when creating work order items.

### Wire the module (`apps/api/src/app.module.ts`)

Import `ServicesModule` and add it to the `imports` array after `CustomerAssetsModule`.

### Tests

All specs use the in-memory repository.

- **`in-memory-service.repository.spec.ts`** — every method exercised; name-collision detection; FK check for delete; `includeInactive` filter; `search` across name and description.
- **`services.service.spec.ts`**:
  - `create` happy path
  - `create` 409 when name already exists in org
  - `findAll` defaults `includeInactive` to `false`
  - `findAll` returns inactive services when `includeInactive: true`
  - `findOne` 404 for missing or foreign service
  - `update` 404 for missing; 409 for name collision
  - `activate` 409 when already active
  - `deactivate` 409 when already inactive
  - `remove` 404 for missing; 409 when has references; 204 when clean
- **`services.controller.spec.ts`**:
  - RBAC for all 7 endpoints
  - DTO validation (missing `name` → 400; invalid `claveProdServ` non-alphanumeric → 400)
  - `includeInactive=true` string coerced to boolean

---

## Implementation Order

1. **Schema** — add `@@unique([organizationId, name])`. Run migration; regenerate Prisma client.
2. **Path aliases** — `tsconfig.paths.json` + Jest mapper.
3. **Interfaces, DTOs, tokens** — types-only foundation.
4. **In-memory repository + spec** — green before moving on.
5. **Prisma repository** — same surface; P2002 and P2003 error handling.
6. **Service + spec** — encodes the isActive toggle guard and findOne gating.
7. **Controller + spec** — RBAC and DTO wiring.
8. **Module wiring** — `ServicesModule`, register in `AppModule`.
9. **Verification** — lint, build, full test suite, manual smoke via Swagger UI.

Each step compiles independently. Steps 4–7 each pass `pnpm test` before moving on.

---

## Verification

From the monorepo root:

```bash
# 1. Apply migration and regenerate Prisma client
cd packages/database
pnpm prisma migrate dev --name add_service_unique_name
pnpm prisma generate

# 2. Lint, typecheck, full suite
cd ../../apps/api && pnpm lint && pnpm test
```

**Manual end-to-end via Swagger UI (`http://localhost:4000/docs`):**

1. Authenticate as Owner. Capture JWT.
2. `POST /services` with `{ name: "Ceramic Coating Pro", basePrice: 15000 }` → 201.
3. Same `name` again → 409 `name_already_exists`.
4. Different `name` → 201.
5. `GET /services` → returns only active services (2 rows).
6. `POST /services/:id/deactivate` → 200, `isActive: false`.
7. `GET /services` → returns 1 (active only). `GET /services?includeInactive=true` → returns 2.
8. `GET /services/:id` (inactive one) → 200 (still readable).
9. `POST /services/:id/deactivate` again → 409 `service_already_inactive`.
10. `POST /services/:id/activate` → 200, `isActive: true`.
11. `PATCH /services/:id` with `{ name: "Ceramic Coating Elite" }` → 200.
12. `PATCH /services/:id` with `{ claveProdServ: "invalid code!" }` (non-alphanumeric) → 400.
13. `DELETE /services/:id` as Manager → 403.
14. `DELETE /services/:id` as Owner (clean service) → 204.
15. `DELETE /services/:id` as Owner (service with WorkOrderItems) → 409 `service_has_references`.

---

## Out of Scope

- Service categories or grouping.
- Branch-level price overrides.
- SAT catalog validation for `claveProdServ`/`claveUnidad` — deferred to InvoicesModule.
- A `GET /services/catalog` non-paginated endpoint.
- Restore endpoint — services are activated, not restored.
