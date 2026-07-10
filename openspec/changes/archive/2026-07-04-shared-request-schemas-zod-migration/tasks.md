## 1. Foundation: deps, pipe, pilot module

- [x] 1.1 Bump `zod` to `^3.25.76` in `packages/shared/package.json` and `apps/api/package.json` (align with `apps/web`); run `pnpm install`
- [x] 1.2 Add `nestjs-zod` to `apps/api` dependencies; run `pnpm install`
- [x] 1.3 Create `packages/shared/src/request-schemas/` with an `index.ts` barrel; add `export * from './request-schemas'` to `packages/shared/src/index.ts` (barrel sorted longest → shortest)
- [x] 1.4 Add a `createPageQuerySchema`/pagination query helper in `request-schemas` using `z.coerce.number().int().min(1)` for `page`/`limit` (replaces `@Type(() => Number)`); build `@glossops/shared`
- [x] 1.5 Add `ZodValidationExceptionFilter` in `apps/api/src/common` mapping `ZodValidationException` to `{ statusCode, message, errors: [{ path, message }] }`; register it globally in `main.ts`
- [x] 1.6 Swap `main.ts`: replace `new ValidationPipe({ whitelist: true })` with `new ZodValidationPipe()`; wrap Swagger doc with `cleanupOpenApiDoc(document)` before `SwaggerModule.setup` (see APPLY_LOG.md: a transitional `HybridValidationPipe` routes Zod DTOs to `ZodValidationPipe` and not-yet-migrated class-validator DTOs to `ValidationPipe`, so groups 2-4 stay green during migration)
- [x] 1.7 Pilot module **customers**: publish `CreateCustomerSchema`, `UpdateCustomerSchema` (`.partial()`), `ListCustomersQuerySchema` in shared; add thin `createZodDto` wrappers in `apps/api/src/customers/dto/`; retype controller; delete class-validator decorators/imports and `@ApiProperty` from those DTOs
- [x] 1.8 Verify pilot: `pnpm --filter api test`, `pnpm --filter api test:e2e` (customers), and `/api-docs` renders customer request schemas

## 2. Migrate remaining API modules (schema → wrapper → controller → drop class-validator)

- [x] 2.1 auth (`LoginSchema`, `RegisterSchema`, `RefreshSchema`, invitation/member DTOs)
- [x] 2.2 organizations (create/update/invitation with explicit `branchId`)
- [x] 2.3 branches (create/update via `.partial()`)
- [x] 2.4 customer-assets (create/update, nested + flat)
- [x] 2.5 services (create/update; keep activate/deactivate)
- [x] 2.6 suppliers (create/update)
- [x] 2.7 brands (create/update)
- [x] 2.8 work-orders (create/update, status transition, list query)
- [x] 2.9 work-order-assignments (assign body with LEAD/ASSISTANT)
- [x] 2.10 asset-checkpoints (reception/delivery create/update)
- [x] 2.11 activity-logs (list query only — read-only module)
- [x] 2.12 inventory (list query, usage query; port any `@Transform` boolean coercion to `z.coerce.boolean()`/enum)
- [x] 2.13 purchase-orders (create/update, receive/cancel bodies)
- [x] 2.14 warranties (void body, list/find queries)
- [x] 2.15 invoices (create/update, status transition, list query)
- [x] 2.16 After each module: run `pnpm --filter api test` + relevant e2e suite; keep both green before moving on

## 3. Point apps/web at shared request schemas

- [x] 3.1 Replace imports in web forms/components to use request schemas from `@glossops/shared`; derive value types via `z.infer`
- [x] 3.2 Re-layer web-only concerns on shared bases (e.g. `RegisterSchema.refine(confirmPassword)`, empty-string handling for optional fields)
- [x] 3.3 Delete the 7 `apps/web/src/lib/schemas/*.schema.ts` files (and their `.test.ts`) once no longer imported — see APPLY_LOG "Group 3" deviation: files were CONVERTED to thin composition-over-shared layers (they also hold out-of-scope response interfaces) rather than deleted; no file redefines a shared request shape (spec scenario satisfied). invoice.schema.ts is a flagged genuine divergence.
- [x] 3.4 Update/relocate any web schema unit tests to target the shared schemas or the web composition layer
- [x] 3.5 Verify: web typecheck (`tsc --noEmit`, no `typecheck` script) and `pnpm --filter web test` green; form validation/defaults/errors unchanged

## 4. Cleanup and full verification

- [x] 4.1 Remove `class-validator` and `class-transformer` from `apps/api/package.json`; run `pnpm install`
- [x] 4.2 Grep confirm: zero `class-validator`/`class-transformer` imports under `apps/api/src`; zero `@ApiProperty` on request DTOs; zero remaining `*.schema.ts` request duplicates under `apps/web/src/lib/schemas/` (adjusted per Group 3 note: web check verifies no file _redefines_ a shared request shape — only the flagged `invoice.schema.ts` still declares a standalone `z.object`, left as a pending product decision)
- [x] 4.3 Confirm `/api-docs` documents every module's request schema (swap to bare `ZodValidationPipe` in `main.ts` + `test/helpers/test-app.ts`; `HybridValidationPipe` deleted)
- [x] 4.4 Run `pnpm --filter api lint` and `pnpm --filter web lint`
- [x] 4.5 Run `./init.sh` — all green (70 unit suites + 17 e2e suites pass, both typechecks pass)
