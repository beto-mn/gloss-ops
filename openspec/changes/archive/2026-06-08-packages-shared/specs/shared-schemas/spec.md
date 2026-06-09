## ADDED Requirements

### Requirement: Entity response schemas exported

`@glossops/shared` SHALL export a Zod schema and a corresponding TypeScript type for each domain entity response: `Customer`, `CustomerAsset`, `WorkOrder`, `WorkOrderItem`, `WorkOrderAssignment`, `AssetCheckpoint`, `Service`, `Supplier`, `Brand`, `Branch`, `Organization`, `InventoryItem`, `PurchaseOrder`, `Warranty`, `Invoice`, `ActivityLog`.

#### Scenario: Schema parses valid API response

- **WHEN** a valid API JSON response for an entity is parsed with its schema
- **THEN** `schema.parse(response)` returns without throwing and the result is typed correctly

#### Scenario: Schema rejects invalid response

- **WHEN** a JSON object with missing required fields is parsed
- **THEN** `schema.parse(object)` throws a `ZodError`

### Requirement: Types derived via z.infer

All entity types exported from `@glossops/shared` SHALL be derived via `z.infer<typeof Schema>` — no manually written interface duplicates the schema shape.

#### Scenario: Type matches schema

- **WHEN** the TypeScript compiler checks an assignment of a parsed entity to its exported type
- **THEN** no type error is raised

### Requirement: Web schemas import from shared

`apps/web/src/lib/schemas/` SHALL replace inline `z.enum([...])` calls and entity response shape definitions with imports from `@glossops/shared`. Form-specific value types (e.g., `CreateWorkOrderValues`) MUST remain local.

#### Scenario: Work order hook uses shared type

- **WHEN** `use-work-orders.ts` references `WorkOrderStatus`
- **THEN** the import path is `@glossops/shared`, not a local schema file

#### Scenario: Local form schemas still compile

- **WHEN** `pnpm --filter apps/web typecheck` is run after the migration
- **THEN** it exits with code 0 and no type errors are reported
