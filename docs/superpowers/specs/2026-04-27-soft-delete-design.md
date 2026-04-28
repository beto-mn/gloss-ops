# Soft Delete & Hard Delete — Design Spec

**Date:** 2026-04-27
**Status:** Approved

---

## Goal

Add soft delete and hard delete to all modules that currently have CRUD operations: `customers` and `organizations`. A soft delete marks the record as `DELETED` (hiding it from all queries) without removing it from the database. A hard delete permanently removes the row.

---

## Data Model

A single shared enum is added to the Prisma schema and reused across both models:

```prisma
enum ResourceStatus {
  ACTIVE
  DELETED
}
```

The `status` field is added to `Customer` and `Organization` with a default of `ACTIVE`:

```prisma
model Customer {
  // existing fields...
  status ResourceStatus @default(ACTIVE)
}

model Organization {
  // existing fields...
  status ResourceStatus @default(ACTIVE)
}
```

One migration covers both models. Existing rows receive `ACTIVE` via the column default.

---

## API Contract

A single `DELETE` endpoint per resource accepts an optional `permanent` query param:

| Endpoint                                   | `permanent`       | Action                                | Roles          |
| ------------------------------------------ | ----------------- | ------------------------------------- | -------------- |
| `DELETE /customers/:id`                    | `false` (default) | Soft delete → `status = DELETED`, 204 | Owner, Manager |
| `DELETE /customers/:id?permanent=true`     | `true`            | Hard delete → row removed, 204        | Owner          |
| `DELETE /organizations/:id`                | `false` (default) | Soft delete → `status = DELETED`, 204 | Owner          |
| `DELETE /organizations/:id?permanent=true` | `true`            | Hard delete → row removed, 204        | Owner          |

**GET behavior:**

- All `GET` endpoints (list and by-id) return only records with `status: ACTIVE`.
- There is no `?includeDeleted=true` option.

**Hard delete and already-deleted records:**

- `DELETE /:id?permanent=true` can operate on a record in either `ACTIVE` or `DELETED` status — Owner can permanently clean up a previously soft-deleted record.
- If the record does not exist in the organization at all, the endpoint returns 404.

---

## Error Responses

| Situation                                                                           | HTTP | Body                                                                      |
| ----------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------- |
| Record not found (or belongs to different org, or already `DELETED` on soft delete) | 404  | `{ error: 'customer_not_found' }` / `{ error: 'organization_not_found' }` |
| Permanent delete attempted by non-Owner                                             | 403  | `{ error: 'forbidden' }`                                                  |

---

## Repository Layer

### Interface changes

A `softDelete` method is added. All read methods filter by `status: ACTIVE`. The existing `delete` method remains unchanged in signature but operates without a status filter (enabling hard delete of soft-deleted records).

```ts
interface CustomerRepositoryInterface {
  // NEW
  softDelete(id: string, organizationId: string): Promise<Prisma.CustomerModel>

  // CHANGED: all reads filter status: ACTIVE
  create(
    organizationId: string,
    data: CreateCustomerData
  ): Promise<Prisma.CustomerModel>
  findById(
    id: string,
    organizationId: string
  ): Promise<Prisma.CustomerModel | null>
  findAll(organizationId: string, query: CustomerQuery): Promise<CustomerPage>
  findByEmail(
    email: string,
    organizationId: string
  ): Promise<Prisma.CustomerModel | null>
  findByPhone(
    phone: string,
    organizationId: string
  ): Promise<Prisma.CustomerModel | null>
  update(
    id: string,
    organizationId: string,
    data: UpdateCustomerData
  ): Promise<Prisma.CustomerModel>

  // UNCHANGED in signature — hard delete, no status filter
  delete(id: string, organizationId: string): Promise<void>
}
```

Same structure for `OrganizationRepositoryInterface`.

### Prisma implementation

- `softDelete`: `updateMany({ where: { id, organizationId }, data: { status: 'DELETED' } })` then `findFirst` to return the updated record.
- `delete`: `deleteMany({ where: { id, organizationId } })` — no status filter.
- `findAll`: add `status: 'ACTIVE'` to `where`.
- `findById`, `findByEmail`, `findByPhone`: add `status: 'ACTIVE'` to `where`.

### In-memory implementation

- `softDelete`: sets `status = 'DELETED'` on the stored record; rejects if not found in org.
- `delete`: removes the record regardless of status; rejects if not found in org.
- `findAll`: filters list by `status === 'ACTIVE'`.
- `findById`, `findByEmail`, `findByPhone`: return `null` if record exists but `status === 'DELETED'`.

---

## Service Layer

The `remove` method receives a `permanent` flag and bifurcates:

```ts
async remove(id: string, organizationId: string, permanent: boolean): Promise<void> {
  if (permanent) {
    // Hard delete: no status filter required — operates on ACTIVE or DELETED records.
    // Throws NotFoundException if record does not exist in org.
    await this.customers.delete(id, organizationId)
  } else {
    // Soft delete: only operates on ACTIVE records.
    // findOne throws NotFoundException if not found or already DELETED.
    await this.findOne(id, organizationId)
    await this.customers.softDelete(id, organizationId)
  }
}
```

The service signature remains clean — it only receives what it needs:

```ts
async remove(id: string, organizationId: string, permanent: boolean): Promise<void>
```

Role enforcement for `permanent=true` lives in the **controller**, which already has `AuthContext`:

---

## Controller Layer

```ts
@Delete(':id')
@HttpCode(204)
@Roles(Role.OWNER, Role.MANAGER)
remove(
  @CurrentAccount() account: AuthContext,
  @Param('id') id: string,
  @Query('permanent') permanent?: string,
): Promise<void> {
  const isPermanent = permanent === 'true'
  if (isPermanent && account.role !== Role.OWNER) {
    throw new ForbiddenException({ error: 'forbidden' })
  }
  return this.customersService.remove(id, account.organizationId!, isPermanent)
}
```

The `@Roles(Owner, Manager)` decorator covers the minimum required role (soft delete). The controller enforces the stricter Owner-only requirement for hard delete before delegating to the service.

---

## Testing Strategy

No Prisma mocks. All service tests use `InMemoryCustomerRepository` / `InMemoryOrganizationRepository`.

### In-memory repository spec

- `softDelete` marks the record as `DELETED`
- `softDelete` rejects if record does not belong to org
- `findById` returns `null` for a `DELETED` record
- `findAll` excludes `DELETED` records
- `delete` (hard) removes the record regardless of its status (`ACTIVE` or `DELETED`)
- `findByEmail` / `findByPhone` return `null` for `DELETED` records

### Service spec

- `remove(permanent=false)` soft-deletes an `ACTIVE` record
- `remove(permanent=false)` throws `NotFoundException` if record is already `DELETED`
- `remove(permanent=false)` throws `NotFoundException` if record does not exist
- `remove(permanent=true)` permanently deletes an `ACTIVE` record
- `remove(permanent=true)` permanently deletes a `DELETED` record (Owner cleaning up)
- `remove(permanent=true)` throws `NotFoundException` if record does not belong to org
- `remove(permanent=true)` throws `NotFoundException` if record has already been hard-deleted
- `findOne` throws `NotFoundException` for a `DELETED` record
- `findAll` does not include `DELETED` records

### Controller spec (customers and organizations)

- `DELETE /:id?permanent=true` with role Manager throws `ForbiddenException`
- `DELETE /:id?permanent=true` with role Owner succeeds

---

## Module Scope

This spec covers **`customers`** and **`organizations`** — the only modules with CRUD at the time of writing. Future modules must follow this same pattern when implementing their delete operations.

---

## Files Changed

| Action        | File                                                                                   |
| ------------- | -------------------------------------------------------------------------------------- |
| Modify        | `packages/database/prisma/schema.prisma`                                               |
| New migration | `packages/database/prisma/migrations/…`                                                |
| Modify        | `apps/api/src/customers/interfaces/customer.repository.interface.ts`                   |
| Modify        | `apps/api/src/customers/infrastructure/in-memory-customer.repository.ts`               |
| Modify        | `apps/api/src/customers/infrastructure/in-memory-customer.repository.spec.ts`          |
| Modify        | `apps/api/src/customers/infrastructure/prisma-customer.repository.ts`                  |
| Modify        | `apps/api/src/customers/customers.service.ts`                                          |
| Modify        | `apps/api/src/customers/customers.service.spec.ts`                                     |
| Modify        | `apps/api/src/customers/customers.controller.ts`                                       |
| Modify        | `apps/api/src/organizations/interfaces/organization.repository.interface.ts`           |
| Modify        | `apps/api/src/organizations/infrastructure/in-memory-organizations.repository.ts`      |
| Modify        | `apps/api/src/organizations/infrastructure/in-memory-organizations.repository.spec.ts` |
| Modify        | `apps/api/src/organizations/infrastructure/prisma-organizations.repository.ts`         |
| Modify        | `apps/api/src/organizations/organizations.service.ts`                                  |
| Modify        | `apps/api/src/organizations/organizations.service.spec.ts`                             |
| Modify        | `apps/api/src/organizations/organizations.controller.ts`                               |
