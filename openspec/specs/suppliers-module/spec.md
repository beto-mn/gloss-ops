# Spec: suppliers-module

## Purpose

Defines the requirements for the `suppliers-module` capability in GlossOps.

## Requirements

### Requirement: Name uniqueness per organization

The system SHALL enforce uniqueness of `(organizationId, name)` at the database level via a unique constraint, so duplicate supplier names within the same organization are rejected without an extra pre-write query.

#### Scenario: Duplicate name within same org is rejected

- **WHEN** a caller creates or updates a supplier with a name that already exists in their organization
- **THEN** the system returns HTTP 409 with `{ error: 'name_already_exists' }`

#### Scenario: Same name allowed across different orgs

- **WHEN** two different organizations each create a supplier with the same name
- **THEN** both succeed and each supplier is scoped to its respective organization

---

### Requirement: FK protection on supplier deletion

The system SHALL block hard deletion of a supplier that is referenced by any Inventory item or PurchaseOrder.

#### Scenario: Supplier with Inventory references cannot be deleted

- **WHEN** a caller attempts to DELETE a supplier that has Inventory references
- **THEN** the system returns HTTP 409 with `{ error: 'supplier_has_references' }`

#### Scenario: Supplier with PurchaseOrder references cannot be deleted

- **WHEN** a caller attempts to DELETE a supplier that has PurchaseOrder references
- **THEN** the system returns HTTP 409 with `{ error: 'supplier_has_references' }`

#### Scenario: Supplier with no references can be deleted

- **WHEN** a caller with OWNER role attempts to DELETE a supplier with no Inventory or PurchaseOrder references
- **THEN** the system returns HTTP 204 and the supplier is removed

---

### Requirement: No isActive toggle

The system SHALL NOT provide activate/deactivate endpoints for suppliers. Suppliers MUST be either active records or hard-deleted when unreferenced.

#### Scenario: Supplier remains in listing until deleted

- **WHEN** a caller lists suppliers via `GET /suppliers`
- **THEN** all suppliers for the organization are returned regardless of usage status

---

### Requirement: Multi-field search

The system SHALL support case-insensitive search across `name`, `contactName`, and `email` fields simultaneously.

#### Scenario: Search matches across all three fields

- **WHEN** a caller requests `GET /suppliers?search=avery`
- **THEN** the response includes suppliers where name, contactName, or email contains "avery" (case-insensitive)

---

### Requirement: RBAC enforcement per endpoint

The system SHALL restrict write operations to authorized roles.

#### Scenario: Only OWNER and MANAGER can create and update suppliers

- **WHEN** a caller with TECHNICIAN or FRONT_DESK role attempts POST or PATCH on `/suppliers`
- **THEN** the system returns HTTP 403

#### Scenario: Only OWNER can delete suppliers

- **WHEN** a caller with MANAGER role attempts DELETE on `/suppliers/:id`
- **THEN** the system returns HTTP 403

---

### Requirement: Org-scoped supplier visibility

The system SHALL return 404 uniformly for suppliers that do not belong to the caller's organization.

#### Scenario: Supplier from another org returns 404

- **WHEN** a caller requests `GET /suppliers/:id` for a supplier owned by a different organization
- **THEN** the system returns HTTP 404 with `{ error: 'supplier_not_found' }`
