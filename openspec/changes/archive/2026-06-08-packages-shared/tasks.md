## 1. Entity Schemas in packages/shared

- [x] 1.1 Create `packages/shared/src/schemas/` directory with `index.ts` barrel
- [x] 1.2 Add `customer.ts` schema: `CustomerSchema`, `CustomerListItemSchema`, export `Customer` and `CustomerListItem` types
- [x] 1.3 Add `customer-asset.ts` schema: `CustomerAssetSchema`, export `CustomerAsset` type
- [x] 1.4 Add `work-order.ts` schema: `WorkOrderSchema`, `WorkOrderDetailSchema`, `WorkOrderListItemSchema`, `WorkOrderItemSchema`, `WorkOrderAssignmentSchema`, export corresponding types
- [x] 1.5 Add `asset-checkpoint.ts` schema: `AssetCheckpointSchema`, export `AssetCheckpoint` type
- [x] 1.6 Add `service.ts` schema: `ServiceSchema`, export `Service` type
- [x] 1.7 Add `supplier.ts` schema: `SupplierSchema`, export `Supplier` type
- [x] 1.8 Add `brand.ts` schema: `BrandSchema`, export `Brand` type
- [x] 1.9 Add `branch.ts` schema: `BranchSchema`, export `Branch` type
- [x] 1.10 Add `organization.ts` schema: `OrganizationSchema`, `OrganizationMemberSchema`, export types
- [x] 1.11 Add `inventory.ts` schema: `InventoryItemSchema`, export `InventoryItem` type
- [x] 1.12 Add `purchase-order.ts` schema: `PurchaseOrderSchema`, export `PurchaseOrder` type
- [x] 1.13 Add `warranty.ts` schema: `WarrantySchema`, export `Warranty` type
- [x] 1.14 Add `invoice.ts` schema: `InvoiceSchema`, export `Invoice` type
- [x] 1.15 Add `activity-log.ts` schema: `ActivityLogSchema`, export `ActivityLog` type
- [x] 1.16 Update `packages/shared/src/index.ts` to re-export all schemas and types from `./schemas`
- [x] 1.17 Run `pnpm --filter @glossops/shared build` and verify it exits 0

## 2. Wire Dependency in Both Apps

- [x] 2.1 Add `"@glossops/shared": "workspace:*"` to `apps/web/package.json` dependencies
- [x] 2.2 Add `"@glossops/shared": "workspace:*"` to `apps/api/package.json` dependencies
- [x] 2.3 Run `pnpm install` from repo root to link the workspace packages

## 3. Migrate apps/web — Replace Inline Enums and Response Types

- [x] 3.1 Update `apps/web/src/lib/schemas/work-order.schema.ts`: import `WorkOrderStatus`, `WorkOrderType`, `CheckpointType` from `@glossops/shared`; replace inline `z.enum([...])` calls
- [x] 3.2 Update `apps/web/src/lib/schemas/customer-asset.schema.ts`: import `AssetCondition`, `FuelLevel` from `@glossops/shared`
- [x] 3.3 Update `apps/web/src/hooks/use-work-orders.ts`: import `WorkOrderStatus` from `@glossops/shared` instead of the local schema
- [x] 3.4 Update `apps/web/src/hooks/use-auth.ts`: import `Role` from `@glossops/shared` if locally defined
- [x] 3.5 Update `apps/web/src/hooks/use-invoices.ts`: import `InvoiceStatus` from `@glossops/shared` if locally defined
- [x] 3.6 Run `pnpm --filter apps/web typecheck` and fix any type errors

## 4. Migrate apps/api — Replace Local Enum Copies

- [x] 4.1 Search `apps/api/src/` for any locally-defined copies of domain enums (e.g., `enum WorkOrderStatus`, `enum Role`)
- [x] 4.2 Replace each found local enum with an import from `@glossops/shared`
- [x] 4.3 Run `pnpm --filter apps/api typecheck` and fix any type errors
- [x] 4.4 Run `pnpm --filter apps/api test` and verify all 601 tests pass

## 5. Final Verification

- [x] 5.1 Run `pnpm -r build` from repo root and confirm all packages build in correct order
- [x] 5.2 Run `./init.sh` and confirm all checks pass
