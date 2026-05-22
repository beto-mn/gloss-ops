# Proposal: Warranties Module

## Why

Completed work orders generate service warranties that customers need to reference for claims. There was no automated mechanism to create warranty records on WO completion, no API to read or void them, and no validation preventing new warranty-claim work orders from referencing expired or voided warranties.

## What Changes

- New `WarrantiesModule` that auto-generates warranty records when a work order transitions to COMPLETED
- Four HTTP endpoints: list by work order, list by asset, get single warranty, void a warranty
- WARRANTY_CLAIM validation integrated into the work order creation flow
- `WorkOrdersService` extended to call `WarrantyService` at two points: on WO completion and on WARRANTY_CLAIM creation
- Activity log recorded when a warranty is voided

## Capabilities

- `warranties-module`: Auto-generate, read, and void warranty records tied to work order service items, with claim validation on new work orders

## Impact

- `apps/api/src/warranties/` — new module (interface, in-memory repo, Prisma repo, DTO, service, three controllers, module, barrel)
- `apps/api/src/work-orders/work-orders.service.ts` — injected `WarrantyService`, added two call sites
- `apps/api/src/work-orders/work-orders.module.ts` — added `WarrantiesModule` to imports
- `apps/api/src/work-orders/work-orders.service.spec.ts` — added `WarrantyService` mock and new test cases
- `apps/api/src/app.module.ts` — registered `WarrantiesModule`
- `apps/api/tsconfig.paths.json` and `apps/api/package.json` — added `@warranties` path aliases
