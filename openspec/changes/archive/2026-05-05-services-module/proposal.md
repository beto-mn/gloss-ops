# Proposal: Services Module

## Why

Automotive shops needed a managed service catalog (ceramic coating, PPF, tint, detail, etc.) with pricing and warranty configuration so that work orders could include line items and the warranty auto-generation logic could reference a defined service.

## What Changes

- Added a `ServicesModule` with 7 endpoints at `/services`
- Implemented `isActive` toggle instead of soft-delete, preserving historical price and warranty snapshots referenced by past work orders
- Added `POST /services/:id/activate` and `POST /services/:id/deactivate` dedicated endpoints
- Hard delete blocked when service has `WorkOrderItem` or `Warranty` references
- Added `@@unique([organizationId, name])` database constraint via migration
- CFDI fields (`claveProdServ`, `claveUnidad`) validated by format regex, catalog validation deferred
- TS path aliases and Jest mapper entries added for `@services`, `@services/dto`, `@services/interfaces`
- `ServicesService` exported so `WorkOrdersModule` can inject it for service-existence validation

## Capabilities

- `services-module`: CRUD catalog for managing services with activate/deactivate lifecycle, name uniqueness enforcement, FK protection on delete, warranty configuration fields, and CFDI format validation

## Impact

- `packages/database/prisma/schema.prisma` — added `@@unique([organizationId, name])` to `Service` model
- `packages/database/prisma/migrations/` — new migration `add_service_unique_name`
- `apps/api/src/services/` — new module (services.module.ts, services.tokens.ts, services.controller.ts, services.service.ts, index.ts, dto/, interfaces/, infrastructure/)
- `apps/api/tsconfig.paths.json` — added `@services`, `@services/dto`, `@services/interfaces`
- `apps/api/package.json` — added jest moduleNameMapper entries
- `apps/api/src/app.module.ts` — registered `ServicesModule`
