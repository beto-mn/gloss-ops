# Proposal: Suppliers Module

## Why

Automotive shops needed a managed vendor catalog so that inventory items could reference a supplier and purchase orders could be addressed to a specific vendor.

## What Changes

- Added a `SuppliersModule` with 5 standard CRUD endpoints at `/suppliers`
- No `isActive` toggle — suppliers are hard-deleted when no longer needed and unreferenced
- Hard delete blocked when supplier has `Inventory` or `PurchaseOrder` references
- Added `@@unique([organizationId, name])` database constraint via migration
- Search across `name`, `contactName`, and `email` fields
- TS path aliases and Jest mapper entries added for `@suppliers`, `@suppliers/dto`, `@suppliers/interfaces`
- `SuppliersService` exported so `PurchaseOrdersModule` can inject it for supplier-existence validation

## Capabilities

- `suppliers-module`: CRUD catalog for managing vendor suppliers with name uniqueness enforcement, FK protection on delete, multi-field search, and RBAC per endpoint

## Impact

- `packages/database/prisma/schema.prisma` — added `@@unique([organizationId, name])` to `Supplier` model
- `packages/database/prisma/migrations/` — new migration `add_supplier_unique_name`
- `apps/api/src/suppliers/` — new module (suppliers.module.ts, suppliers.tokens.ts, suppliers.controller.ts, suppliers.service.ts, index.ts, dto/, interfaces/, infrastructure/)
- `apps/api/tsconfig.paths.json` — added `@suppliers`, `@suppliers/dto`, `@suppliers/interfaces`
- `apps/api/package.json` — added jest moduleNameMapper entries
- `apps/api/src/app.module.ts` — registered `SuppliersModule`
