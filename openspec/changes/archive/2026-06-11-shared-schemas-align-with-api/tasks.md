## 1. New shared infrastructure (factory + auth)

- [x] 1.1 Create `packages/shared/src/schemas/pagination.ts` exporting `createPageSchema(itemSchema)` per design D3
- [x] 1.2 Create `packages/shared/src/schemas/auth.ts` exporting `AuthTokensSchema` (`accessToken: string`, `refreshToken: string`, `expiresIn: number`) and the inferred `AuthTokens` type
- [x] 1.3 Update `packages/shared/src/schemas/index.ts` (barrel) to re-export `pagination` and `auth` modules, keeping longest → shortest sort

## 2. Correct existing schemas (in-place edits)

- [x] 2.1 `asset-checkpoint.ts`: change `photo` from `z.record(z.unknown())` to `z.array(z.string())` matching the API's URL list
- [x] 2.2 `work-order.ts`: drop the required `folio` field from `WorkOrderListItemSchema` and `WorkOrderDetailSchema`; keep all other fields
- [x] 2.3 `customer.ts`: keep `activeWorkOrderCount` required on `CustomerListItemSchema`; remove it from `CustomerSchema`/`CustomerDetailSchema` (the API does not return it on detail or create); add `CustomerCreateResponseSchema` for `POST /customers` if its shape differs from list
- [x] 2.4 `inventory.ts`: replace the discriminated union with the real payload — an `InventoryItemSchema` matching the `items[]` element and an `InventoryRecordSchema` (or equivalent) wrapping `{ items, materialRolls }` as the API actually returns; apply `z.coerce.number()` to every Decimal field
- [x] 2.5 `invoice.ts`: add `folio`, `taxRate`, `taxAmount`, and any other fiscal fields the API returns; convert every Decimal field (`subtotal`, `tax`, `total`, line-item amounts) to `z.coerce.number()`
- [x] 2.6 `purchase-order.ts`: add the `items` array (each line item with `serviceId`/`description`, `quantity`, `unitPrice`, `subtotal`) using `z.coerce.number()` for monetary fields
- [x] 2.7 `work-order.ts`: align the existing `WorkOrderAssignmentSchema` (nested-account variant) so the inputs that match it actually match the API output, OR keep it as the nested-account variant and rely on the new `WorkOrderAssignmentResponseSchema` (see task 3.3) for the flat shape; pick whichever interpretation the controller code supports

## 3. New entity schemas

- [x] 3.1 Extend `organization.ts` with `OrganizationWithRoleSchema` (existing `OrganizationSchema` + `role: z.nativeEnum(MemberRole)`), `MemberWithAccountSchema` (membership row joined with account fields), and `InvitationCreatedSchema` (the `/organizations/:id/invitations` response)
- [x] 3.2 Create `packages/shared/src/schemas/inventory-usage.ts` with `InventoryUsageSchema` for `GET /inventory/:id/usages`
- [x] 3.3 Create `packages/shared/src/schemas/work-order-assignment.ts` with `WorkOrderAssignmentResponseSchema` matching the flat-shape controller output (distinct from the nested `WorkOrderAssignmentSchema` in `work-order.ts`)
- [x] 3.4 Extend `work-order.ts` with `WorkOrderCreateResponseSchema` if the POST shape differs from `WorkOrderDetailSchema`
- [x] 3.5 Extend `customer.ts` and `work-order.ts` with `WorkOrderListItemSchema`-style list variants as needed; do not break existing exports

## 4. Page schemas via factory

- [x] 4.1 Publish `CustomerPageSchema = createPageSchema(CustomerListItemSchema)`
- [x] 4.2 Publish `WorkOrderPageSchema = createPageSchema(WorkOrderListItemSchema)`
- [x] 4.3 Publish `PurchaseOrderPageSchema = createPageSchema(PurchaseOrderSchema)` (or its list variant if one is added)
- [x] 4.4 Publish `InvoicePageSchema = createPageSchema(InvoiceSchema)` (or its list variant)
- [x] 4.5 Publish `InventoryPageSchema = createPageSchema(InventoryRecordSchema)`
- [x] 4.6 Publish `ActivityLogPageSchema = createPageSchema(ActivityLogSchema)`
- [x] 4.7 Re-sort `packages/shared/src/schemas/index.ts` barrel (longest → shortest line)

## 5. Migrate e2e suites to parseWith

- [x] 5.1 `auth.e2e-spec.ts`: replace the inline `AuthTokensResponse` (or equivalent) with `parseWith(AuthTokensSchema)` on register/login/refresh responses; delete the workaround comment
- [x] 5.2 `organizations.e2e-spec.ts`: replace the three local interfaces (`OrganizationWithRole`, `MemberWithAccount`, `InvitationCreated`) with `parseWith` on the new published schemas; delete the workaround comments
- [x] 5.3 `customers.e2e-spec.ts`: replace `CustomerResponse` interface with `parseWith(CustomerCreateResponseSchema)` or `parseWith(CustomerSchema)` per endpoint; delete the workaround comment
- [x] 5.4 `customer-assets.e2e-spec.ts`: replace the local interface with `parseWith(CustomerAssetSchema)` and `parseWith(CustomerCreateResponseSchema)` for the parent setup
- [x] 5.5 `work-orders.e2e-spec.ts`: replace `WorkOrderResponse`, `WorkOrderListItem`, `WorkOrderPageResponse` with `parseWith(WorkOrderSchema|WorkOrderCreateResponseSchema|WorkOrderPageSchema)` per endpoint; delete the workaround comments
- [x] 5.6 `work-order-assignments.e2e-spec.ts`: replace `WorkOrderAssignmentResponse` and `MemberWithAccount` interfaces with `parseWith(WorkOrderAssignmentResponseSchema)` and `parseWith(MemberWithAccountSchema)`
- [x] 5.7 `asset-checkpoints.e2e-spec.ts`: replace `AssetCheckpointResponse` with `parseWith(AssetCheckpointSchema)` now that `photo` matches
- [x] 5.8 `activity-logs.e2e-spec.ts`: replace `ActivityLogPageResponse` with `parseWith(ActivityLogPageSchema)`
- [x] 5.9 `inventory.e2e-spec.ts`: replace `InventoryItemRecord` and `InventoryPageResponse` with `parseWith(InventoryRecordSchema)` / `parseWith(InventoryPageSchema)`
- [x] 5.10 `invoices.e2e-spec.ts`: replace `InvoiceResponse` and `InvoicePageResponse` with `parseWith(InvoiceSchema)` / `parseWith(InvoicePageSchema)`
- [x] 5.11 `purchase-orders.e2e-spec.ts`: replace `PurchaseOrderResponse`, `PurchaseOrderItemResponse`, `PurchaseOrderPageResponse`, `InventoryRecordResponse` with the published equivalents
- [x] 5.12 `warranties.e2e-spec.ts`: replace the local `CustomerCreateResponse`/`WorkOrderCreateResponse` interfaces (used only for tenant setup) with the published versions

## 6. Decimal runtime assertions (design D7)

- [x] 6.1 In `invoices.e2e-spec.ts`: after `parseWith(InvoiceSchema)` returns, assert `typeof parsed.total === 'number'` for at least one invoice
- [x] 6.2 In `purchase-orders.e2e-spec.ts`: after `parseWith(PurchaseOrderSchema)` returns, assert `typeof parsed.items[0].unitPrice === 'number'` and `typeof parsed.items[0].subtotal === 'number'`
- [x] 6.3 In `inventory.e2e-spec.ts`: assert at least one Decimal field on a roll item is `number` at runtime after parsing

## 7. Verification gates (design D6)

- [x] 7.1 `grep -r "no shared schema yet" apps/api/test/` → must return zero matches
- [x] 7.2 `grep -rE "^interface\s+\w+Response" apps/api/test/` → must return zero matches
- [x] 7.3 `pnpm --filter shared build` (or equivalent typecheck for the shared package) → exit 0
- [x] 7.4 `pnpm --filter api test` → still 54 suites / 601 tests passing
- [x] 7.5 `pnpm --filter api test:e2e` → still 17 suites / 94 tests passing
- [x] 7.6 `pnpm --filter web typecheck` (or the web app's typecheck script) → exit 0
- [x] 7.7 `pnpm --filter api lint` and `pnpm --filter web lint` → exit 0
- [x] 7.8 `./init.sh` → green

## 8. Session close

- [x] 8.1 Update `progress/current.md` with the final summary
- [x] 8.2 Move the summary to `progress/history.md` and reset `current.md` to the template
- [x] 8.3 Mark feat 33 `done` in `feature_list.json`
