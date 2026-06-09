# 🗄️ GlossOps — Database Design Document

**Role:** Senior DBA  
**Status:** MVP — April 2026  
**Engine:** PostgreSQL 16+  
**ORM:** Prisma

---

## 1. 🧠 Design Philosophy

Every decision in this schema follows three principles:

1. **Correctness over convenience.** If a constraint can be enforced at the database level, it is. Application bugs happen. Direct SQL access happens. The database is the last line of defense.
2. **Derive, don't duplicate.** A field that can be derived via a FK chain is not stored twice — unless query frequency explicitly justifies the denormalization, and that exception is documented.
3. **History is immutable.** Any field that affects money, legal documents, or customer-facing records is snapshotted at the moment it is used. Future changes to a catalog never corrupt historical records.

---

## 2. 🏗️ Scope Hierarchy

The entire data model is organized around a strict scope hierarchy:

```
global         → brand (system-seeded catalogs, no organizationId)
organization   → customer, customer_asset, service, supplier
branch         → organization_member, work_order, inventory, purchase_order
```

**Why this matters:**

A business (organization) can have multiple physical locations (branches). Operational data — who works where, what stock each location has, which jobs are open — is scoped to the branch. Commercial data — who the customers are, what services are offered, who the suppliers are — is shared across all branches of the same organization.

This design means a customer registered at branch CDMX is immediately visible at branch MTY without any data duplication. A technician's access, however, is restricted to their assigned branch.

**The derivation rule:**

`organizationId` is never stored in branch-scoped tables. It is always derived:

```
organization_member.branchId → branch.organizationId
work_order.branchId          → branch.organizationId
inventory.branchId           → branch.organizationId
```

The only exceptions are tables that are explicitly org-scoped and need `organizationId` as their primary scope key (`customer`, `service`, `supplier`, etc.), and `activity_log` which denormalizes it for query performance (see Section 7).

---

## 3. 📐 Naming Conventions

All identifiers follow snake_case at the database level:

| Layer        | Convention            | Example                                      |
| ------------ | --------------------- | -------------------------------------------- |
| Table names  | `snake_case` singular | `work_order`, `customer_asset`               |
| Column names | `snake_case`          | `organization_id`, `created_at`, `is_active` |
| Enum names   | `snake_case`          | `work_order_status`, `inventory_type`        |
| Enum values  | `UPPER_SNAKE_CASE`    | `WARRANTY_CLAIM`, `IN_PROGRESS`              |

In the Prisma schema, models and fields use PascalCase/camelCase (Prisma convention). The mapping to snake_case is handled transparently by `@@map()` on every model and `@map()` on every multi-word field. Application code always uses camelCase (`workOrder.totalAmount`), the database always stores snake_case (`total_amount`).

---

## 4. 🔑 Key Design Decisions

### 3.1 `account` instead of `user`

`USER` is a reserved keyword in PostgreSQL. Using it as a table name causes unpredictable behavior depending on the driver version and query context. The table is named `account` — it represents a login identity, which is semantically accurate.

### 3.2 Every organization has at least one branch

The `organization_member` table has no `organizationId` — only `branchId`. This is valid because the system enforces that every organization has at least one branch. The organization is always reachable via `branch.organizationId`. This simplifies RBAC: all permission checks start from the branch the member belongs to.

Branches are peers — there is no `is_main` flag or hierarchy. The first branch is auto-created on org registration with the organization name; subsequent branches are added through the branches CRUD. Inviting a member is an explicit choice: the inviter must select which branch the invitee joins by passing `branchId` in the invitation request.

### 3.3 Customers and assets are org-scoped, not branch-scoped

A customer belongs to the organization, not to a specific branch. The same applies to their assets. This is intentional — a customer who brings their car to branch CDMX one month and branch MTY the next is the same customer with the same asset history. No re-registration, no data duplication.

### 3.4 `work_order` does not store `customerId`

The customer is derived via `work_order.assetId → customer_asset.customerId`. Storing `customerId` directly on `work_order` would be redundant and a potential source of inconsistency if the data ever diverged. The join is a single hop and is always correct.

### 3.5 Multi-technician support via `work_order_assignment`

A work order can involve multiple technicians. Rather than a single `assignedToId` FK, a separate `work_order_assignment` table handles this with a `role` field (`lead` | `assistant`). This supports:

- Productivity reporting per technician
- Correct attribution on service notes and warranties (lead technician)
- Future commission calculations

### 3.6 `WARRANTY_CLAIM` is a separate work order type

When a customer invokes a warranty, a new `work_order` is created with `type = WARRANTY_CLAIM` and `warrantyClaimId` pointing to the original warranty. The original work order and warranty are never modified. This preserves the integrity of the original transaction and creates a clean audit trail of the claim.

### 3.7 Warranty configuration lives on `service`, not on `warranty`

Warranty terms depend on the service type — a ceramic coating warranty is different from a detail warranty. `service.warrantyDays`, `service.warrantyDescription`, and `service.warrantyTerm` define the policy. When a work order completes, the system auto-generates a `warranty` record per qualifying `work_order_item`, copying those fields as snapshots. Future changes to the service config do not alter existing warranties.

### 3.8 Inventory uses class table inheritance

Two types of inventory exist with fundamentally different fields:

- `inventory_item` — discrete units or measured quantities (stock, sku, unit)
- `material_roll` — roll-format materials tracked by remaining length (series, finish, color, width, remainingLength, lotNumber)

A single `inventory` base table holds the common fields (`branchId`, `supplierId`, `brandId`, `name`, `unitCost`, `type`). Each extension table shares the same `id` as its base record (1-to-1 FK).

This pattern was chosen over a single wide table with nullable columns because:

- A roll will never have `sku` or `unit`. An item will never have `remainingLength` or `lotNumber`. Nullable columns that are structurally impossible are a schema smell.
- Adding a new inventory type in the future requires only a new enum value and a new extension table — `inventory_usage` and `purchase_order_item` do not change.

The trade-off is that reading full inventory requires two LEFT JOINs. This is an accepted cost for schema correctness and extensibility.

### 3.9 Snapshot fields for fiscal and pricing data

The following fields are snapshotted at the moment they are used, not referenced via FK:

| Table             | Snapshotted fields                                                                            | Why                                                                                                           |
| ----------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `work_order_item` | `unitPrice`                                                                                   | Service prices change — job history must reflect what was charged                                             |
| `work_order_item` | `discount`                                                                                    | Discount agreed at job creation — not a catalog value                                                         |
| `invoice`         | `customerTaxId`, `customerName`, `customerAddress`, `customerZipCode`, `customerFiscalRegime` | CFDI 4.0 requires the receptor data at issuance — updating RFC later cannot alter a stamped invoice           |
| `invoice`         | `taxRate`                                                                                     | IVA rate is set by law but can change — historical invoices must reflect the rate in effect at the time       |
| `warranty`        | `description`, `term`                                                                         | Service warranty config can change — issued warranties must reflect what was promised                         |
| `inventory_usage` | `costAtUsage`                                                                                 | Inventory costs change with every purchase order — job profitability must use the cost at time of consumption |

### 3.10 Purchase orders are scoped to branch, suppliers to organization

A supplier relationship is a commercial agreement at the business level — all branches can buy from the same supplier. But a purchase order is a physical delivery to a specific location. Scoping purchase orders to branch prevents mixing stock across locations and gives each branch independent purchasing control.

---

## 5. 🔒 Constraints and Enforcement

All cross-table constraints are documented in `docs/database/constraints.md`. The general strategy is two-layer enforcement:

1. **Application layer (NestJS):** Validate before writing. Returns a human-readable error to the client.
2. **Database layer (PostgreSQL trigger):** Last line of defense. Rejects any write that bypasses the application — direct SQL, migrations, scripts.

Current constraints:

| Rule   | Description                                                                         |
| ------ | ----------------------------------------------------------------------------------- |
| Rule 1 | `WARRANTY_CLAIM` work orders cannot generate an invoice                             |
| Rule 2 | `WARRANTY_CLAIM` work orders must reference a valid, non-void, non-expired warranty |

Branch consistency for `inventory_usage` (the consumed inventory must belong to the same branch as the work order) is enforced at the application layer only — a trigger would require a cross-table lookup on every usage insert and is not justified for the MVP.

---

## 6. ⚡ Indexes — Current State

Indexes defined in the schema:

| Table                 | Index                                | Purpose                                                                                          |
| --------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `brand`               | `(organizationId, slug)` unique      | Slug uniqueness per scope                                                                        |
| `organization`        | `slug` unique                        | URL-safe org identifier                                                                          |
| `organization_member` | `(accountId, branchId)` unique       | One role per account per branch                                                                  |
| `asset_checkpoint`    | `(workOrderId, type)` unique         | One reception and one delivery per work order                                                    |
| `inventory_item`      | SKU uniqueness enforced at app layer | branchId lives on base `inventory` table — cross-table unique index not possible in standard SQL |

**⚠️ Missing indexes that should be added before production:**

| Table             | Index                              | Query it serves                             |
| ----------------- | ---------------------------------- | ------------------------------------------- |
| `activity_log`    | `(entity, entityId)`               | "Show all history for this work order"      |
| `activity_log`    | `(organizationId, createdAt DESC)` | Organization-level audit feed               |
| `work_order`      | `(branchId, status)`               | "Show all open work orders for this branch" |
| `inventory`       | `(branchId, type)`                 | "Show all inventory for this branch"        |
| `inventory_usage` | `(workOrderId)`                    | "Show all materials used in this job"       |
| `customer`        | `(organizationId, email)`          | Customer lookup by email                    |
| `purchase_order`  | `(branchId, status)`               | "Show all pending orders for this branch"   |

These will be added as part of the Prisma schema implementation.

---

## 7. 🚧 What is Intentionally Out of Scope (MVP)

The following were discussed and deliberately excluded from the MVP. Each has a note on what it would require to add.

### 6.1 Supplier fiscal data (RFC, bank account, payment terms)

**Why excluded:** Not needed for operations. Required for accounts payable and tax deductibility.  
**To add:** New fields on `supplier` — `taxId`, `bankAccount`, `paymentTerms`, `fiscalRegime`. No structural changes needed.

### 6.2 Technician commissions

**Why excluded:** Commission structures vary widely per business. Premature to model.  
**To add:** A `commission_rule` table linked to `service` or `organization_member`, plus a `commission_record` table populated when a work order completes.

### 6.3 Inventory expiration dates

**Why excluded:** Relevant for primers, coatings, and consumables with shelf life — but not universal.  
**To add:** `expiresAt` field on `inventory_item`. Add a scheduled job to alert on approaching expiry.

### 6.4 Inventory location within branch (bin/shelf)

**Why excluded:** Most shops at this scale don't need bin-level tracking.  
**To add:** `location` field on `inventory` base table. Simple text field — "Shelf A3", "Cabinet 2".

### 6.5 Multi-currency support

**Why excluded:** All amounts are stored as `Decimal` without currency code. Assumes a single currency per organization.  
**To add:** `currency` field on `organization`. All monetary fields already use `Decimal` — no type changes needed. Exchange rate logic would live in the application layer.

### 6.6 Customer portal / public-facing documents

**Why excluded:** Out of scope for the operational MVP.  
**To add:** No schema changes needed for read-only access. A signed URL strategy for `asset_checkpoint.photo`, `customerSignatureUrl`, and CFDI XML would need to be defined.

### 6.7 Stripe / payment processing

**Why excluded:** Payments are tracked via `invoice.status` (PAID) but no payment method or transaction ID is stored.  
**To add:** `payment` table with `invoiceId`, `amount`, `method`, `externalId` (Stripe charge ID), `paidAt`.

### 6.8 Automated low stock reordering

**Why excluded:** `inventory_item.lowStockAlert` is the foundation but the trigger mechanism is not built.  
**To add:** A scheduled job that queries `inventory_item WHERE stock < lowStockAlert` and creates a `DRAFT` purchase order or sends a notification.

---

## 8. 📈 Performance Considerations

### 7.1 `activity_log` will be the largest table

Every significant operation writes to `activity_log`. At scale this table grows faster than any other. Mitigation strategies when needed:

- **Partitioning by `createdAt`** — PostgreSQL declarative partitioning by month or quarter. Queries filtered by date range hit only the relevant partition.
- **Archival policy** — rows older than N years moved to cold storage (S3 + Parquet). The operational system only needs recent history online.
- **Separate read replica** — audit queries should never compete with operational writes.

### 7.2 `inventory_usage` — cost aggregation queries

`SUM(costAtUsage * quantityUsed) GROUP BY workOrderId` will be a frequent query for profitability dashboards. A materialized view refreshed on a schedule (or on each `inventory_usage` insert) would eliminate the repeated aggregation.

### 7.3 The `inventory` CTI double JOIN

Reading full inventory (`inventory` + `inventory_item` or `material_roll`) always requires two LEFT JOINs. For branch-level stock screens this is acceptable. For org-wide consolidated inventory reports across many branches, consider a materialized view that pre-joins and filters by `inventory.type`.

### 7.4 `invoice` folio sequence

`invoice.folio` is sequential per **branch**, format `INV-{YYYY}-{NNNN}` (e.g. `INV-2026-0001`). The sequence is tracked by the `invoice_counter` table (`branchId PK`, `lastSeq INT`). Each invoice creation upserts the counter row with `lastSeq = lastSeq + 1` inside a `$transaction`, which acquires a row-level lock and prevents duplicate folios under concurrent requests. The counter is monotonic — it never resets annually.

### 7.5 CFDI XML storage

`invoice.cfdiXml` stores the full XML string in the database. For a small volume this is acceptable. At scale, move the XML to S3 and store only the S3 key in the database — same pattern used for photos and signatures elsewhere in the schema.

---

## 9. 📦 Future Inventory Types

The class table inheritance pattern on `inventory` was chosen precisely to support this. To add a new inventory type:

1. Add a new value to the `inventory_type` enum (Prisma migration)
2. Create a new extension table with `id` as a 1-to-1 FK to `inventory`
3. Update application logic to handle the new type in `inventory_usage` and `purchase_order_item`

`inventory_usage` and `purchase_order_item` do not require schema changes.

Example future types:

- `liquid_container` — coating sold by volume with expiration date
- `gas_canister` — pressurized gas tracked by pressure/weight
- `precut_panel` — pre-cut vinyl panels with fixed dimensions

---

## 10. 🛡️ Multi-Tenancy Security Checklist

Every query in the application must be validated against this checklist:

- [ ] All `SELECT` queries include `organizationId` or `branchId` in the `WHERE` clause
- [ ] `branchId` is extracted from the JWT, never from the request body
- [ ] `organizationId` is always derived from `branchId` server-side — never trusted from the client
- [ ] Cross-tenant access is structurally impossible — no query can return rows from a different organization
- [ ] `activity_log` entries always include the `organizationId` of the actor

A single missing `organizationId` filter is a data leak. All Prisma queries in the API must go through a service layer that enforces tenant scope before executing.
