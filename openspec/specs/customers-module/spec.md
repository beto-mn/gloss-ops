# Spec: customers-module

## Purpose

Defines the requirements for the `customers-module` capability in GlossOps.

## Requirements

### Requirement: All customer queries are scoped to the caller's organization

Every repository method MUST accept `organizationId` and filter results by it. A customer belonging to a different org MUST be treated as not found.

#### Scenario: Cross-org isolation on findById

- **WHEN** `findById` is called with an `id` that exists but belongs to a different `organizationId`
- **THEN** the method returns `null`

#### Scenario: List returns only own org's customers

- **WHEN** `findAll` is called for org A
- **THEN** only customers whose `organizationId` matches org A are returned

---

### Requirement: Email uniqueness is enforced per organization before create and update

The service SHALL call `findByEmail` before `create` and before `update` and throw `ConflictException` when the email is already used by another customer in the same org.

#### Scenario: Create with duplicate email

- **WHEN** a customer with the same email already exists in the org
- **THEN** the API returns `409` with `{ error: 'email_already_exists' }`

#### Scenario: Update — email change conflicts with another customer

- **WHEN** an update sets an email that is already used by a different customer in the same org
- **THEN** the API returns `409` with `{ error: 'email_already_exists' }`

---

### Requirement: Phone uniqueness is enforced per organization before create and update

The service SHALL call `findByPhone` before `create` and before `update` and throw `ConflictException` when the phone is already used by another customer in the same org.

#### Scenario: Create with duplicate phone

- **WHEN** a customer with the same phone already exists in the org
- **THEN** the API returns `409` with `{ error: 'phone_already_exists' }`

---

### Requirement: List supports text search and pagination

`GET /customers` MUST accept optional `search`, `page`, and `limit` query parameters and return a `CustomerPage` with `data` and `meta`.

#### Scenario: Text search across name, email, phone

- **WHEN** `GET /customers?search=ana` is called
- **THEN** the response includes customers whose `firstName+lastName` (concatenated), `email`, or `phone` match the search term case-insensitively

#### Scenario: Pagination meta is accurate

- **WHEN** `GET /customers?page=2&limit=10` is called and there are 25 customers in the org
- **THEN** `meta.total` is `25`, `meta.totalPages` is `3`, `meta.hasNext` is `true`, `meta.hasPrev` is `true`

---

### Requirement: Delete is restricted to OWNER and MANAGER roles

`DELETE /customers/:id` MUST require `OWNER` or `MANAGER` role and return `204` on success.

#### Scenario: Technician cannot delete

- **WHEN** a `TECHNICIAN` sends `DELETE /customers/:id`
- **THEN** the API returns `403` with `{ error: 'insufficient_role' }`

#### Scenario: Customer not found

- **WHEN** `DELETE /customers/:id` is called with an id that does not exist in the org
- **THEN** the API returns `404` with `{ error: 'customer_not_found' }`

---

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

---

### Requirement: List response includes active work order count per customer

Each customer object in `GET /customers` SHALL include an `activeWorkOrderCount` field containing the number of work orders for that customer with status `DRAFT`, `CONFIRMED`, or `IN_PROGRESS`. The count MUST be computed via a single JOIN, not N separate queries.

#### Scenario: Customer with active work orders

- **WHEN** a customer has 2 work orders in `IN_PROGRESS` and 1 in `COMPLETED`
- **THEN** the `activeWorkOrderCount` for that customer is `2`

#### Scenario: Customer with no active work orders

- **WHEN** a customer has only `COMPLETED` or `CANCELLED` work orders
- **THEN** the `activeWorkOrderCount` for that customer is `0`
