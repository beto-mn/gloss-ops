# Spec: Vehicle Detail Page

## Purpose

Defines requirements for the `/customers/[id]/vehicles/[vid]` page in the GlossOps web app.

## Requirements

### Requirement: Page loads vehicle data from the API

The page SHALL fetch the asset via `GET /customer-assets/:vid`, the customer via `GET /customers/:id` (for breadcrumb), warranties via `GET /customer-assets/:vid/warranties`, and work orders via `GET /work-orders?assetId=:vid`. All four fetches run in parallel.

#### Scenario: Successful load

- **WHEN** all four fetches return successfully
- **THEN** the page renders: breadcrumb, vehicle header, info section, warranties section, work-order history section

#### Scenario: Skeleton while loading

- **WHEN** any fetch is still pending
- **THEN** skeleton placeholders are displayed for each section that has not resolved

### Requirement: Cross-customer access guard

After resolving the asset, the page SHALL verify that `asset.customerId === params.id`. If they do not match, the page MUST render the not-found state.

#### Scenario: Asset belongs to a different customer

- **WHEN** the asset exists in the org but its `customerId` does not match the `[id]` route param
- **THEN** the page renders the not-found state with a "Volver a clientes" link

#### Scenario: Asset not found in org

- **WHEN** `GET /customer-assets/:vid` returns 404
- **THEN** the page renders the not-found state with a "Volver a clientes" link

### Requirement: Breadcrumb reflects full path

The breadcrumb SHALL display: `Clientes` (link to `/customers`) → `[customer.firstName] [customer.lastName]` (link to `/customers/:id`) → `[brand] [asset.model] [asset.year]` (current, not linked).

#### Scenario: Breadcrumb renders with year

- **WHEN** the asset has a `year` value
- **THEN** the breadcrumb shows `[model] [year]` (e.g., "Civic 2022")

#### Scenario: Breadcrumb renders without year

- **WHEN** the asset has no `year`
- **THEN** the breadcrumb shows just `[model]`

### Requirement: Header actions

The header SHALL include three actions:

1. **Nueva orden** — navigates to `/work-orders/new?customerId=:id&assetId=:vid`
2. **Editar** — opens `VehicleDrawer` in edit mode pre-filled with the current asset
3. **Eliminar** — opens a confirmation `AlertDialog`; on confirm, calls `DELETE /customer-assets/:vid` (hard delete) then navigates back to `/customers/:id`

#### Scenario: Edit opens pre-filled drawer

- **WHEN** user clicks "Editar"
- **THEN** `VehicleDrawer` opens with all current asset fields pre-filled

#### Scenario: Delete requires confirmation

- **WHEN** user clicks "Eliminar"
- **THEN** a confirmation dialog appears before any API call is made

#### Scenario: Delete navigates back on success

- **WHEN** the delete confirmation is accepted and the API call succeeds
- **THEN** the user is navigated to `/customers/:id`

### Requirement: Vehicle info section displays all fields

The info section SHALL display all asset fields in a responsive grid: tipo de activo, tipo personalizado (only when `assetType === OTHER`), marca, modelo, año, identificador, país, color, notas. Fields with null/undefined values SHALL display an em dash (`—`).

#### Scenario: All fields present

- **WHEN** the asset has values for all fields
- **THEN** each field label and value are visible

#### Scenario: Optional field absent

- **WHEN** a field like `color` is null
- **THEN** the cell shows `—`

#### Scenario: customAssetType visible only for OTHER

- **WHEN** `assetType === OTHER` and `customAssetType` is set
- **THEN** a "Tipo personalizado" field appears with the value

#### Scenario: customAssetType hidden for non-OTHER types

- **WHEN** `assetType !== OTHER`
- **THEN** no "Tipo personalizado" field is rendered

### Requirement: Warranty status is derived client-side

Each warranty entry SHALL display a status badge computed as follows:

- `isVoid === true` → **Anulada** (destructive/red badge)
- `validUntil < new Date()` → **Vencida** (warning/amber badge)
- Otherwise → **Vigente** (success/green badge)

#### Scenario: Active warranty

- **WHEN** `isVoid === false` and `validUntil` is in the future
- **THEN** the badge reads "Vigente" with a green style

#### Scenario: Expired warranty

- **WHEN** `isVoid === false` and `validUntil` is in the past
- **THEN** the badge reads "Vencida" with an amber style

#### Scenario: Voided warranty

- **WHEN** `isVoid === true`
- **THEN** the badge reads "Anulada" with a red style, regardless of dates

### Requirement: Warranties section empty state

When the vehicle has no warranties, the warranties section SHALL display an empty state message.

#### Scenario: No warranties

- **WHEN** `GET /customer-assets/:vid/warranties` returns an empty array
- **THEN** the section shows "Sin garantías registradas"

### Requirement: Work-order history table

The work-order history section SHALL display a table with columns: folio, status badge, type, fecha de creación. Each row SHALL link to `/work-orders/[id]`.

Work order status badge colors:

- `DRAFT` → neutral/gray
- `CONFIRMED` → blue
- `IN_PROGRESS` → amber
- `COMPLETED` → green
- `CANCELLED` → red

Work order type labels:

- `STANDARD` → "Estándar"
- `WARRANTY_CLAIM` → "Garantía"

#### Scenario: Work orders present

- **WHEN** `GET /work-orders?assetId=:vid` returns results
- **THEN** each row shows folio, status badge, type label, and creation date

#### Scenario: No work orders

- **WHEN** the work orders response is an empty list
- **THEN** the section shows "Sin órdenes de trabajo"
