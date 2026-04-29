# Branches Module — Design Spec

**Date:** 2026-04-28
**Status:** Draft

---

## Goal

Expose the `Branch` aggregate as a first-class CRUD module under `/branches`. After dropping `Branch.isMain`, branches are peers of one another; an organization currently has whatever branch was auto-created at registration and no way to add more. This module lets Owners and Managers create, rename, and delete branches, and lets any member list and read them — providing the data the frontend needs to populate the branch selector on the invitation form.

The deletion model intentionally does not expose a hard delete. Every `DELETE` is a soft delete (`status = DELETED`, `deletedAt = now()`); a daily background job hard-deletes any branch that has been soft-deleted for more than 30 days. The 30-day window gives Owners a safety net while keeping the database clean over time.

---

## Background

The `Branch` table today has no `status` field, no `deletedAt`, and no uniqueness on `(organizationId, name)`. Every other dependent module (`organization_member`, `work_order`, `inventory`, `purchase_order`, `invoice`, `activity_log`) FK-references `branch.id`, so any deletion must coordinate with those tables.

Two real-world constraints shape the deletion design:

- **The system invariant "every organization has at least one branch"** (`docs/database-design.md` §3.2) must hold. Soft-deleting the last ACTIVE branch would silently break the invitation flow, work-order creation, and inventory scoping.
- **Members anchored to a deleted branch are a relationship, not a person.** When a branch is hard-deleted, the right thing to remove is the `OrganizationMember` rows (the user-branch links). The `account` rows themselves are untouched. This is what cascading the delete on `OrganizationMember.branchId` accomplishes.

---

## Data Model

`Branch` gains two columns:

```prisma
model Branch {
  id             String         @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organizationId String         @map("organization_id") @db.Uuid
  name           String
  address        String?
  phone          String?
  email          String?
  status         ResourceStatus @default(ACTIVE)         // NEW
  deletedAt      DateTime?      @map("deleted_at")        // NEW
  createdAt      DateTime       @default(now()) @map("created_at")
  updatedAt      DateTime       @updatedAt @map("updated_at")
  // …relations unchanged
  members        OrganizationMember[]
}
```

`OrganizationMember.branch` gains an explicit cascade so the cron job's `DELETE FROM branch` propagates without manual transaction handling:

```prisma
model OrganizationMember {
  // …unchanged fields
  branch Branch @relation(fields: [branchId], references: [id], onDelete: Cascade)  // CHANGED
}
```

A single Prisma migration covers both:

```sql
ALTER TABLE branch ADD COLUMN status "ResourceStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE branch ADD COLUMN deleted_at TIMESTAMP(3);

ALTER TABLE organization_member DROP CONSTRAINT organization_member_branch_id_fkey;
ALTER TABLE organization_member
  ADD CONSTRAINT organization_member_branch_id_fkey
  FOREIGN KEY (branch_id) REFERENCES branch(id) ON DELETE CASCADE;
```

Existing rows backfill to `status = ACTIVE`, `deleted_at = NULL`. No seed change is required; the auto-created branch on registration continues to use the organization's name.

`(organizationId, name)` uniqueness is **not** enforced in the database. It is enforced at the application layer, scoped to ACTIVE branches only, matching the customer email/phone uniqueness pattern (`prisma-customer.repository.ts:84,93`). A DELETED branch does not block a future ACTIVE branch from reusing its name.

---

## API Contract

All endpoints live under `/branches` and require a valid JWT. `organizationId` is read from `request.user.organizationId` — never from the URL or body.

### `POST /branches`

Create a new branch.

| Situation                             | HTTP | Body                             |
| ------------------------------------- | ---- | -------------------------------- |
| Body fails validation                 | 400  | validation error                 |
| Caller is not Owner or Manager        | 403  | (existing `Roles` guard)         |
| Name already used by an ACTIVE branch | 409  | `{ error: 'branch_name_taken' }` |
| Success                               | 201  | the created `Branch`             |

Body:

```ts
{
  name: string         // 1..100 chars
  address?: string
  phone?: string
  email?: string       // RFC 5322
}
```

### `GET /branches`

List branches scoped to the caller's organization.

Query parameters:

| Param  | Type                       | Default  | Notes                            |
| ------ | -------------------------- | -------- | -------------------------------- |
| status | `ACTIVE \| DELETED \| ALL` | `ACTIVE` | Status filter                    |
| search | string                     | —        | Case-insensitive match on `name` |
| page   | int ≥ 1                    | `1`      | —                                |
| limit  | int ∈ [1, 100]             | `20`     | —                                |

Response:

```ts
{
  data: Branch[]
  total: number
  page: number
  limit: number
}
```

### `GET /branches/:id`

Read a single ACTIVE branch in the caller's org.

| Situation                                  | HTTP | Body                            |
| ------------------------------------------ | ---- | ------------------------------- |
| Branch missing, in another org, or DELETED | 404  | `{ error: 'branch_not_found' }` |
| Success                                    | 200  | the `Branch`                    |

The 404 message is uniform regardless of whether the branch belongs to another org or has been soft-deleted, so callers cannot probe foreign or deleted branch IDs.

### `PATCH /branches/:id`

Update fields on an ACTIVE branch.

| Situation                                         | HTTP | Body                             |
| ------------------------------------------------- | ---- | -------------------------------- |
| Body fails validation                             | 400  | validation error                 |
| Caller is not Owner or Manager                    | 403  | (existing `Roles` guard)         |
| Branch missing, in another org, or DELETED        | 404  | `{ error: 'branch_not_found' }`  |
| Rename collides with another ACTIVE branch's name | 409  | `{ error: 'branch_name_taken' }` |
| Success                                           | 200  | the updated `Branch`             |

Renaming a branch to its own current name is a no-op (no 409).

### `DELETE /branches/:id`

Soft delete an ACTIVE branch.

| Situation                                   | HTTP | Body                                     |
| ------------------------------------------- | ---- | ---------------------------------------- |
| Caller is not Owner or Manager              | 403  | (existing `Roles` guard)                 |
| Branch missing, in another org, or DELETED  | 404  | `{ error: 'branch_not_found' }`          |
| Branch is the last ACTIVE branch in the org | 422  | `{ error: 'cannot_delete_last_branch' }` |
| Success                                     | 204  | (empty)                                  |

The endpoint deliberately does not accept a `?permanent=true` flag. Hard deletion happens only through the cleanup cron.

---

## Repository Layer

### Interface

```ts
interface BranchRepositoryInterface {
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

  // Cleanup-only
  findExpiredDeleted(olderThan: Date): Promise<Prisma.BranchModel[]>
  hardDelete(id: string): Promise<void>
}
```

`findById` and `findByName` filter by `status = ACTIVE`. `findAll` accepts `status: ResourceStatus | 'ALL'` and applies it; the controller resolves the default of `ACTIVE`. `countActive` exists explicitly so the service can enforce the last-branch guard with a single query.

`findExpiredDeleted` and `hardDelete` are scoped only to the cleanup service; they are not surfaced through the controller and are not bound by `organizationId` (the cron operates globally).

### Prisma implementation

- `softDelete`: `updateMany({ where: { id, organizationId, status: ACTIVE }, data: { status: DELETED, deletedAt: new Date() } })` then re-read. Same pattern as `prisma-customer.repository.ts:117`.
- `hardDelete`: `deleteMany({ where: { id } })`. The schema cascade removes the dependent `organization_member` rows.
- `findExpiredDeleted`: `findMany({ where: { status: DELETED, deletedAt: { lt: olderThan } } })`.

### In-memory implementation

A `Map<string, BranchModel>` keyed by id. `findExpiredDeleted` iterates the map filtering by `status === DELETED && deletedAt < olderThan`. `hardDelete` also drops `OrganizationMember` rows from the in-memory members store, mirroring the schema cascade so the cleanup spec can verify the link is gone.

---

## Service Layer

```ts
@Injectable()
export class BranchesService {
  constructor(
    @Inject(BRANCH_REPOSITORY)
    private readonly branches: BranchRepositoryInterface
  ) {}

  async create(organizationId: string, data: CreateBranchData) {
    const existing = await this.branches.findByName(data.name, organizationId)
    if (existing) throw new ConflictException({ error: 'branch_name_taken' })
    return this.branches.create(organizationId, data)
  }

  findAll(organizationId: string, dto: ListBranchesDto) {
    return this.branches.findAll(organizationId, {
      status: dto.status ?? 'ACTIVE',
      search: dto.search,
      page: dto.page ?? 1,
      limit: dto.limit ?? 20,
    })
  }

  async findOne(id: string, organizationId: string) {
    const branch = await this.branches.findById(id, organizationId)
    if (!branch) throw new NotFoundException({ error: 'branch_not_found' })
    return branch
  }

  async update(id: string, organizationId: string, data: UpdateBranchData) {
    const current = await this.findOne(id, organizationId)
    if (data.name && data.name !== current.name) {
      const collision = await this.branches.findByName(
        data.name,
        organizationId
      )
      if (collision) throw new ConflictException({ error: 'branch_name_taken' })
    }
    return this.branches.update(id, organizationId, data)
  }

  async remove(id: string, organizationId: string) {
    await this.findOne(id, organizationId)
    const activeCount = await this.branches.countActive(organizationId)
    if (activeCount <= 1) {
      throw new UnprocessableEntityException({
        error: 'cannot_delete_last_branch',
      })
    }
    await this.branches.softDelete(id, organizationId)
  }
}
```

`findOne` is the single source of "exists in this org and is ACTIVE" — every mutating method composes through it so the 404 behavior stays uniform.

---

## Controller Layer

```ts
@ApiTags('Branches')
@ApiBearerAuth()
@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Post()
  @Roles(Role.OWNER, Role.MANAGER)
  create(@CurrentAccount() account: AuthContext, @Body() dto: CreateBranchDto) {
    return this.branchesService.create(account.organizationId!, dto)
  }

  @Get()
  findAll(
    @CurrentAccount() account: AuthContext,
    @Query() dto: ListBranchesDto
  ) {
    return this.branchesService.findAll(account.organizationId!, dto)
  }

  @Get(':id')
  findOne(@CurrentAccount() account: AuthContext, @Param('id') id: string) {
    return this.branchesService.findOne(id, account.organizationId!)
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  update(
    @CurrentAccount() account: AuthContext,
    @Param('id') id: string,
    @Body() dto: UpdateBranchDto
  ) {
    return this.branchesService.update(id, account.organizationId!, dto)
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles(Role.OWNER, Role.MANAGER)
  remove(@CurrentAccount() account: AuthContext, @Param('id') id: string) {
    return this.branchesService.remove(id, account.organizationId!)
  }
}
```

DTOs:

```ts
class CreateBranchDto {
  @ApiProperty({ example: 'Sucursal CDMX' })
  @IsString()
  @MaxLength(100)
  name: string

  @ApiPropertyOptional() @IsOptional() @IsString() address?: string
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string
}

class UpdateBranchDto extends PartialType(CreateBranchDto) {}

class ListBranchesDto {
  @ApiPropertyOptional({
    enum: ['ACTIVE', 'DELETED', 'ALL'],
    default: 'ACTIVE',
  })
  @IsOptional()
  @IsIn(['ACTIVE', 'DELETED', 'ALL'])
  status?: 'ACTIVE' | 'DELETED' | 'ALL'

  @ApiPropertyOptional() @IsOptional() @IsString() search?: string

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number

  @ApiPropertyOptional({ minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number
}
```

---

## Cleanup Service

A cron-driven background job purges expired soft-deleted branches.

```ts
@Injectable()
export class BranchCleanupService {
  private readonly RETENTION_DAYS = 30

  constructor(
    @Inject(BRANCH_REPOSITORY)
    private readonly branches: BranchRepositoryInterface
  ) {}

  @Cron('0 3 * * *') // 03:00 daily, server local time
  async cleanup(): Promise<void> {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - this.RETENTION_DAYS)
    const expired = await this.branches.findExpiredDeleted(cutoff)
    for (const branch of expired) {
      await this.branches.hardDelete(branch.id)
    }
  }
}
```

Uses `@nestjs/schedule`. The cron runs once per day; `hardDelete` is idempotent (a missing row is a no-op via `deleteMany`). The schema-level `ON DELETE CASCADE` on `organization_member.branch_id` removes the user-branch links automatically.

For MVP this runs in-process on the API. Multi-instance hardening (advisory lock or external scheduler) is out of scope.

---

## Error Responses

| Situation                                 | HTTP | Body                                     |
| ----------------------------------------- | ---- | ---------------------------------------- |
| DTO validation failure                    | 400  | (class-validator error)                  |
| Caller is not Owner / Manager (mutations) | 403  | (existing `Roles` guard)                 |
| Branch not found, foreign org, or DELETED | 404  | `{ error: 'branch_not_found' }`          |
| Name collision on create or rename        | 409  | `{ error: 'branch_name_taken' }`         |
| Last ACTIVE branch on delete              | 422  | `{ error: 'cannot_delete_last_branch' }` |

---

## Testing Strategy

No Prisma mocks. Service, controller, and cleanup specs use `InMemoryBranchRepository`.

### In-memory repository spec

- `create` persists and assigns `status = ACTIVE`, `deletedAt = null`.
- `findById` returns `null` for DELETED branches and for branches in another org.
- `findByName` returns `null` for DELETED branches (so reuse is allowed once cleanup runs).
- `findAll` honors `status = ACTIVE | DELETED | ALL` and applies the `search` substring filter.
- `countActive` excludes DELETED branches.
- `softDelete` flips status and sets `deletedAt`.
- `findExpiredDeleted` returns only DELETED branches with `deletedAt < cutoff`.
- `hardDelete` removes the branch and its `OrganizationMember` rows (cascade simulation).

### Service spec — `branches.service.spec.ts`

- `create` — happy path; `409 branch_name_taken` on duplicate name.
- `findAll` — defaults `status` to `ACTIVE`; honors explicit `DELETED` and `ALL`.
- `findOne` — `404 branch_not_found` for unknown id, foreign org, and DELETED branch.
- `update` — updates fields; rejects rename collision with `409`; renaming to its own current name passes.
- `remove` — soft-deletes; throws `422 cannot_delete_last_branch` when `countActive <= 1`.

### Controller spec — `branches.controller.spec.ts`

- DTO validation rejects empty body on `POST` (`400`).
- RBAC: only `OWNER` and `MANAGER` reach `create`, `update`, `remove`; any role reaches `findAll`, `findOne`.

### Cleanup spec — `branches.cleanup.service.spec.ts`

- Given two soft-deleted branches — one with `deletedAt = 31 days ago`, one with `deletedAt = 5 days ago` — only the older one is hard-deleted.
- Hard-deleting a branch removes its `OrganizationMember` rows but not the linked `Account`.

---

## Out of Scope

- Restoring a soft-deleted branch (`POST /branches/:id/restore`) — easy follow-up; not requested.
- A frontend-friendly `branchId` selector or any frontend integration.
- Reassigning members across branches before delete — not needed under the cron-cleanup model.
- Deduplicating `findBranchById` between `OrganizationRepository` (already exists for invitations) and `BranchRepository` — kept split to avoid cross-module coupling.
- Multi-instance / distributed cron coordination.

---

## Files Changed

| Action        | File                                                                       |
| ------------- | -------------------------------------------------------------------------- |
| Modify        | `packages/database/prisma/schema.prisma`                                   |
| New migration | `packages/database/prisma/migrations/…add-branch-soft-delete/`             |
| Modify        | `apps/api/tsconfig.paths.json`                                             |
| Modify        | `apps/api/jest.config.ts` (or wherever `moduleNameMapper` lives)           |
| Modify        | `apps/api/package.json` (add `@nestjs/schedule`)                           |
| Modify        | `apps/api/src/app.module.ts`                                               |
| New           | `apps/api/src/branches/branches.module.ts`                                 |
| New           | `apps/api/src/branches/branches.tokens.ts`                                 |
| New           | `apps/api/src/branches/branches.controller.ts`                             |
| New           | `apps/api/src/branches/branches.controller.spec.ts`                        |
| New           | `apps/api/src/branches/branches.service.ts`                                |
| New           | `apps/api/src/branches/branches.service.spec.ts`                           |
| New           | `apps/api/src/branches/branches.cleanup.service.ts`                        |
| New           | `apps/api/src/branches/branches.cleanup.service.spec.ts`                   |
| New           | `apps/api/src/branches/index.ts`                                           |
| New           | `apps/api/src/branches/dto/create-branch.dto.ts`                           |
| New           | `apps/api/src/branches/dto/update-branch.dto.ts`                           |
| New           | `apps/api/src/branches/dto/list-branches.dto.ts`                           |
| New           | `apps/api/src/branches/dto/index.ts`                                       |
| New           | `apps/api/src/branches/interfaces/branch.repository.interface.ts`          |
| New           | `apps/api/src/branches/interfaces/index.ts`                                |
| New           | `apps/api/src/branches/infrastructure/prisma-branch.repository.ts`         |
| New           | `apps/api/src/branches/infrastructure/in-memory-branch.repository.ts`      |
| New           | `apps/api/src/branches/infrastructure/in-memory-branch.repository.spec.ts` |
| New           | `apps/api/src/branches/infrastructure/index.ts`                            |
