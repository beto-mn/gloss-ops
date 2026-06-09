## ADDED Requirements

### Requirement: All domain enums exported from shared

`@glossops/shared` SHALL export all domain enums: `Role`, `WorkOrderStatus`, `WorkOrderType`, `CheckpointType`, `ActivityAction`, `InvoiceStatus`, `PurchaseOrderStatus`, `InventoryType`, `AssetCondition`, `FuelLevel`, `CfdiPaymentMethod`.

#### Scenario: Enum import works

- **WHEN** any workspace package imports an enum by name from `@glossops/shared`
- **THEN** the TypeScript compiler resolves it and the runtime value matches the expected string

### Requirement: Apps replace local enum copies with shared imports

`apps/api` and `apps/web` SHALL NOT define their own copies of domain enums that exist in `@glossops/shared`. All usages MUST import from `@glossops/shared`.

#### Scenario: No duplicate enum in web

- **WHEN** a grep for `enum WorkOrderStatus` is run across `apps/web/src/`
- **THEN** zero results are found

#### Scenario: No duplicate enum in api

- **WHEN** a grep for `enum WorkOrderStatus` is run across `apps/api/src/`
- **THEN** zero results are found (the Prisma-generated enum in `packages/database` is exempt)
