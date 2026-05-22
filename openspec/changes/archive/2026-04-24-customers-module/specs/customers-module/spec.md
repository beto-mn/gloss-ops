# Spec: customers-module

## ADDED Requirements

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
