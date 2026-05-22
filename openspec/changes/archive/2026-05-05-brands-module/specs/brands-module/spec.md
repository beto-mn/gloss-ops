# Spec: brands-module

## ADDED Requirements

### Requirement: Global and org-specific brand tiers

The system SHALL maintain two tiers of brands: global seeded brands (organizationId = null, isSeeded = true) visible to all organizations, and org-specific brands owned by each organization.

#### Scenario: Read endpoints return both tiers merged

- **WHEN** a caller requests `GET /brands` or `GET /brands/:id`
- **THEN** the response includes both org-specific brands for the caller's org and all globally seeded brands, ordered by name ASC

#### Scenario: Write endpoints are restricted to org-specific brands

- **WHEN** a caller attempts to PATCH or DELETE a seeded brand
- **THEN** the system returns HTTP 403 with `{ error: 'brand_is_seeded' }`

---

### Requirement: Slug uniqueness per organization

The system SHALL enforce uniqueness of `(organizationId, slug)` at the database level via a unique constraint.

#### Scenario: Duplicate slug within same org is rejected

- **WHEN** a caller creates or updates a brand with a slug that already exists in their organization
- **THEN** the system returns HTTP 409 with `{ error: 'slug_already_exists' }`

#### Scenario: Same slug allowed across different orgs

- **WHEN** two different organizations each create a brand with the same slug
- **THEN** both succeed and each brand is scoped to its respective organization

---

### Requirement: FK protection on brand deletion

The system SHALL block deletion of a brand that is referenced by any CustomerAsset or Inventory record.

#### Scenario: Brand with references cannot be deleted

- **WHEN** a caller attempts to DELETE a brand that has CustomerAsset or Inventory references
- **THEN** the system returns HTTP 409 with `{ error: 'brand_has_references' }`

#### Scenario: Brand with no references can be deleted

- **WHEN** a caller with OWNER role attempts to DELETE an org-specific brand with no references
- **THEN** the system returns HTTP 204 and the brand is removed

---

### Requirement: RBAC enforcement per endpoint

The system SHALL restrict write operations to authorized roles.

#### Scenario: Only OWNER and MANAGER can create and update brands

- **WHEN** a caller with TECHNICIAN or FRONT_DESK role attempts POST or PATCH on `/brands`
- **THEN** the system returns HTTP 403

#### Scenario: Only OWNER can delete brands

- **WHEN** a caller with MANAGER role attempts DELETE on `/brands/:id`
- **THEN** the system returns HTTP 403

---

### Requirement: Org-scoped brand visibility

The system SHALL return 404 for any brand that does not belong to the caller's organization and is not globally seeded.

#### Scenario: Brand from another org returns 404

- **WHEN** a caller requests `GET /brands/:id` for a brand owned by a different organization
- **THEN** the system returns HTTP 404 with `{ error: 'brand_not_found' }`

---

### Requirement: Filterable brand listing

The system SHALL support filtering brands by name search and category, with pagination.

#### Scenario: Search filters by name case-insensitively

- **WHEN** a caller requests `GET /brands?search=avery`
- **THEN** the response includes only brands whose name contains "avery" (case-insensitive)

#### Scenario: Category filter returns exact matches

- **WHEN** a caller requests `GET /brands?category=vinyl`
- **THEN** the response includes only brands with category equal to "vinyl"
