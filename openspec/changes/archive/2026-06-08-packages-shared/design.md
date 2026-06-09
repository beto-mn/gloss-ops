## Context

`packages/shared` already exists as a workspace package (`@glossops/shared`) with enums and basic DTOs (`PaginationDto`, `IdParamDto`). However, neither `apps/api` nor `apps/web` imports from it — both define their own copies of enums and domain types.

`apps/web` stores its Zod schemas in `src/lib/schemas/` (e.g., `work-order.schema.ts`). These include inline `z.enum([...])` calls that duplicate the enums already in `packages/shared/src/enums.ts`.

`apps/api` uses NestJS with class-validator decorators for request validation — a different mechanism than Zod. It does define domain enums locally in some modules.

## Goals / Non-Goals

**Goals:**

- Wire `@glossops/shared` as a dependency in `apps/api` and `apps/web`
- Add entity-level Zod response schemas to `packages/shared/src/schemas/` for all domain entities
- Replace inline `z.enum([...])` calls in `apps/web/src/lib/schemas/` with imports from `@glossops/shared`
- Replace locally-defined enum copies in `apps/api` with imports from `@glossops/shared`
- Export entity types via `z.infer<>` from the shared package

**Non-Goals:**

- Replacing NestJS class-validator DTOs in `apps/api` — those serve request validation, not type sharing
- Generating API client code or OpenAPI types
- Removing all domain types from `apps/web/src/lib/schemas/` — types specific to form values or UI state stay local

## Decisions

### 1. Zod for entity schemas (not class-validator)

The shared package uses Zod because `apps/web` already uses React Hook Form + Zod for form validation. Having entity response schemas in Zod lets the frontend validate API responses if needed. The API doesn't use these schemas for request validation — it keeps its NestJS DTOs.

**Alternative considered:** Pure TypeScript interfaces with no runtime validation. Rejected because Zod gives us `z.infer<>` types and optional runtime parsing at no extra cost since Zod is already a dependency.

### 2. Entity schemas are response shapes, not full domain models

Shared schemas model what the API _returns_, not the full Prisma model. Fields like `createdAt`, `updatedAt` are included; internal implementation details (e.g., password hashes) are excluded.

### 3. Additive migration — don't remove web schemas in one shot

`apps/web/src/lib/schemas/` contains both entity response types and form value types (e.g., `CreateWorkOrderValues`). We replace only the entity response types and enums with shared imports; form-specific schemas stay local. This minimizes diff size and risk.

### 4. `apps/api` adopts shared enums, not shared Zod schemas

The API imports enums from `@glossops/shared` (replacing local copies). It does not use the Zod entity schemas — its validation layer remains class-validator.

### 5. Package structure

```
packages/shared/src/
  enums.ts          # already exists — domain enums (no change needed)
  schemas/          # new — one file per domain entity
    customer.ts
    customer-asset.ts
    work-order.ts
    service.ts
    supplier.ts
    brand.ts
    branch.ts
    organization.ts
    inventory.ts
    purchase-order.ts
    warranty.ts
    invoice.ts
    activity-log.ts
    index.ts        # barrel
  dto/              # already exists — pagination, id-param
  index.ts          # re-exports everything
```

## Risks / Trade-offs

- **Enum drift between Prisma and shared** → The enums in `packages/shared` must be kept in sync with `packages/database/prisma/schema.prisma`. Mitigation: a single PR changes both; the `@glossops/database` package is not re-exported from shared to avoid a circular dependency.
- **Build order in turbo** → `packages/shared` must build before `apps/api` and `apps/web`. Mitigation: declare `@glossops/shared` as a workspace dependency — turbo resolves the build order automatically.
- **`apps/web` type breakage** → Replacing inline types with shared imports may cause type mismatches if fields differ. Mitigation: run `pnpm typecheck` in `apps/web` after each entity migration.

## Migration Plan

1. Add entity schemas to `packages/shared/src/schemas/` and update the barrel export.
2. Build `packages/shared` to verify no TS errors.
3. Add `"@glossops/shared": "workspace:*"` to `apps/web/package.json` and `apps/api/package.json`.
4. In `apps/web/src/lib/schemas/`, replace inline `z.enum([...])` with imports from `@glossops/shared` one file at a time. Run typecheck after each.
5. In `apps/api`, replace any locally duplicated enums with imports from `@glossops/shared`.
6. Run `pnpm -r build` and `pnpm test` to confirm nothing broke.

Rollback: revert the dependency additions and enum replacements — `packages/shared` itself is additive and safe to leave in place.

## Open Questions

- Should `packages/shared` export pagination response wrappers (e.g., `PageSchema<T>`) as generic Zod schemas? Not strictly needed now but would reduce further duplication in `apps/web` hooks.
