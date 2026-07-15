# Apply Log — Group 1 (tasks 1.1–1.8)

Foundation + customers pilot for the class-validator → Zod request-schema migration.

## What changed (by area)

### Dependencies

- `packages/shared/package.json`: `zod` `^3.24.2` → `^3.25.76`.
- `apps/api/package.json`: `zod` `^3.24.2` → `^3.25.76`; added `nestjs-zod` `^5.4.0`.
- `pnpm install` ran against the npmjs registry (`--registry=https://registry.npmjs.org/`)
  because the default CodeArtifact registry token in `~/.npmrc` is expired (401). See
  "Environment note" below. The resulting `pnpm-lock.yaml` contains no hard-coded registry
  URLs (verified) — nothing in the lockfile is pinned to a private registry.

### `packages/shared` (pure Zod, no NestJS)

- `src/request-schemas/pagination.ts` — `PageQuerySchema` (`page`/`limit` via
  `z.coerce.number().int().min(1)`, `limit` capped `.max(100)`, both `.optional()`) and
  `createPageQuerySchema(fields)` helper that `.extend()`s the pagination fields.
- `src/request-schemas/customer.ts` — `CreateCustomerSchema`, `UpdateCustomerSchema`
  (= `.partial()`), `ListCustomersQuerySchema` + inferred types.
- `src/request-schemas/index.ts` — barrel (sorted longest → shortest line).
- `src/index.ts` — added `export * from './request-schemas'`.

### `apps/api`

- `src/common/zod-validation-exception.filter.ts` — `ZodValidationExceptionFilter`
  (`@Catch(ZodValidationException)`) → `{ statusCode: 400, message: 'Validation failed',
errors: [{ path, message }] }`. Compatible with the web `api-client` which reads
  `body.error ?? body.message`.
- `src/common/hybrid-validation.pipe.ts` — `HybridValidationPipe` (see deviation D-A).
- `src/common/index.ts` — barrel for the two above.
- `src/main.ts` — global pipe now `new HybridValidationPipe()`; global filter
  `new ZodValidationExceptionFilter()`; Swagger doc wrapped with
  `cleanupOpenApiDoc(SwaggerModule.createDocument(...))`. `ValidationPipe` import removed.
- `src/customers/dto/{create,update,list}-*.dto.ts` — collapsed to one-line
  `createZodDto(...)` wrappers; all class-validator / class-transformer / `@ApiProperty`
  imports removed (grep-verified zero remaining in the customers dto folder).
- `src/customers/dto/customer-request-schemas.spec.ts` — new unit suite (9 tests)
  covering the request-schemas requirement scenarios (valid parse, reject invalid,
  unknown-key strip, `.partial()`, query coercion, enum rejection, max-length).
- `src/customers/customers.controller.ts` — unchanged (already imported the DTO names
  from `./dto`; the `@Body()/@Query()` signatures flow through the new wrappers).

### `apps/api/test`

- `test/helpers/test-app.ts` — e2e app now uses `HybridValidationPipe` +
  `ZodValidationExceptionFilter`, mirroring `main.ts`. This was required: the e2e helper
  previously hard-wired `ValidationPipe({ whitelist: true })`, so without this change the
  Zod-DTO customers endpoints could not be exercised.

## Customers schema shapes produced

```ts
CreateCustomerSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().max(254).optional(),
  phone: z.string().max(30).optional(),
  address: z.string().max(255).optional(),
  taxId: z.string().max(20).optional(),
  fiscalRegime: z.string().max(10).optional(),
  zipCode: z.string().max(10).optional(),
  source: z.string().max(100).optional(),
  note: z.string().max(500).optional(),
})
UpdateCustomerSchema = CreateCustomerSchema.partial()
ListCustomersQuerySchema = createPageQuerySchema({
  status: z.enum(['ACTIVE', 'INACTIVE', 'ALL']).optional(),
  search: z.string().optional(),
  sortBy: z.enum(['firstName', 'lastName', 'createdAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
})
```

Constraints match the former class-validator DTOs exactly (RESEARCH.md examples).
Note: the old `UpdateCustomerDto` typed optional fields as `string | null`; the design
(D2) mandates `.partial()` of the create schema, which yields `string | undefined`. No
test sends `null`, and the service treats absent fields as "no change", so this follows
the design as written. If groups 2-4 need explicit `null` clearing, layer `.nullable()`
per field — flag for review.

## Verification (all pass)

| Command                                          | Result                                                                                                                                                                  |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter @glossops/shared build`           | PASS                                                                                                                                                                    |
| `pnpm --filter api build`                        | PASS                                                                                                                                                                    |
| `pnpm --filter api lint`                         | PASS (0 issues)                                                                                                                                                         |
| `pnpm --filter api test`                         | PASS — 55 suites, 588 tests (was 54/579; +1 suite, +9 tests)                                                                                                            |
| `pnpm --filter api test:e2e` (full)              | PASS — 17 suites, 97 tests                                                                                                                                              |
| Swagger check (programmatic `cleanupOpenApiDoc`) | PASS — `CreateCustomerDto` schema present with 10 props, `required: [firstName, lastName]`; `GET /customers` documents `page, limit, status, search, sortBy, sortOrder` |
| `./init.sh`                                      | EXIT 0                                                                                                                                                                  |

## Deviations from the spec

**D-A — `HybridValidationPipe` instead of a bare `ZodValidationPipe` (task 1.6).**
Task 1.6/D4 say "replace `ValidationPipe` with `ZodValidationPipe`". A _single global_
`ZodValidationPipe` breaks the 15 not-yet-migrated modules: nestjs-zod's pipe returns the
value untouched for any metatype that is not a `createZodDto` class (verified in its
source), so those modules lose both class-validator validation AND the class-transformer
`@Type(() => Number)` pagination coercion. This made 3 e2e suites fail after a naive swap
(auth register 400, activity-logs `?page=1&limit=20`, brands `?limit=500`). The design's
"the pipe can coexist" claim (Migration Plan) is not true for a lone global Zod pipe.

Resolution: a tiny transitional `HybridValidationPipe` (in `src/common`) routes by
metatype — `isZodDto(metatype)` → `ZodValidationPipe`; otherwise →
`ValidationPipe({ whitelist: true, transform: true })`. This delivers the intended global
Zod validation for migrated DTOs while keeping every un-migrated module green, exactly the
"coexist" behavior the design assumed. Combining both pipes via `useGlobalPipes(a, b)` does
NOT work (class-validator `whitelist` strips the Zod-DTO plain object to `{}`), which is why
a routing pipe is necessary.

**Group 4 must remove `HybridValidationPipe`** and replace it with a bare
`ZodValidationPipe` once all 16 modules are migrated (then class-validator /
class-transformer can be dropped per tasks 4.1–4.2). This is now noted inline in task 1.6.

## For the next phase (groups 2–4)

- **Established pattern to copy (per module):**
  1. `packages/shared/src/request-schemas/<module>.ts`: pure Zod
     `Create<E>Schema` / `Update<E>Schema = .partial()` / `List<E>QuerySchema`
     (use `createPageQuerySchema({...})` for list queries). Body schemas transform-free;
     query schemas coerce.
  2. Add barrel exports to `request-schemas/index.ts` (longest→shortest) — remember to add
     type exports too.
  3. `pnpm --filter @glossops/shared build` (api resolves the compiled `dist`, so shared
     MUST be rebuilt before api tests see new schemas).
  4. `apps/api/src/<module>/dto/*.dto.ts`: collapse each to
     `export class XDto extends createZodDto(XSchema) {}`; delete all class-validator /
     class-transformer / `@ApiProperty` imports. Keep the dto `index.ts` barrel names.
  5. Controller usually needs no change (it imports DTO names from `./dto`).
  6. Run `pnpm --filter api test` + the module's e2e suite.
- **Coercion:** every list DTO that used `@Type(() => Number)` maps to the shared
  `createPageQuerySchema`. `@Transform` boolean coercion (inventory, task 2.12) →
  `z.coerce.boolean()` or an enum — verify against the e2e payloads.
- **Auth (2.1):** `apps/web` layers `confirmPassword` on `RegisterSchema` (group 3). Keep
  the shared `RegisterSchema` refinement-free; the min-length rules in the current
  register DTO must be reproduced so the auth e2e `400 for invalid body` test passes once
  the register DTO becomes a Zod DTO (it currently only passes because `HybridValidationPipe`
  still routes it to class-validator).
- **`nestjs-zod` v5 exports used:** `createZodDto`, `ZodValidationPipe`,
  `ZodValidationException`, `cleanupOpenApiDoc` (from `nestjs-zod`); `isZodDto` (from
  `nestjs-zod/dto`).
- **Environment note:** `pnpm install` must be run with
  `--registry=https://registry.npmjs.org/` in this environment (the default CodeArtifact
  token is expired). No package.json/lockfile registry pinning was introduced.

---

# Apply Log — Group 2, Batch A (tasks 2.1–2.7)

Migrated 7 modules to shared Zod request-schemas following the Group 1 pattern.
`main.ts`, `HybridValidationPipe`, and the exception filter were NOT touched (group 4 owns the final swap). class-validator/class-transformer deps were NOT removed (group 4).

## Files added (shared, pure Zod)

- `packages/shared/src/request-schemas/auth.ts` — `LoginSchema`, `RegisterSchema` (refinement-free; `password` min 8 / max 72, `name`/`orgName` min 2 / max 100), `RefreshSchema`, `AcceptInvitationSchema` + inferred types.
- `packages/shared/src/request-schemas/organization.ts` — `InvitationRoleSchema` (literal enum mirroring Prisma `Role`), `UpdateOrganizationSchema`, `CreateInvitationSchema` (`branchId` = required `z.string().uuid()`) + types.
- `packages/shared/src/request-schemas/branch.ts` — `CreateBranchSchema`, `UpdateBranchSchema` (`.partial()`), `ListBranchesQuerySchema` (status/search filters) + types.
- `packages/shared/src/request-schemas/customer-asset.ts` — `AssetTypeSchema` (literal enum mirroring Prisma `AssetType`), `CreateCustomerAssetSchema`, `UpdateCustomerAssetSchema` (`.partial()`), `ListCustomerAssetsQuerySchema` + types.
- `packages/shared/src/request-schemas/service.ts` — `CreateServiceSchema`, `UpdateServiceSchema` (`.partial()`), `ListServicesQuerySchema` (includeInactive coercion) + types.
- `packages/shared/src/request-schemas/supplier.ts` — `CreateSupplierSchema`, `UpdateSupplierSchema` (`.partial()`), `ListSuppliersQuerySchema` + types.
- `packages/shared/src/request-schemas/brand.ts` — `CreateBrandSchema`, `UpdateBrandSchema` (`.partial()`), `ListBrandsQuerySchema` (limit capped 500) + types.
- `packages/shared/src/request-schemas/index.ts` — extended (sorted longest→shortest).

## Files changed (api DTO wrappers → one-line `createZodDto`)

All class-validator / class-transformer / `@ApiProperty(Optional)` imports and decorators removed; dto `index.ts` barrels unchanged; controllers unchanged.

- auth: `login.dto.ts`, `register.dto.ts` (no separate `refresh` DTO — the controller reads `@Body('refreshToken')` inline; `RefreshSchema` is published for reuse/web but no wrapper was created since there is no DTO to migrate).
- organizations: `accept-invitation.dto.ts`, `create-invitation.dto.ts`, `update-org.dto.ts`.
- branches: `create-branch.dto.ts`, `update-branch.dto.ts`, `list-branches.dto.ts`.
- customer-assets: `create-customer-asset.dto.ts`, `update-customer-asset.dto.ts`, `list-customer-assets.dto.ts`.
- services: `create-service.dto.ts`, `update-service.dto.ts`, `list-services.dto.ts`.
- suppliers: `create-supplier.dto.ts`, `update-supplier.dto.ts`, `list-suppliers.dto.ts`.
- brands: `create-brand.dto.ts`, `update-brand.dto.ts`, `list-brands.dto.ts`.

## Unit specs added (mirroring `customer-request-schemas.spec.ts`)

`auth/dto/auth-request-schemas.spec.ts`, `organizations/dto/organization-request-schemas.spec.ts`, `branches/dto/branch-request-schemas.spec.ts`, `customer-assets/dto/customer-asset-request-schemas.spec.ts`, `services/dto/service-request-schemas.spec.ts`, `suppliers/dto/supplier-request-schemas.spec.ts`, `brands/dto/brand-request-schemas.spec.ts`.

## Non-obvious schema decisions

- **Prisma enums kept as Zod literal enums** (`InvitationRoleSchema` for `Role`, `AssetTypeSchema` for `AssetType`) so shared stays free of a `@glossops/database` runtime import. The literal union is structurally assignable to the Prisma `Role`/`AssetType` type (both are `(typeof X)[keyof typeof X]` string unions), so `organizations.service.createInvitation(role: Role, ...)` and the customer-assets service still typecheck — the api build confirmed this.
- **Nullable update fields → `.partial()` (`string | undefined`), following Group 1 D2.** `UpdateServiceDto`, `UpdateSupplierDto`, `UpdateBranchDto`, `UpdateBrandDto`, `UpdateCustomerAssetDto` previously typed optional fields as `string | null`. `.partial()` yields `string | undefined`. No e2e test sends `null` for these and the services treat absent = no-op. Same known limitation flagged in Group 1: if explicit `null` clearing is ever required, layer `.nullable()` per field.
- **Exception — `UpdateOrganizationSchema.logoUrl` IS `z.string().nullable().optional()`.** This standalone (non-`.partial()`) update DTO genuinely typed `logoUrl?: string | null` to allow clearing the org logo, so nullable was preserved to keep that capability. Flag for group 3/web review.
- **Brands list `limit` capped at 500** (not the shared default 100) via `createPageQuerySchema({ limit: z.coerce.number().int().min(1).max(500).optional(), ... })` overriding the base field — reproduces `ListBrandsDto @Max(500)` and keeps the `GET /brands?limit=500` e2e green.
- **Services list `includeInactive`** reproduces the former `@Transform(({ value }) => value === 'true' || value === true)` via `z.union([z.string(), z.boolean()]).transform(v => v === 'true' || v === true).optional()`. The outer `.optional()` short-circuits when the param is absent (→ `undefined`), matching the old `@IsOptional()` behavior; present `'false'` → `false`, `'true'`/`true` → `true`.
- **`service.basePrice`**: the old `@IsNumber({ maxDecimalPlaces: 2 })` decimal-places hint was NOT ported (Zod `.multipleOf(0.01)` risks float precision). Kept `z.number().min(0)`; the `Decimal(10,2)` column enforces precision at persistence. No test relies on >2-decimal rejection.
- **`service` SAT claves** `@Matches(/^[A-Za-z0-9]+$/)` → `z.string().regex(...)`; **brand slug** `@Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)` → `z.string().regex(...)`; **brand logoUrl** `@IsUrl()` → `z.string().url()`.
- **`customer-asset.metadata`** (`@IsObject() Record<string, unknown>`) → `z.record(z.unknown()).optional()` — the "nested" body shape; the rest of the asset body is flat.
- **`customer-asset.country`** `@Length(2,2)` → `z.string().length(2)`; **`year`** `@IsInt() @Min(1900) @Max(2100)` → `z.number().int().min(1900).max(2100)`.
- **customer-assets list `status`** was `@IsString()` (not an enum) in the old DTO → kept `z.string().optional()` (the service normalizes it).

## Verification (all pass)

| Command                                | Result                                                                                                                                      |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter @glossops/shared build` | PASS                                                                                                                                        |
| `pnpm --filter api build`              | PASS                                                                                                                                        |
| `pnpm --filter api test`               | PASS — 62 suites, 638 tests (was 55/588; +7 suites, +50 tests)                                                                              |
| `pnpm --filter api test:e2e`           | PASS — 17 suites, 97 tests (unchanged; all module suites incl. auth/organizations/branches/customer-assets/services/suppliers/brands green) |
| `pnpm --filter api lint`               | PASS (0 issues)                                                                                                                             |

## For the next batch (2.8–2.16)

- Pattern held with zero controller changes for all 7 modules. Follow it verbatim.
- **Non-standard list caps / coercions to watch:** brands used `@Max(500)` (override `limit` in `createPageQuerySchema`); services used a `@Transform` boolean. Inventory (2.12) has the remaining `@Transform` boolean coercion — port the same `z.union([string, boolean]).transform(...).optional()` trick (or an enum) and keep "absent → undefined". Verify against real e2e query payloads.
- **Prisma-enum body/query fields:** define a local Zod literal enum in the module's shared file (do NOT import `@glossops/database` into `packages/shared`). Reuse existing shared enums where they overlap (e.g. `AssetTypeSchema`, `InvitationRoleSchema`) via cross-file import inside `request-schemas/`.
- **Nullable update fields:** default to `.partial()` (`| undefined`) per D2 unless a standalone update DTO genuinely relied on `| null` clearing (then use `.nullable().optional()` like org logoUrl) — flag any such case for web.
- Rebuild `@glossops/shared` before running api tests (api resolves compiled `dist`).

---

# Apply Log — Group 2, Batch B (tasks 2.8–2.16)

Migrated the final 8 modules (work-orders, work-order-assignments, asset-checkpoints, activity-logs, inventory, purchase-orders, warranties, invoices) to shared Zod request-schemas following the established per-module pattern. `main.ts`, `HybridValidationPipe`, and the exception filter were NOT touched (group 4). class-validator/class-transformer deps were NOT removed (group 4). Zero controller changes.

## Files added (shared, pure Zod)

- `packages/shared/src/request-schemas/work-order.ts` — `WorkOrderStatusSchema`, `WorkOrderTypeSchema`, `CreateWorkOrderItemInlineSchema` (nested inline item), `CreateWorkOrderSchema` (with nested `items` array), `UpdateWorkOrderSchema` (nullable `scheduledAt`/`note`), `TransitionWorkOrderStatusSchema`, `CreateWorkOrderItemSchema` (standalone item), `UpdateWorkOrderItemSchema` (nullable `description`), `ListWorkOrdersQuerySchema` + types.
- `packages/shared/src/request-schemas/work-order-assignment.ts` — `AssignmentRoleSchema` (LEAD/ASSISTANT), `CreateWorkOrderAssignmentSchema` + type.
- `packages/shared/src/request-schemas/asset-checkpoint.ts` — `CheckpointTypeSchema`, `FuelLevelSchema`, `AssetConditionSchema`, `CreateAssetCheckpointSchema` (required `type`+`generalCondition`, `photo` URL array), `UpdateAssetCheckpointSchema` (nullable `mileage`/`fuelLevel`/`note`/`customerSignatureUrl`) + types.
- `packages/shared/src/request-schemas/activity-log.ts` — `ActivityActionSchema`, `ListActivityLogsQuerySchema` (uncapped `limit`) + type.
- `packages/shared/src/request-schemas/inventory.ts` — `InventoryTypeSchema`, `CreateInventoryItemSchema`, `UpdateInventoryItemSchema` (nullable clearing), `CreateMaterialRollSchema`, `UpdateMaterialRollSchema` (nullable clearing), `UpdateInventoryUsageSchema`, `ListInventoryQuerySchema` (`lowStock` boolean coercion) + types.
- `packages/shared/src/request-schemas/purchase-order.ts` — `PurchaseOrderStatusSchema`, `CreatePurchaseOrderItemSchema` (nested), `CreatePurchaseOrderSchema` (required `items` array), `UpdatePurchaseOrderSchema` (nullable `expectedAt`/`note`), `ReceivePurchaseOrderItemSchema` (nested), `ReceivePurchaseOrderSchema`, `ListPurchaseOrdersQuerySchema` + types.
- `packages/shared/src/request-schemas/warranty.ts` — `VoidWarrantySchema` + type (no list/find query DTO exists — see decisions).
- `packages/shared/src/request-schemas/invoice.ts` — `InvoiceStatusSchema`, `CfdiPaymentMethodSchema`, `CreateInvoiceSchema`, `UpdateInvoiceSchema` (`.omit({workOrderId}).partial()`), `TransitionInvoiceSchema`, `ListInvoicesQuerySchema` + types.
- `packages/shared/src/request-schemas/index.ts` — regenerated, fully sorted longest→shortest (119 lines).

## Files changed (api DTO wrappers → one-line `createZodDto`)

All class-validator / class-transformer / `@ApiProperty(Optional)` / `@nestjs/swagger` imports and decorators removed; dto `index.ts` barrels unchanged; controllers unchanged.

- work-orders: `create-work-order.dto.ts`, `update-work-order.dto.ts`, `create-work-order-item.dto.ts`, `update-work-order-item.dto.ts`, `transition-status.dto.ts`, `list-work-orders.dto.ts`.
- work-order-assignments: `create-work-order-assignment.dto.ts`.
- asset-checkpoints: `create-asset-checkpoint.dto.ts`, `update-asset-checkpoint.dto.ts`.
- activity-logs: `list-activity-logs.dto.ts`.
- inventory: `create-inventory-item.dto.ts`, `update-inventory-item.dto.ts`, `create-material-roll.dto.ts`, `update-material-roll.dto.ts`, `update-inventory-usage.dto.ts`, `list-inventory.dto.ts`.
- purchase-orders: `create-purchase-order.dto.ts` (keeps `CreatePurchaseOrderItemDto` class), `update-purchase-order.dto.ts`, `receive-purchase-order.dto.ts` (keeps `ReceiveItemDto` class), `list-purchase-orders.dto.ts`.
- warranties: `void-warranty.dto.ts`.
- invoices: `create-invoice.dto.ts`, `update-invoice.dto.ts`, `transition-invoice.dto.ts`, `list-invoices.dto.ts`.

## Unit specs added (mirroring `customer-request-schemas.spec.ts`)

`work-orders/dto/work-order-request-schemas.spec.ts`, `work-order-assignments/dto/work-order-assignment-request-schemas.spec.ts`, `asset-checkpoints/dto/asset-checkpoint-request-schemas.spec.ts`, `activity-logs/dto/activity-log-request-schemas.spec.ts`, `inventory/dto/inventory-request-schemas.spec.ts`, `purchase-orders/dto/purchase-order-request-schemas.spec.ts`, `warranties/dto/warranty-request-schemas.spec.ts`, `invoices/dto/invoice-request-schemas.spec.ts`.

## Non-obvious schema decisions

- **Nested item arrays (work-orders, purchase-orders).** `CreateWorkOrderSchema.items` is an OPTIONAL `z.array(CreateWorkOrderItemInlineSchema)`; `CreatePurchaseOrderSchema.items` and `ReceivePurchaseOrderSchema.items` are REQUIRED arrays (matching the old `@IsArray` without `@IsOptional`). Two distinct work-order item shapes exist: the **inline** item embedded in create (`serviceId`/`quantity`/`unitPrice`/`note`) vs the **standalone** item sub-resource DTO (`serviceId`/`description`/`quantity`/`unitPrice`/`discount`/`isBillable`). Both are published. The PO `CreatePurchaseOrderItemDto` and `ReceiveItemDto` class names are preserved (they are re-exported from the dto barrel) by wrapping the nested schemas with `createZodDto`.
- **Nullable update clearing (GENUINE — preserved as `.nullable().optional()`, NOT `.partial()`).** These standalone update DTOs pass the DTO straight to Prisma `.update()`, where `null` clears a nullable column and `undefined` is a no-op; the former DTOs typed these `... | null`:
  - `UpdateWorkOrderSchema`: `scheduledAt`, `note` (service explicitly branches on `dto.scheduledAt === null`).
  - `UpdateWorkOrderItemSchema`: `description`.
  - `UpdateAssetCheckpointSchema`: `mileage`, `fuelLevel`, `note`, `customerSignatureUrl` (`generalCondition` is optional but non-null).
  - `UpdateInventoryItemSchema`: `supplierId`, `brandId`, `sku`, `description`, `lowStockAlert`.
  - `UpdateMaterialRollSchema`: `supplierId`, `brandId`, `lotNumber`.
  - `UpdatePurchaseOrderSchema`: `expectedAt`, `note` (`supplierId` optional non-null).
    These schemas are hand-written objects (not `.partial()`) because `.partial()` can only add `undefined`, not `null`. **FLAG for group 3 (web):** these fields accept `null` to clear — web update forms should send `null` (not empty string) to clear, and the derived `z.infer` type is `T | null | undefined`.
- **`UpdateInvoiceSchema` = `CreateInvoiceSchema.omit({ workOrderId: true }).partial()`** — the old update DTO was the create shape minus `workOrderId`, all-optional, no `null` clearing. This is the one Batch-B update schema that IS derived (per D2/naming convention) rather than hand-written.
- **Status-transition bodies** are tiny single-field objects: `TransitionWorkOrderStatusSchema { status }` and `TransitionInvoiceSchema { status }`. Zod literal enums (`WorkOrderStatusSchema`, `InvoiceStatusSchema`) are structurally assignable to the Prisma `WorkOrderStatus`/`InvoiceStatus` types, so `service.transition(id, org, dto.status, ...)` still typechecks (api build confirmed).
- **`lowStock` boolean coercion (inventory list).** Reproduces the former `@Transform(({ value }) => value === 'true' || value === true)` via `z.union([z.string(), z.boolean()]).transform(...).optional()` — absent → `undefined`, `'false'` → `false`, `'true'`/`true` → `true` (same trick as services `includeInactive`).
- **activity-logs `limit` uncapped.** The old `ListActivityLogsDto.limit` had no `@Max`, so `limit` is overridden to `z.coerce.number().int().min(1).optional()` (no `.max(100)`), preserving the old behavior.
- **warranties has NO list/find query DTO.** The controller exposes only `findOne` (route `@Param('id')`, no DTO) and `void` (`VoidWarrantyDto` body). Task 2.14 wording ("list/find queries") does not correspond to any existing query DTO — only `VoidWarrantySchema` was published/migrated. No deviation from real code.
- **`@IsDateString` → `z.string().datetime()`** for `scheduledAt` (work-orders) and `expectedAt` (purchase-orders). No unit/e2e test sends date-only strings; the DTO examples were full RFC-3339 datetimes. Minor tightening (date-only strings that class-validator's ISO-8601 accepted would now be rejected) — flag only if web sends date-only.
- **Decimal `maxDecimalPlaces` hints not ported** (inventory `unitCost`/`stock`/`lowStockAlert`, work-order item `unitPrice`/`discount`, PO `quantity`/`unitCost`) — kept `z.number().min(...)`; `Decimal` columns enforce precision at persistence (same rationale as Batch A `service.basePrice`).

## Verification (all pass)

| Command                                | Result                                                                                                                                                          |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter @glossops/shared build` | PASS                                                                                                                                                            |
| `pnpm --filter api build`              | PASS                                                                                                                                                            |
| `pnpm --filter api test`               | PASS — 70 suites, 688 tests (was 62/638; +8 suites, +50 tests)                                                                                                  |
| `pnpm --filter api test:e2e`           | PASS — 17 suites, 97 tests (unchanged; all module suites green incl. work-orders/inventory/purchase-orders/invoices/asset-checkpoints/activity-logs/warranties) |
| `pnpm --filter api lint`               | PASS (0 issues)                                                                                                                                                 |

## ALL 16 MODULES NOW MIGRATED — is a bare `ZodValidationPipe` safe? YES.

`grep` confirms ZERO `class-validator` / `class-transformer` imports remain anywhere under `apps/api/src`, and ZERO `@ApiProperty` / `@nestjs/swagger` in any `dto/*.dto.ts`. Every request DTO across all 16 modules is now a `createZodDto` class, so `HybridValidationPipe` always hits the `isZodDto(metatype)` branch → `ZodValidationPipe`. The `ValidationPipe({ whitelist, transform })` fallback branch is now dead code. Non-DTO metatypes (primitive `@Param`/`@Query` strings) are passed through untouched by both pipes. **Group 4's swap to a bare global `ZodValidationPipe` is safe**, after which `HybridValidationPipe` + `class-validator` + `class-transformer` can be removed.

## Notes for group 3 (web)

- Body schemas are transform-free and reusable via `z.infer`: work-order, work-order-assignment, asset-checkpoint, inventory (item/roll/usage), purchase-order, warranty, invoice creates.
- **Nullable-clearing update fields** (listed above) type as `T | null | undefined`. Web update forms must send `null` (not `''`) to clear these; layer empty-string → `null`/`undefined` handling in the web composition layer as needed.
- Query schemas (list\*) are API-only (coercion); web should not reuse them for forms.
- New shared enums available for web dropdowns: `WorkOrderStatusSchema`, `WorkOrderTypeSchema`, `AssignmentRoleSchema`, `CheckpointTypeSchema`, `FuelLevelSchema`, `AssetConditionSchema`, `ActivityActionSchema`, `InventoryTypeSchema`, `PurchaseOrderStatusSchema`, `InvoiceStatusSchema`, `CfdiPaymentMethodSchema`.

## Notes for group 4 (cleanup)

- Swap `HybridValidationPipe` → bare `ZodValidationPipe` in `main.ts` and `test/helpers/test-app.ts` (SAFE, see above), then delete `src/common/hybrid-validation.pipe.ts` and its barrel entry.
- Remove `class-validator` + `class-transformer` from `apps/api/package.json` (`pnpm install --registry=https://registry.npmjs.org/`).
- Keep the `ZodValidationExceptionFilter` (still needed for the 400 error shape).
- Response `*ResponseDto` classes with `@ApiProperty` were intentionally left untouched (out of scope) — do not remove `@nestjs/swagger` from those.

---

# Apply Log — Group 3, Web (tasks 3.1–3.5)

Pointed `apps/web` at the shared request schemas. `apps/api`, `packages/shared/src/request-schemas`, `main.ts`, and the pipes were NOT touched.

## Key structural finding (drove the whole approach)

The 7 `apps/web/src/lib/schemas/*.schema.ts` files are NOT pure request-shape files — they each also hold out-of-scope **response/domain interfaces** (`CustomerWithCount`, `CustomerPage`, `CustomerListParams`, `CustomerAsset`, `Service`, `ServicePage`, `Invoice`, `Warranty`, `WorkOrder`, `WorkOrderDetail`, `WorkOrderItem`, `WorkOrderAssignment`, `WorkOrderCheckpoint`, etc.) plus enum re-exports (`AssetType`, `ASSET_TYPES`, `InvoiceStatus`, `WorkOrderStatus`, `WorkOrderType`), all imported widely by pages/hooks. Migrating those response types is a separate, larger effort (feat-33 territory) and is out of this change's scope.

Therefore, instead of literally deleting the 7 files (task 3.3), each file was **converted into a thin composition-over-shared layer**: the request-shape Zod schema now composes the shared schema (`.extend`/`.omit`/`.partial`), and the response interfaces stay. The spec's binding requirement — "no `*.schema.ts` that redefines a request shape already published in `@glossops/shared`" — is satisfied (verified: only `invoice.schema.ts` still declares a standalone `z.object`, and that shape is a genuine, flagged divergence, not a duplicate). The spec also explicitly blesses this: "Web-only concerns MAY be layered on top of the shared base schema via composition (`.refine`, `.extend`) in `apps/web`."

## Files repointed (composition over shared)

- `auth.schema.ts` — `loginSchema = LoginSchema.extend({ email.email(msg), password.min(8, msg) })`; `registerSchema = RegisterSchema.extend({ email.email, name.min(2), orgName.min(2), password.min(8), confirmPassword }).refine(password === confirmPassword)`. Spanish messages preserved. Consumers: `login-form.tsx`, `register-form.tsx`, `use-auth.ts` (unchanged — same exported names/types).
- `customer.schema.ts` — `createCustomerSchema = CreateCustomerSchema.extend({...})`; `updateCustomerSchema = createCustomerSchema.partial()`. Consumers: `customer-drawer.tsx`, `use-customers.ts`, `customers/page.tsx` (response types kept in-file).
- `customer-asset.schema.ts` — `createVehicleSchema = CreateCustomerAssetSchema.omit({ metadata }).extend({...})` (the web form does not collect `metadata`); `updateVehicleSchema = .partial()`. `AssetType`/`ASSET_TYPES` re-exports kept. Consumers: `vehicle-drawer.tsx`, `use-customer-assets.ts`, customer pages.
- `service.schema.ts` — `createServiceSchema = CreateServiceSchema.omit({ basePrice, warrantyDays, warrantyDescription, warrantyTerm, claveProdServ, claveUnidad }).extend({...})`; `updateServiceSchema = .partial()`. Consumers: `service-drawer.tsx`, `use-services.ts`, `services/page.tsx`.
- `work-order.schema.ts` — `createWorkOrderItemSchema = CreateWorkOrderItemInlineSchema.extend({...})`; `createWorkOrderSchema = CreateWorkOrderSchema.extend({ customerId(form-only), assetId, type(required), scheduledAt, note, items(required .min(1)) })`; `updateWorkOrderSchema = UpdateWorkOrderSchema.extend({ scheduledAt, note })`. Consumers: `work-orders/new/page.tsx`, `work-order-edit-drawer.tsx`, `use-work-orders.ts`, WO pages.
- `warranty.schema.ts` — UNCHANGED (pure response `Warranty` interface, no request schema → out of scope).
- `invoice.schema.ts` — UNCHANGED web-local request schema (**genuine divergence, flagged below**).

## How each web-only concern was layered (task 3.2)

- **confirmPassword** — composed in web via `RegisterSchema.extend({ confirmPassword }).refine(...)`. Shared `RegisterSchema` stays refinement-free. `use-auth.ts` still submits `Omit<RegisterFormValues, 'confirmPassword'>`, which matches `RegisterInput`.
- **Empty-string handling** — every optional string input keeps `.or(z.literal(''))` in the web layer so RHF `''` defaults validate; submit handlers already map `''` → `undefined` before the API call (customer-drawer, vehicle-drawer, WO new/edit). No shared change.
- **Email UX** — shared customer email is `z.string().max(254).optional()` (no `.email()`). Web re-added `.email('Correo inválido')` in `customer.schema.ts` and `.email('Ingresa un correo válido')` in `auth.schema.ts`, preserving the format error the forms show.
- **Numeric coercion** — shared body schemas are transform-free (D3), but the web `type=number` inputs return strings. Web re-adds `z.coerce.number()` on `service.basePrice`/`warrantyDays` and on `work-order item quantity`/`unitPrice` (invoice keeps its own coerced fields). This is a form-layer transform, not pushed into shared.
- **Optional-field max lengths** — where web previously used tighter client caps than the API (customer `phone` 20 vs 30, `address` 200 vs 255, `fiscalRegime` 100 vs 10, `source` 50 vs 100), the composed schema now inherits the **shared** caps (source of truth). This only loosens client validation for values the API already accepts; no previously-valid input becomes invalid. Note: shared `fiscalRegime` is `max(10)` — TIGHTER than the old web `max(100)`; a >10-char fiscal regime now fails client-side (matches the API). Flagged as intentional alignment.

## Critical compatibility checks (from the API migration)

- **Date fields (scheduledAt).** CONFIRMED BREAK + FIXED. The migrated API now types `scheduledAt` as `z.string().datetime()` (full ISO; date-only rejected). Both web work-order forms used `<Input type='date'>` → `YYYY-MM-DD`. Fixed both submit handlers to widen the date-only value to a full ISO string: `new Date(\`${scheduledAt}T00:00:00.000Z\`).toISOString()`in`work-orders/new/page.tsx`and`work-order-edit-drawer.tsx`. (`warranty`has no scheduledAt/expectedAt web form;`expectedAt` belongs to purchase-orders which has no web form.)
- **Nullable-clearing update fields.** The only web edit form touching a shared nullable-clearing field is the WO edit drawer (`scheduledAt`, `note`). Current behavior sends `undefined` (omit) when blank — it does NOT send `null`. This is UNCHANGED and remains correct: `undefined` = no-op is the existing UX (the drawer never offered an explicit "clear" action). No regression introduced. If a future "clear scheduled date" affordance is added, it must send `null` (not `''`/`undefined`) per the shared `UpdateWorkOrderSchema`. Other nullable-clearing modules (work-order-item, asset-checkpoint, inventory-item, material-roll, purchase-order) have NO web update form, so nothing to change.

## Test files (task 3.4)

All 7 companion `*.schema.test.ts` files were RELOCATED-in-place (kept, rewritten to target the web composition layer), NONE deleted — because each now exercises a real web-only concern (Spanish messages, `.email()`, `confirmPassword`, required `items`, coercion, empty-string acceptance) rather than a duplicated shared copy.

- Rewrote `auth`, `customer`, `customer-asset`, `service`, `work-order` `.schema.test.ts` to assert `schema.safeParse(...).success === false` instead of `expect(...).toThrow(ZodError)`. **Reason:** the composed schemas are built with the zod instance bundled inside `@glossops/shared`; under Vitest/Vite this is a _different module realm_ than the test's own `import { ZodError } from 'zod'`, so `err instanceof ZodError` is `false` even though `err.constructor.name === 'ZodError'` and the correct error/message is produced. `safeParse().success` is realm-agnostic and asserts the same behavior. (Node's `require.resolve` dedupes both to the same `.pnpm/zod@3.25.76` path — the split is purely a Vite bundling artifact, not a runtime bug.)
- `invoice.schema.test.ts` — unchanged (web-local schema, same-realm zod, `instanceof` still valid).
- `warranty.schema.test.ts` — unchanged (type-only test).
- Added 2 new assertions: customer "accepts empty strings for optional fields" and service "coerces string basePrice".

## Verification

| Command                                   | Result                                                                                                                                                                                                                                                                               |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `apps/web` typecheck (`npx tsc --noEmit`) | PASS for all schema/form files. Only 3 PRE-EXISTING errors remain in `src/lib/api-client.test.ts` (`'error' is of type 'unknown'`), confirmed present on clean `master` (git stash check) and untouched by this change.                                                              |
| `pnpm --filter web test`                  | PASS — 20 files, 81 tests (was 20/79; +2 new assertions).                                                                                                                                                                                                                            |
| `pnpm --filter web lint`                  | PASS (0 issues).                                                                                                                                                                                                                                                                     |
| `pnpm --filter web build`                 | FAILS on `/work-orders/new` — `useSearchParams() should be wrapped in a suspense boundary`. **PRE-EXISTING** (confirmed on clean `master` via git stash); unrelated to this change (I only edited the file's `onSubmit`, not the `useSearchParams` usage). Out of scope for group 3. |
| `./init.sh`                               | EXIT 0 (init runs API unit tests 70/688 + web unit tests via its suite; does not run `next build`).                                                                                                                                                                                  |

## Deviations / flags

- **D-3A — files converted, not deleted (task 3.3).** See "Key structural finding". Deleting the 7 files would break the many out-of-scope response-interface imports. The spec's actual requirement (no duplicated request shapes) is met by composition. Group 4's grep check in task 4.2 ("zero remaining `*.schema.ts` request duplicates under `apps/web/src/lib/schemas/`") should read "no file that _redefines_ a shared request shape" — all remaining `.schema.ts` files either compose shared or hold only response types / the flagged invoice divergence.
- **FLAG — invoice create is a genuine web/API contract divergence (left as-is).** The web `createInvoiceSchema` is `{ workOrderId, subtotal, tax, total }` (manual totals form). The shared/API `CreateInvoiceSchema` is `{ workOrderId, customerTaxId, customerName, customerAddress, customerZipCode, customerFiscalRegime, cfdiUse, paymentMethod, paymentForm }` (CFDI fields) — and the API **service computes** subtotal/tax/total from the work order's `totalAmount`, ignoring any client-sent totals. So the web form's subtotal/tax/total inputs are effectively dead (silently stripped by the API's Zod). Reusing `CreateInvoiceSchema` would require replacing the entire invoice form UX (remove totals inputs, add CFDI inputs). Per the task's "STOP and report rather than silently diverge" rule, I did NOT force reuse. `invoice.schema.ts` stays a web-local form schema (different fields → not a duplicate of the shared shape). **Decision needed (group 4 / product):** either (a) rework the web invoice form to the CFDI shape and consume `CreateInvoiceSchema`, or (b) formally accept the web invoice form as a UI-only shape that the API recomputes. Not resolved here.
- **FLAG — work-order create `customerId` is a form-only field.** Shared `CreateWorkOrderSchema` has no `customerId` (the API derives customer from the asset). The web form collects `customerId` to filter the asset picker and sends it in the body, where the API's Zod strips it. Kept as a composed form-only field. Behavior unchanged; no action needed unless the API later rejects unknown keys (it strips them today).

## Notes for group 4 (final cleanup)

- Do NOT expect `apps/web/src/lib/schemas/` to be empty. It intentionally retains 7 files that now (a) compose shared request schemas and (b) hold out-of-scope response interfaces. Adjust the task 4.2 grep to check for _redefined request shapes_, not file presence.
- The pre-existing `/work-orders/new` `next build` suspense-boundary failure and the 3 pre-existing `api-client.test.ts` tsc errors are NOT introduced by this change — do not attribute them to the migration.
- Unresolved product decision: the web invoice-create form shape vs the CFDI-field `CreateInvoiceSchema` (see flag above).
- No `pnpm install` was needed — `@glossops/shared` dist already exports every request schema consumed.

---

# Apply Log — Group 4, Cleanup (tasks 4.1–4.5)

Final cleanup: removed the class-validator/class-transformer deps, swapped the transitional
`HybridValidationPipe` for a bare `ZodValidationPipe`, deleted the hybrid pipe, and ran full
verification. `packages/shared/src/request-schemas`, all DTO wrappers, and `apps/web` code
were NOT touched (groups 1–3 frozen).

## 4.1 — Dependencies removed

- `apps/api/package.json`: removed `"class-transformer": "^0.5.1"` and
  `"class-validator": "^0.15.1"` from `dependencies`.
- Ran `pnpm install --registry=https://registry.npmjs.org/` (CodeArtifact token expired →
  npmjs registry flag required). Result: "Already up to date"; the `apps/api`
  `node_modules/class-validator` symlink is gone; no workspace `package.json` declares either
  dep directly anymore (grep of all non-node_modules `package.json` = empty).
- **Note (expected, not a deviation):** `pnpm-lock.yaml` still references
  `class-validator@0.15.1` / `class-transformer@0.5.1` — these are now purely TRANSITIVE
  optional peer deps of `@nestjs/common`, `@nestjs/swagger`, `@nestjs/mapped-types`,
  `nestjs-zod`, etc. The task requirement ("apps/api/package.json no longer lists them") is
  satisfied; NestJS peer-declares them optionally and they cannot be removed from the tree
  without dropping unrelated framework packages.

## 4.3 — Pipe swap + hybrid-pipe deletion

- `apps/api/src/main.ts`: import `ZodValidationPipe` from `nestjs-zod`;
  `useGlobalPipes(new ZodValidationPipe())` (was `HybridValidationPipe`). Kept
  `ZodValidationExceptionFilter` and the `cleanupOpenApiDoc(SwaggerModule.createDocument(...))`
  wrap. Removed the `HybridValidationPipe` import from `./common`.
- `apps/api/test/helpers/test-app.ts`: same swap — import `ZodValidationPipe` from
  `nestjs-zod`, `useGlobalPipes(new ZodValidationPipe())`, kept the exception filter.
- Deleted `apps/api/src/common/hybrid-validation.pipe.ts`.
- `apps/api/src/common/index.ts`: removed the `HybridValidationPipe` export (now only
  exports `ZodValidationExceptionFilter`).
- Verified zero lingering `ValidationPipe` / `HybridValidationPipe` / `class-validator` /
  `class-transformer` references anywhere in `apps/api/src` or `apps/api/test`.

## 4.2 — Grep confirmation

| Check                                                                                                   | Result                                                                                                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `class-validator`/`class-transformer` imports under `apps/api/src`                                      | ZERO (only the deleted hybrid pipe ever referenced them)                                                                                                                                                                                                                            |
| `class-validator`/`class-transformer`/`HybridValidationPipe`/`new ValidationPipe` under `apps/api/test` | ZERO                                                                                                                                                                                                                                                                                |
| `@ApiProperty`/`@nestjs/swagger` in any REQUEST `dto/*.dto.ts`                                          | ZERO — the only hit is `apps/api/src/auth/dto/token-response.dto.ts`, a RESPONSE (output-doc) DTO, intentionally left untouched per Batch B note                                                                                                                                    |
| web `*.schema.ts` redefining a shared request shape (adjusted check)                                    | ONLY `apps/web/src/lib/schemas/invoice.schema.ts` still declares a standalone `z.object` request shape — the known flagged product divergence, left as-is. All other web schema files compose from `@glossops/shared` (extend/omit/partial); `warranty.schema.ts` is response-only. |

`apps/web/src/lib/schemas/` intentionally NOT empty (7 files hold out-of-scope
response/domain types + thin composition-over-shared layers) — not required to be empty.

## 4.4 — Swagger spot-check (programmatic `cleanupOpenApiDoc(SwaggerModule.createDocument(...))`)

37 request schemas documented across all 16 modules. Spot-checks:

- **Plain body:** `CreateCustomerDto` props=[firstName, lastName, email, phone, address,
  taxId, fiscalRegime, zipCode, source, note] required=[firstName, lastName].
- **List queries (documented as query params):**
  `GET /customers` → [page, limit, status, search, sortBy, sortOrder];
  `GET /work-orders` → [page, limit, status, assetId];
  `GET /purchase-orders` → [page, limit, status, supplierId].
- **Nested item arrays:** `CreateWorkOrderDto.items` resolves to an array of
  `{ serviceId(uuid), quantity, unitPrice, note }` (required serviceId, unitPrice);
  `CreatePurchaseOrderDto` required=[supplierId, items], `items` → array of
  `{ inventoryId(uuid), quantity, unitCost, note }`; `ReceivePurchaseOrderDto` required=[items].
- Single-field bodies present: `TransitionStatusDto`, `TransitionInvoiceDto`, `VoidWarrantyDto`.

## 4.5 — Full verification

| Command                                | Result                                                                                                                            |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter @glossops/shared build` | PASS                                                                                                                              |
| `pnpm --filter api build`              | PASS                                                                                                                              |
| `pnpm --filter api lint`               | PASS (0 issues; no unused-import/dep fallout from the removal)                                                                    |
| `pnpm --filter api test`               | PASS — 70 suites, 688 tests                                                                                                       |
| `pnpm --filter api test:e2e`           | PASS — 17 suites, 97 tests                                                                                                        |
| `apps/web` `tsc --noEmit`              | Only the 3 PRE-EXISTING `api-client.test.ts` `'error' is of type 'unknown'` errors (unchanged from Group 3); no new errors        |
| `pnpm --filter web test`               | PASS — 20 files, 81 tests                                                                                                         |
| `pnpm --filter web lint`               | PASS (0 issues)                                                                                                                   |
| `pnpm --filter web build`              | PRE-EXISTING `/work-orders/new` `useSearchParams()` suspense-boundary failure (unchanged from Group 3; unrelated files untouched) |
| `./init.sh`                            | EXIT 0 (API 70/688 + web unit suites green)                                                                                       |
| `apps/api/package.json`                | no longer lists `class-validator` or `class-transformer`                                                                          |

## Outstanding flags / deviations for the leader's verify/archive decision

1. **Invoice request-shape divergence (PRODUCT DECISION, unresolved).** Web
   `createInvoiceSchema` (`{ workOrderId, subtotal, tax, total }`, manual totals form) vs
   shared/API `CreateInvoiceSchema` (CFDI fields; the API service recomputes totals and
   ignores client-sent totals). `apps/web/src/lib/schemas/invoice.schema.ts` remains a
   standalone web-local `z.object` (imports only the `InvoiceStatus` enum from shared).
   Left as-is per the "STOP and report rather than force reuse" rule. Decision needed:
   (a) rework the web invoice form to the CFDI shape + consume `CreateInvoiceSchema`, or
   (b) formally accept the web form as a UI-only shape the API recomputes.
2. **Pre-existing web build failure (NOT from this change).** `/work-orders/new`
   `useSearchParams() should be wrapped in a suspense boundary` — confirmed still present,
   unrelated files untouched. `init.sh` does not run `next build`, so this does not affect
   the green gate. Excluded from pass/fail per Group 4 scope.
3. **Pre-existing web tsc errors (NOT from this change).** 3 × `'error' is of type
'unknown'` in `apps/web/src/lib/api-client.test.ts` — unchanged from Group 3, confirmed
   on clean master previously. Excluded from pass/fail.
4. **Lockfile transitive references (expected).** `class-validator`/`class-transformer`
   remain in `pnpm-lock.yaml` only as optional peer deps of NestJS packages — no direct
   workspace declaration remains. See 4.1 note.
5. **`token-response.dto.ts` retains `@ApiProperty`** — intentional; it is a response
   (output-doc) DTO, out of scope per Batch B ("do not remove @nestjs/swagger from
   \*ResponseDto classes").

## Invoice reconciliation (post-group-4)

Closed the last flagged divergence: the web invoice-create form now consumes the
shared `CreateInvoiceSchema` as its single source of truth and no longer collects
server-computed totals.

**Changed files:**

1. `apps/web/src/lib/schemas/invoice.schema.ts` — deleted the standalone
   `createInvoiceSchema` `z.object` (manual `{ workOrderId, subtotal, tax, total }`).
   Now imports and re-exports `CreateInvoiceSchema` from `@glossops/shared`, and
   re-derives `CreateInvoiceValues = z.infer<typeof CreateInvoiceSchema>`. The
   `Invoice` response `interface` and the `InvoiceStatus` re-export are kept
   (out-of-scope response/domain types). No web-only refinement was needed. The
   file no longer declares any invoice request `z.object`.

2. `apps/web/src/hooks/use-invoices.ts` — no code change required; `useCreateInvoice`
   already types its input via `CreateInvoiceValues`, which is now the shared-derived
   type. Verified it flows to `POST /invoices`.

3. `apps/web/src/app/(dashboard)/work-orders/[id]/page.tsx` — `InvoiceDrawer`
   converted from a 3-input form (subtotal/tax/total) to a minimal **confirmation
   drawer**. It drops the useForm/zodResolver/FormField machinery and the three
   number inputs, shows a Spanish explanatory paragraph (folio and totals are
   generated automatically from the completed work order), and submits only
   `{ workOrderId }` via `createInvoice.mutateAsync`. No CFDI inputs and no
   paymentMethod select were added (all optional; kept minimal per scope). Removed
   the now-unused imports (`createInvoiceSchema`, `CreateInvoiceValues`,
   `zodResolver`, `Input`, and the `Form*` component barrel). The post-creation
   invoice display (folio/subtotal/tax/total from the response) is unchanged.

4. `apps/web/src/lib/schemas/invoice.schema.test.ts` — rewritten to assert against
   the shared-derived shape using `.safeParse().success` (cross-realm zod makes
   `instanceof ZodError` unreliable under Vite): valid minimal parse with a uuid
   `{ workOrderId }`, optional CFDI fields accepted (incl. `paymentMethod: 'PUE'`),
   reject non-uuid `workOrderId`, reject invalid `paymentMethod`.
   Also updated `apps/web/src/hooks/use-invoices.test.ts` (the mutate payload used
   the old totals shape) to send a uuid `{ workOrderId }`.

**Final InvoiceDrawer UX:** confirmation drawer (no field inputs), submits
`{ workOrderId }` only.

**Verification:**

- `npx tsc --noEmit` (apps/web): only the 3 pre-existing `api-client.test.ts`
  `TS18046 'error' is of type 'unknown'` errors — no new errors.
- `pnpm --filter web test`: PASS — 20 files, 81 tests.
- `pnpm --filter web lint`: clean (0 problems).
- `grep z.object` in `invoice.schema.ts`: no match — divergence closed.
