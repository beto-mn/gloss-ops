# Branches Module — CRUD with Soft Delete

## Context

After dropping `Branch.isMain`, the system models branches as peers. Today the only branch ever created is the one auto-spawned at organization registration; there is no way for an Owner or Manager to create, rename, or delete additional branches. The invitation flow already requires a `branchId`, but without endpoints that list real branches the frontend has nothing to populate the selector with.

This plan introduces the `branches/` module: full CRUD scoped to `organizationId`, soft delete only (hard delete happens via a scheduled cleanup after 30 days), and status filtering on the list endpoint.

**Design decisions locked in:**

- **Soft delete only via API.** `DELETE /branches/:id` flips `status` to `DELETED` and records `deletedAt`. No `?permanent=true` flag.
- **Hard delete via cron.** A scheduled job runs daily and hard-deletes any branch with `status = DELETED AND deletedAt < now() - 30 days`. The cascading delete removes the `OrganizationMember` rows that anchor accounts to that branch — accounts themselves are untouched.
- **Block soft-deleting the last ACTIVE branch.** If the org would have zero ACTIVE branches after the delete, return `422 cannot_delete_last_branch`. Preserves the invariant "every organization has at least one branch" documented in `docs/database-design.md` §3.2.
- **Branch name unique within an organization (app-layer, ACTIVE only).** Two ACTIVE branches in the same org cannot share a name. A DELETED branch does not block the name (it will be cleaned up within 30 days).
- **No member check on soft delete.** A branch can be soft-deleted regardless of how many members it has. Member rows live until the cron hard-deletes the branch.

**Expected outcome:**

- `Branch` gains `status` and `deletedAt` columns; existing branches default to `ACTIVE`.
- `apps/api/src/branches/` exists with the standard repository pattern (interface + Prisma + in-memory + tokens + module).
- 5 endpoints under `/branches` registered in `AppModule` and visible in Swagger UI.
- A `BranchCleanupService` runs daily and hard-deletes expired soft-deleted branches.
- All existing tests still pass; new specs cover the repository, service, and controller.

---

## Files To Modify

### Schema & migration (`packages/database/`)

- **`prisma/schema.prisma`** — `Branch` model: add `status ResourceStatus @default(ACTIVE)` and `deletedAt DateTime? @map("deleted_at")`. The existing `ResourceStatus` enum (`schema.prisma:98-101`) already has `ACTIVE` and `DELETED`.
- **New migration** — generate `npx prisma migrate dev --name add-branch-soft-delete`. Should produce:
  ```sql
  ALTER TABLE branch ADD COLUMN status "ResourceStatus" NOT NULL DEFAULT 'ACTIVE';
  ALTER TABLE branch ADD COLUMN deleted_at TIMESTAMP(3);
  ```
- **`prisma/seed.ts`** — no change needed; new fields take their defaults.

### TS path aliases (`apps/api/`)

- **`tsconfig.paths.json`** — add three entries (alphabetical placement after `@auth`):
  ```json
  "@branches": ["./src/branches/index.ts"],
  "@branches/dto": ["./src/branches/dto/index.ts"],
  "@branches/interfaces": ["./src/branches/interfaces/index.ts"]
  ```
- **`jest.config.ts`** (or wherever `moduleNameMapper` lives) — mirror those three aliases so tests resolve them.

### New module (`apps/api/src/branches/`)

```
branches/
├── dto/
│   ├── create-branch.dto.ts
│   ├── update-branch.dto.ts
│   ├── list-branches.dto.ts
│   └── index.ts
├── infrastructure/
│   ├── prisma-branch.repository.ts
│   ├── in-memory-branch.repository.ts
│   └── index.ts
├── interfaces/
│   ├── branch.repository.interface.ts
│   └── index.ts
├── branches.tokens.ts
├── branches.module.ts
├── branches.controller.ts
├── branches.service.ts
├── branches.cleanup.service.ts
├── branches.controller.spec.ts
├── branches.service.spec.ts
└── index.ts
```

#### `branches.tokens.ts`

```ts
export const BRANCH_REPOSITORY = Symbol('BranchRepositoryInterface')
```

#### `interfaces/branch.repository.interface.ts`

```ts
import type { Prisma, ResourceStatus } from '@glossops/database'

export interface CreateBranchData {
  name: string
  address?: string
  phone?: string
  email?: string
}

export interface UpdateBranchData {
  name?: string
  address?: string
  phone?: string
  email?: string
}

export interface ListBranchesParams {
  status?: ResourceStatus | 'ALL'
  search?: string
  page: number
  limit: number
}

export interface BranchPage {
  data: Prisma.BranchModel[]
  total: number
  page: number
  limit: number
}

export interface BranchRepositoryInterface {
  create(
    organizationId: string,
    data: CreateBranchData
  ): Promise<Prisma.BranchModel>
  findById(
    id: string,
    organizationId: string
  ): Promise<Prisma.BranchModel | null>
  findByName(
    name: string,
    organizationId: string
  ): Promise<Prisma.BranchModel | null>
  findAll(
    organizationId: string,
    params: ListBranchesParams
  ): Promise<BranchPage>
  countActive(organizationId: string): Promise<number>
  update(
    id: string,
    organizationId: string,
    data: UpdateBranchData
  ): Promise<Prisma.BranchModel>
  softDelete(id: string, organizationId: string): Promise<Prisma.BranchModel>
  findExpiredDeleted(olderThan: Date): Promise<Prisma.BranchModel[]>
  hardDelete(id: string): Promise<void>
}
```

- `findById` and `findByName` filter by `status = ACTIVE` (matches the customer pattern at `prisma-customer.repository.ts:31,84`).
- `findAll` honors the optional `status` filter (`ACTIVE | DELETED | ALL`); default is `ACTIVE` resolved at the service level.
- `countActive` is what the service uses to enforce the "last active branch" guard.
- `findExpiredDeleted` and `hardDelete` are used exclusively by `BranchCleanupService`.

#### `infrastructure/prisma-branch.repository.ts`

Standard Prisma implementation. Notes:

- `softDelete` does `updateMany({ where: { id, organizationId }, data: { status: DELETED, deletedAt: new Date() } })` then re-reads — same pattern as `prisma-customer.repository.ts:117`.
- `hardDelete` does `deleteMany({ where: { id } })` — no `organizationId` filter because the cron operates globally.
- `findExpiredDeleted(olderThan)` does `findMany({ where: { status: DELETED, deletedAt: { lt: olderThan } } })`.

#### `infrastructure/in-memory-branch.repository.ts`

Mirror of the Prisma implementation backed by a `Map<string, BranchModel>`. Required for service/controller specs to stay Prisma-free per the repository pattern in `CLAUDE.md`.

#### `dto/create-branch.dto.ts`

```ts
@ApiProperty({ example: 'Sucursal CDMX' })
@IsString()
@MaxLength(100)
name: string

@ApiPropertyOptional() @IsOptional() @IsString() address?: string
@ApiPropertyOptional() @IsOptional() @IsString() phone?: string
@ApiPropertyOptional() @IsOptional() @IsEmail()  email?: string
```

#### `dto/update-branch.dto.ts`

```ts
export class UpdateBranchDto extends PartialType(CreateBranchDto) {}
```

#### `dto/list-branches.dto.ts`

`page`, `limit`, `search`, plus:

```ts
@ApiPropertyOptional({ enum: ['ACTIVE', 'DELETED', 'ALL'], default: 'ACTIVE' })
@IsOptional()
@IsIn(['ACTIVE', 'DELETED', 'ALL'])
status?: 'ACTIVE' | 'DELETED' | 'ALL'
```

#### `branches.service.ts`

Key methods:

- `create(organizationId, data)`:
  1. `findByName(data.name, organizationId)` — if hit → `409 branch_name_taken`.
  2. `repository.create(...)`.

- `findAll(organizationId, dto)` — defaults `status` to `ACTIVE` when omitted.

- `findOne(id, organizationId)` — `404 branch_not_found` when null.

- `update(id, organizationId, data)`:
  1. Confirm the branch exists (`findOne`).
  2. If `data.name` differs from current → `findByName` → `409` if it collides.
  3. `repository.update`.

- `remove(id, organizationId)`:
  1. Confirm it exists.
  2. `count = repository.countActive(organizationId)`.
  3. If `count <= 1` → `422 cannot_delete_last_branch` (`UnprocessableEntityException`).
  4. `repository.softDelete(...)`.

#### `branches.controller.ts`

```ts
@ApiTags('Branches')
@ApiBearerAuth()
@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get()
  findAll(@CurrentAccount() account, @Query() dto: ListBranchesDto) { ... }

  @Get(':id')
  findOne(@CurrentAccount() account, @Param('id') id: string) { ... }

  @Post()
  @Roles(Role.OWNER, Role.MANAGER)
  create(@CurrentAccount() account, @Body() dto: CreateBranchDto) { ... }

  @Patch(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  update(@CurrentAccount() account, @Param('id') id: string, @Body() dto: UpdateBranchDto) { ... }

  @Delete(':id')
  @HttpCode(204)
  @Roles(Role.OWNER, Role.MANAGER)
  remove(@CurrentAccount() account, @Param('id') id: string) { ... }
}
```

All handlers extract `organizationId` from `account.organizationId!` — never the body or path.

#### `branches.cleanup.service.ts`

Uses `@nestjs/schedule` (`@Cron('0 3 * * *')` — 03:00 daily). Add `@nestjs/schedule` to `apps/api/package.json` if not already a dependency.

```ts
@Injectable()
export class BranchCleanupService {
  private readonly RETENTION_DAYS = 30
  constructor(
    @Inject(BRANCH_REPOSITORY) private readonly repo: BranchRepositoryInterface
  ) {}

  @Cron('0 3 * * *')
  async cleanup(): Promise<void> {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - this.RETENTION_DAYS)
    const expired = await this.repo.findExpiredDeleted(cutoff)
    for (const branch of expired) {
      await this.repo.hardDelete(branch.id)
    }
  }
}
```

The Prisma cascade behavior on the existing FKs (`organization_member`, `work_order`, `inventory`, `purchase_order`, `invoice`, `activity_log`) is **not** currently configured to cascade — verify in `schema.prisma`. For the MVP, the only cascade that actually matters is `organization_member` (the user-branch link the user mentioned). Two options:

- **Option A (recommended):** Add `onDelete: Cascade` to the `OrganizationMember.branch` relation. Other dependents (work orders, inventory) will throw FK violations until those modules ship — and at that point we revisit. Acceptable because by definition a soft-deleted branch with active work orders or inventory is a state we'll want to flag anyway.
- **Option B:** Inside `hardDelete`, run a transaction that explicitly deletes member rows first. Avoids schema-level cascade, more code.

Plan picks **Option A** — minimal and explicit at the schema level. Migration adds the cascade on the existing FK.

#### `branches.module.ts`

```ts
@Module({
  imports: [PrismaModule, ScheduleModule.forRoot()],
  controllers: [BranchesController],
  providers: [
    { provide: BRANCH_REPOSITORY, useClass: PrismaBranchRepository },
    BranchesService,
    BranchCleanupService,
  ],
})
export class BranchesModule {}
```

If `ScheduleModule.forRoot()` is already registered in `AppModule`, omit it from the import here.

### Wire the module (`apps/api/src/app.module.ts`)

- Add `BranchesModule` to the `imports` array — same place `OrganizationsModule` and `CustomersModule` are registered.

### Tests

All specs use the in-memory repository — never Prisma mocks (per `CLAUDE.md`).

- **`branches.service.spec.ts`** (priority specs):
  - `create` — happy path; rejects duplicate name with `ConflictException`.
  - `findOne` — throws `NotFoundException` for unknown id and for branches in another org.
  - `findAll` — defaults to ACTIVE; honors `status=DELETED`; honors `status=ALL`.
  - `update` — updates fields; rejects rename collision; allows rename to its own current name.
  - `remove` — soft-deletes; throws `UnprocessableEntityException` when it is the last ACTIVE branch.

- **`branches.controller.spec.ts`** — RBAC checks: only `OWNER` and `MANAGER` can create/update/delete; any role can list/read.

- **`infrastructure/in-memory-branch.repository.spec.ts`** — every method exercised at least once, mirroring the structure of `in-memory-organization.repository.spec.ts`.

- **`branches.cleanup.service.spec.ts`** — given two soft-deleted branches (one < 30 days, one > 30 days), only the older one is hard-deleted. Verifies via in-memory repo.

---

## Implementation Order

1. **Schema** — add `status` + `deletedAt` to `Branch`, add cascade on `OrganizationMember.branch`, run the migration, regenerate the client.
2. **Path aliases** — `tsconfig.paths.json` + Jest mapper.
3. **Interfaces & DTOs** — `branch.repository.interface.ts`, the three DTOs, barrels.
4. **In-memory repository + spec** — easiest to get right with TDD.
5. **Prisma repository** — same surface as the in-memory one.
6. **Service + spec** — encodes all business rules (uniqueness, last-active guard).
7. **Controller + spec** — RBAC and DTO wiring.
8. **Cleanup service + spec** — cron job.
9. **Module wiring** — `BranchesModule`, register in `AppModule`.
10. **Manual verification via Swagger UI** (see below).

Each step compiles independently. Steps 4–8 each pass `pnpm test` before moving on.

---

## Verification

From the monorepo root:

```bash
# 1. Apply migration and regenerate Prisma client
cd packages/database && npx prisma migrate dev --name add-branch-soft-delete && npx prisma generate

# 2. Lint, typecheck, and unit tests
cd ../../apps/api && pnpm lint && pnpm test
```

**Manual end-to-end via Swagger UI (`http://localhost:4000/docs`):**

1. Register a new account → confirm `GET /branches` returns one ACTIVE branch carrying the org name.
2. `POST /branches` with `{ name: 'Sucursal Norte' }` → 201.
3. `POST /branches` with the same name again → 409 `branch_name_taken`.
4. `PATCH /branches/:id` rename to a fresh name → 200; rename to a name that already exists → 409.
5. `DELETE /branches/:id` on the second branch → 204; `GET /branches` no longer lists it; `GET /branches?status=DELETED` does; the row in the DB has `status = DELETED`, `deleted_at` set.
6. `DELETE /branches/:id` on the last remaining ACTIVE branch → 422 `cannot_delete_last_branch`.
7. `POST /organizations/invitations` with the soft-deleted branch's id → 404 `branch_not_found` (the invitation flow filters by `findFirst({ where: { id, organizationId } })` — confirm it does not surface DELETED branches; if it does, that's a follow-up bug).
8. **Cleanup job:** temporarily drop `RETENTION_DAYS` to `0` and trigger the cron manually (`branchCleanupService.cleanup()` from a quick REPL or one-off endpoint) → the soft-deleted branch is gone from the DB along with its `organization_member` rows; the linked accounts still exist. Restore `RETENTION_DAYS = 30` before committing.

---

## Out of Scope

- A `branches/:id/members` endpoint that reassigns members across branches before delete — current design lets the cron sweep them.
- Restoring a soft-deleted branch (`POST /branches/:id/restore`) — not requested; trivially addable later.
- Hardening the cron job (locking, retries, multi-instance safety) — fine for single-instance MVP.
- `findBranchById` deduplication between `OrganizationRepository` (already exists) and `BranchRepository` — staying split for now to avoid cross-module coupling.
- Frontend integration of the branch selector for invitations.
