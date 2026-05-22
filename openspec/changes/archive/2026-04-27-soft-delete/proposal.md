# Proposal: Soft Delete & Hard Delete

## Why

Customers and organizations needed a non-destructive deletion path so records could be hidden from all queries without losing audit history. A hard-delete option was also required to let Owners permanently clean up data when needed.

## What Changes

- Added `ResourceStatus` enum (`ACTIVE | DELETED`) to the Prisma schema
- Added `status` field with `ACTIVE` default to `Customer` and `Organization` models
- Added `softDelete` method to `CustomerRepositoryInterface` and `OrganizationRepositoryInterface`
- Updated all read methods (`findById`, `findAll`, `findByEmail`, `findByPhone`) to filter `status: ACTIVE`
- Extended `CustomersService.remove` and `OrganizationsService.removeOrganization` with a `permanent` flag
- Added Owner-only guard in controllers for `?permanent=true` hard delete
- Added `DELETE /organizations/me` endpoint

## Capabilities

- `soft-delete`: Mark a customer or organization record as `DELETED` without removing it from the database; hidden from all list and lookup endpoints

## Impact

- `packages/database/prisma/schema.prisma`
- `packages/database/prisma/migrations/`
- `apps/api/src/customers/interfaces/customer.repository.interface.ts`
- `apps/api/src/customers/infrastructure/in-memory-customer.repository.ts`
- `apps/api/src/customers/infrastructure/in-memory-customer.repository.spec.ts`
- `apps/api/src/customers/infrastructure/prisma-customer.repository.ts`
- `apps/api/src/customers/customers.service.ts`
- `apps/api/src/customers/customers.service.spec.ts`
- `apps/api/src/customers/customers.controller.ts`
- `apps/api/src/customers/customers.controller.spec.ts`
- `apps/api/src/organizations/interfaces/organization.repository.interface.ts`
- `apps/api/src/organizations/infrastructure/in-memory-organizations.repository.ts`
- `apps/api/src/organizations/infrastructure/in-memory-organizations.repository.spec.ts`
- `apps/api/src/organizations/infrastructure/prisma-organizations.repository.ts`
- `apps/api/src/organizations/organizations.service.ts`
- `apps/api/src/organizations/organizations.service.spec.ts`
- `apps/api/src/organizations/organizations.controller.ts`
