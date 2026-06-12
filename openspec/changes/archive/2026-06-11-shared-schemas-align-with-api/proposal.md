## Why

The new e2e suites introduced by `testing-integration-api` exposed ~20 distinct drift points between `@glossops/shared` Zod schemas and what `apps/api` actually returns. To ship the suites green the implementer had to bypass `parseWith(schema)` and stamp the `// no shared schema yet — TODO publish <Name>Schema in @glossops/shared` markers across 11 spec files. These markers fall into two buckets:

- **Existing schemas that disagree with the API** — `WorkOrderListItemSchema`/`WorkOrderDetailSchema` require a non-existent `folio`; `AssetCheckpointSchema.photo` is `z.record(z.unknown())` but the API returns a `string[]`; `WorkOrderAssignmentSchema` expects a nested `account` object the controller doesn't include; `InventoryItemSchema` models a discriminated union that doesn't match the actual `{ items, materialRolls }` payload; `InvoiceSchema` declares Decimal fields as `z.number()` but the API serializes them as string and is missing `folio`/`taxRate`/`taxAmount`; `PurchaseOrderSchema` is missing the `items` array; `CustomerSchema.activeWorkOrderCount` is required everywhere but the API only computes it on list endpoints.
- **Endpoints that have no published schema at all** — auth token pairs, `Organization + role` enrichment on member listings, `Member + Account` joins, invitation-creation responses, inventory usage history, and every paginated list wrapper (`{ data, total, page, limit }`).

Until this drift is closed, `apps/web` cannot rely on `@glossops/shared` types end-to-end and the e2e suites carry workaround code that hides real contract regressions.

## What Changes

- **API is treated as the source of truth.** No controllers, services, repositories, or Prisma schema files in `apps/api/src/` are touched. Every change happens in `packages/shared/` and `apps/api/test/`.
- **Existing schemas are corrected** to match the actual payload returned today:
  - `AssetCheckpointSchema.photo`: `z.record(z.unknown())` → `z.array(z.string())` (array of URLs).
  - `WorkOrderListItemSchema` and `WorkOrderDetailSchema`: drop the required `folio` field (the field does not exist on `WorkOrder` — only on `Invoice`).
  - `WorkOrderAssignmentSchema`: align with the actual controller payload (it currently expects a nested `account`; the controller returns a flat shape).
  - `CustomerSchema` / `CustomerListItemSchema`: align `activeWorkOrderCount` so it is required on list payloads (where the API computes it) and absent/optional on detail.
  - `InventoryItemSchema`: replace the discriminated union with the real payload (`{ items, materialRolls }` arrays with Decimal fields).
  - `InvoiceSchema`: add `folio`, `taxRate`, `taxAmount`, and any other fiscal fields the API returns; use Decimal-friendly typing (see design D2).
  - `PurchaseOrderSchema`: add the `items` array.
- **New schemas are published** to cover endpoints the e2e suites currently assert inline:
  - `AuthTokensSchema` — `{ accessToken, refreshToken, expiresIn }` for `/auth/register`, `/auth/login`, `/auth/refresh`.
  - `OrganizationWithRoleSchema`, `MemberWithAccountSchema`, `InvitationCreatedSchema` for the organizations endpoints.
  - `WorkOrderAssignmentResponseSchema` — the flat shape the controller returns (distinct from the nested `WorkOrderAssignmentSchema`).
  - `InventoryUsageSchema` for `GET /inventory/:id/usages`.
  - `WorkOrderCreateResponseSchema` and any other POST/PATCH response variants that differ from the existing list/detail schemas.
- **A generic page wrapper is introduced**: `createPageSchema(itemSchema) => z.object({ data: z.array(itemSchema), total: z.number(), page: z.number(), limit: z.number() })`. Every paginated endpoint gets its `Page` schema via this factory (`CustomerPage`, `WorkOrderPage`, `PurchaseOrderPage`, `InvoicePage`, `InventoryPage`, `ActivityLogPage`).
- **Decimal handling is unified**: every Prisma Decimal field uses `z.coerce.number()` in the published schema (see design D2 for rationale). The Zod-typed output is always `number`; the runtime accepts both numeric and string inputs so the API does not need to change.
- **The e2e suites are migrated**: every `// no shared schema yet` comment is removed; every inline-typed response is converted to `parseWith(<NewSchema>)`. Every local `interface ...Response` defined inside `apps/api/test/*.e2e-spec.ts` is deleted.

## Capabilities

### New Capabilities

<!-- None. All work lives inside the existing `shared-schemas` capability. -->

### Modified Capabilities

- `shared-schemas`: extend "Entity response schemas exported" with the new schemas listed above, codify the generic page wrapper, codify the Decimal coercion contract, and correct the entity shapes that disagree with the API payload today.

## Impact

- **`packages/shared/src/schemas/`**: edits to `work-order.ts`, `customer.ts`, `asset-checkpoint.ts`, `invoice.ts`, `inventory.ts`, `purchase-order.ts`; new files `auth.ts`, `pagination.ts` (the factory), `organization.ts` (extended), `inventory-usage.ts`, `work-order-assignment.ts` (new flat-shape schema).
- **`packages/shared/src/index.ts`**: barrel updated (longest → shortest line sort kept).
- **`apps/api/test/*.e2e-spec.ts`**: all 11 affected suites lose their local `interface ...Response` definitions and their `// no shared schema yet` comments; every response is parsed through `parseWith(<NewSchema>)`. Net result: more lines deleted than added.
- **`apps/web`**: no functional change. Imports already pull from `@glossops/shared`; the corrected shapes match the runtime behavior `apps/web` is already coding against.
- **`apps/api/src/`**: **untouched**. Out of scope per decision D1 in `design.md`.
- **CI / verification**: `pnpm --filter api test:e2e` still passes (zero workarounds), `pnpm --filter web typecheck` still passes (types narrow), `./init.sh` green.
- **Follow-up unblocked**: with the e2e suites no longer carrying workarounds, future drift surfaces immediately as a `parseWith` failure rather than as an ignored inline assertion.
