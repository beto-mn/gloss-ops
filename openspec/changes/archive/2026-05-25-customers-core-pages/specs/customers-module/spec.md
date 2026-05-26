## ADDED Requirements

### Requirement: List supports configurable sort order

`GET /customers` MUST accept optional `sortBy` (`firstName` | `lastName` | `createdAt`) and `sortOrder` (`asc` | `desc`) query parameters. When omitted, defaults are `createdAt` and `desc`. The repository SHALL apply the `orderBy` clause dynamically.

#### Scenario: Sort by firstName ascending

- **WHEN** `GET /customers?sortBy=firstName&sortOrder=asc` is called
- **THEN** the response `data` array is ordered alphabetically by `firstName` ascending

#### Scenario: Sort by createdAt descending (default)

- **WHEN** `GET /customers` is called without sort params
- **THEN** the response `data` array is ordered by `createdAt` descending

#### Scenario: Invalid sortBy value is rejected

- **WHEN** `GET /customers?sortBy=email` is called
- **THEN** the API returns 422

### Requirement: List response includes active work order count per customer

Each customer object in `GET /customers` SHALL include an `activeWorkOrderCount` field containing the number of work orders for that customer with status `DRAFT`, `CONFIRMED`, or `IN_PROGRESS`. The count MUST be computed via a single JOIN, not N separate queries.

#### Scenario: Customer with active work orders

- **WHEN** a customer has 2 work orders in `IN_PROGRESS` and 1 in `COMPLETED`
- **THEN** the `activeWorkOrderCount` for that customer is `2`

#### Scenario: Customer with no active work orders

- **WHEN** a customer has only `COMPLETED` or `CANCELLED` work orders
- **THEN** the `activeWorkOrderCount` for that customer is `0`
