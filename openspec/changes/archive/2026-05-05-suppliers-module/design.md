# Design: Suppliers Module

## Context

`Supplier` is a dependency-free catalog entry needed by both `InventoryModule` (to track which supplier provides each stock item) and `PurchaseOrdersModule` (to address orders to a vendor). The `supplier` table already existed in the schema with all required columns. One schema change was required: adding `@@unique([organizationId, name])` to reject duplicate supplier names at the database level.

The module is org-scoped (shared across all branches of an organization) and exposes 5 standard CRUD endpoints with no lifecycle toggle.

## Goals

- Expose 5 CRUD endpoints at `/suppliers`
- Enforce `(organizationId, name)` uniqueness; catch P2002 → 409
- Block hard deletion of suppliers referenced by Inventory or PurchaseOrder; catch P2003 → 409
- Support case-insensitive search across `name`, `contactName`, and `email`
- Export `SuppliersService` for use by `PurchaseOrdersModule`

## Non-Goals

- `isActive` toggle — suppliers are hard-deleted when no longer needed and unreferenced
- Supplier categories or tagging
- Supplier rating or evaluation
- Branch-level supplier restrictions
- Supplier portal or external access

## Decisions

**No activate/deactivate.** The schema has no `isActive` field. Suppliers that are no longer needed should either be deleted (if unreferenced) or left in place (if referenced). Adding an activation toggle would require a schema change and adds complexity without sufficient benefit at this stage.

**Name uniqueness at DB level.** `@@unique([organizationId, name])` is added to the schema. The repository catches P2002 on `supplier_organization_id_name_key` and rethrows as `ConflictException`. Same pattern as BrandsModule and ServicesModule — no extra pre-write round trip.

**Search across three fields.** `name`, `contactName`, and `email` are the three most likely fields a shop would use to look up a vendor. `phone` is excluded from search as it is less likely to be used as a search term.

## Risks / Trade-offs

- Without a soft-delete or isActive toggle, a supplier with no references must be permanently removed. If a shop deactivates a vendor relationship temporarily, they have no way to mark the supplier as inactive without deleting it. This is an accepted trade-off — the schema was designed without isActive and adding it later is straightforward if needed.
- FK protection depends on P2003 from Prisma. PurchaseOrder has a required FK on supplierId, so any purchase order will block deletion — this is the desired behavior.
