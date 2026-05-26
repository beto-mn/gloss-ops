# Spec Delta: Customer Assets Module

## ADDED Requirements

### Requirement: Vehicle table rows are navigable

In the customer detail page (`/customers/[id]`), each vehicle row in the assets table SHALL be clickable and navigate to `/customers/[id]/vehicles/[asset.id]`. The row SHALL display a pointer cursor on hover.

#### Scenario: Click on vehicle row navigates to detail

- **WHEN** the user clicks anywhere on a vehicle table row (excluding the actions dropdown trigger)
- **THEN** the browser navigates to `/customers/[id]/vehicles/[asset.id]`

#### Scenario: Click on dropdown does not navigate

- **WHEN** the user clicks the `MoreHorizontal` dropdown trigger in a vehicle row
- **THEN** the dropdown opens and navigation does NOT occur
