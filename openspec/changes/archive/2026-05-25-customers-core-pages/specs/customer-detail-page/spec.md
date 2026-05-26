## ADDED Requirements

### Requirement: Page shows breadcrumb and customer information

The `/customers/[id]` page SHALL render a breadcrumb "Clientes > [Nombre del cliente]" and a customer info section displaying all customer fields. An "Editar" button SHALL open the shared `CustomerDrawer` in edit mode.

#### Scenario: Breadcrumb renders customer name

- **WHEN** the user navigates to `/customers/abc123`
- **THEN** the breadcrumb shows "Clientes > [firstName] [lastName]"

#### Scenario: Edit button opens drawer pre-filled

- **WHEN** the user clicks "Editar"
- **THEN** the CustomerDrawer opens with all current customer values pre-filled

#### Scenario: Customer not found

- **WHEN** the URL contains an ID that does not exist in the org
- **THEN** the page shows a not-found message and a link back to `/customers`

### Requirement: Page shows a vehicles table with add and edit actions

The `/customers/[id]` page SHALL include a vehicles section listing all `CustomerAsset` records for the customer. Columns: tipo, marca/modelo, año, placa/identificador. An "Agregar vehículo" button SHALL open a `VehicleDrawer` in create mode. An "Editar" action per row SHALL open the `VehicleDrawer` in edit mode.

#### Scenario: Vehicles table shows all assets

- **WHEN** the customer has 3 vehicles
- **THEN** the table shows 3 rows with tipo, marca/modelo, año, and placa

#### Scenario: Empty vehicles state

- **WHEN** the customer has no vehicles
- **THEN** the table shows an empty state with an "Agregar vehículo" prompt

### Requirement: Vehicle hard delete removes the asset immediately

The "Eliminar" action on a vehicle row SHALL open a confirmation dialog and, on confirm, call `DELETE /customer-assets/:id?permanent=true`. There is no soft delete for vehicles from the web UI.

#### Scenario: Delete vehicle with confirmation

- **WHEN** the user clicks "Eliminar" on a vehicle row and confirms the dialog
- **THEN** the vehicle is permanently removed and the table refreshes

#### Scenario: Cancel delete keeps the vehicle

- **WHEN** the user clicks "Eliminar" but cancels the confirmation dialog
- **THEN** no deletion occurs

### Requirement: Nueva orden de trabajo button navigates with prefilled params

The `/customers/[id]` page header SHALL include a "Nueva orden de trabajo" button. Clicking it navigates to `/work-orders/new?customerId=[id]`. When the button is clicked from a vehicle row action, `assetId=[vehicleId]` is appended to the URL.

#### Scenario: Create WO from page header (no vehicle selected)

- **WHEN** the user clicks "Nueva orden de trabajo" from the page header
- **THEN** the browser navigates to `/work-orders/new?customerId=X`

#### Scenario: Create WO from vehicle row

- **WHEN** the user clicks "Nueva orden" on a specific vehicle row
- **THEN** the browser navigates to `/work-orders/new?customerId=X&assetId=Y`
