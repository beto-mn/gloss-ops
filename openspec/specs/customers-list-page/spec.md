# Spec: customers-list-page

## Purpose

Defines the requirements for the `customers-list-page` capability in GlossOps.

## Requirements

### Requirement: Page displays a paginated table of active customers

The `/customers` page SHALL render a table with columns: Nombre completo, Teléfono, Email, Registrado el, and a badge "Orden activa" when `activeWorkOrderCount > 0`. The table MUST paginate using the API's `page` and `limit` params.

#### Scenario: Table shows active customers

- **WHEN** the user navigates to `/customers`
- **THEN** a table of `ACTIVE` customers is shown with the correct columns

#### Scenario: Badge appears for customers with active work orders

- **WHEN** a customer has `activeWorkOrderCount > 0`
- **THEN** an "Orden activa" badge is visible in that customer's row

#### Scenario: No customers found

- **WHEN** the organization has no active customers
- **THEN** the table shows an empty state message

### Requirement: Page has tabs to switch between active and archived customers

The `/customers` page SHALL have two tabs: "Activos" and "Archivados". The "Activos" tab lists customers with `status = ACTIVE`; the "Archivados" tab lists customers with `status = INACTIVE`.

#### Scenario: Switching to Archivados tab

- **WHEN** the user clicks the "Archivados" tab
- **THEN** the table reloads and shows only `INACTIVE` customers

### Requirement: Search and sort controls filter and order the table

The page SHALL include a search input and a sort selector. The search input debounces and passes `?search=` to the API. The sort selector sets `sortBy` and `sortOrder`.

#### Scenario: Search filters by name

- **WHEN** the user types "García" in the search input
- **THEN** the table updates to show only customers matching that term

#### Scenario: Sort selector changes order

- **WHEN** the user selects "Nombre A-Z" from the sort selector
- **THEN** the table reloads ordered by `firstName asc`

### Requirement: New-customer drawer opens from the page header

A "Nuevo cliente" button in the page header SHALL open a drawer with the customer creation form (firstName, lastName, email, phone, address, taxId, fiscalRegime, zipCode, source, note). On success, the customers list is invalidated and the drawer closes.

#### Scenario: Create customer successfully

- **WHEN** the user fills the form and submits
- **THEN** the customer is created, the drawer closes, and the table refreshes

#### Scenario: Duplicate email on create

- **WHEN** the user submits with an email that already exists
- **THEN** the form shows an inline error "Este email ya está registrado"

### Requirement: Row actions allow edit, archive, and hard delete

Each row in the "Activos" tab SHALL have an "Editar" action that opens the edit drawer and an "Archivar" action that soft-deletes the customer (sets status to `INACTIVE`). Each row in the "Archivados" tab SHALL have an "Eliminar" action that hard-deletes the customer after a confirmation dialog. Hard delete requires `OWNER` role; the action is hidden for other roles.

#### Scenario: Archive a customer

- **WHEN** the user clicks "Archivar" on an active customer and confirms
- **THEN** the customer's status becomes `INACTIVE` and it moves to the Archivados tab

#### Scenario: Hard delete a customer (Owner)

- **WHEN** an OWNER clicks "Eliminar" on an archived customer and confirms
- **THEN** the customer is permanently removed

#### Scenario: Hard delete hidden for non-Owner

- **WHEN** a MANAGER views the Archivados tab
- **THEN** the "Eliminar" action is not visible

### Requirement: Clicking a row navigates to the customer detail page

Clicking anywhere on a customer row (except action buttons) SHALL navigate to `/customers/[id]`.

#### Scenario: Row click navigates to detail

- **WHEN** the user clicks a customer row
- **THEN** the browser navigates to `/customers/[id]`
