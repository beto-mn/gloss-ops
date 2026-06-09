## Why

`apps/api` and `apps/web` currently define their own Zod schemas, TypeScript types, and enums independently, creating duplicated definitions that can silently diverge when the domain model changes. A shared package centralizes these contracts so both apps stay in sync from a single source of truth.

## What Changes

- Create `packages/shared` as a new pnpm workspace package (`@glossops/shared`)
- Export Zod schemas for all domain entities (Customer, CustomerAsset, WorkOrder, Service, Supplier, Brand, Branch, Organization, Inventory, PurchaseOrder, Warranty, Invoice, ActivityLog)
- Export TypeScript types via `z.infer<>` for every schema
- Export all domain enums: `Role`, `WorkOrderStatus`, `CheckpointType`, `ActivityAction`, `ResourceStatus`, `AssetType`, `BrandCategory`, `InvoiceStatus`, `PurchaseOrderStatus`, `WarrantyStatus`
- Export shared DTOs: `PaginationDto`, `IdParamDto`, pagination meta type
- Register `@glossops/shared` as a dependency in both `apps/api` and `apps/web`
- Configure `turbo.json` to include the new package in the build pipeline

## Capabilities

### New Capabilities

- `shared-package`: The `packages/shared` workspace package — its folder structure, `package.json`, `tsconfig.json`, barrel exports, and build configuration.
- `shared-schemas`: The Zod schemas and `z.infer<>` types for all domain entities and common DTOs.
- `shared-enums`: All domain enums extracted from the API and made available to both apps.

### Modified Capabilities

- `frontend-setup`: `apps/web` gains a new workspace dependency (`@glossops/shared`) — the tsconfig path alias and import conventions change slightly.

## Impact

- **New**: `packages/shared/` — package root, `src/`, barrel exports, `package.json`, `tsconfig.json`
- **Modified**: `apps/api/package.json`, `apps/web/package.json` — add `@glossops/shared` dependency
- **Modified**: `pnpm-workspace.yaml` — already includes `packages/*`, no change needed if pattern matches
- **Modified**: `turbo.json` — ensure `packages/shared` participates in the build pipeline
- **Modified**: `apps/api` — existing enum/DTO definitions replaced by imports from `@glossops/shared` (or kept as-is in a first pass to avoid risk)
- **Modified**: `apps/web` — existing inline Zod schemas replaced by imports from `@glossops/shared`
