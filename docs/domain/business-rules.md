# Business Rules

> Key domain rules that are enforced at the application layer. Rules that span multiple tables are also documented in `docs/database/constraints.md`.

## Organizations & Membership

- An account may belong to a maximum of **5 organizations** simultaneously (enforced on invitation accept).
- An organization always has at least one branch — the first is auto-created on registration, carrying the organization name.
- Branches are **peers**: there is no `isMain` flag and no hierarchy. All branches have equal standing.
- An invitation must include an explicit `branchId` chosen by the inviter — it is never inferred from context.
- Role is stored in `OrganizationMember.role`, not on `Account`. The same account can have different roles in different organizations.

## Work Orders

### Status machine

```
DRAFT → QUOTED → CONFIRMED → IN_PROGRESS → COMPLETED → DELIVERED
              ↘ CANCELLED (from any state)
```

- Transitioning to `COMPLETED` triggers automatic **warranty generation** for every `WorkOrderItem` linked to a `Service` with `warrantyDays > 0`.
- A `WARRANTY_CLAIM` work order can only be created if `WarrantyService.validateClaim()` confirms the warranty is still active.

### Assignments

- A technician may hold the role `LEAD` or `ASSISTANT` on a work order.
- Only `OWNER` and `MANAGER` can assign or unassign technicians.

## Invoices

### Status machine

```
DRAFT → ISSUED → PAID
  ↘ CANCELLED (from any state)
```

- Transition `DRAFT → ISSUED` requires the associated work order to be in `COMPLETED` status.
- Folio format: `INV-{YYYY}-{NNNN}` — monotonically increasing per branch, never reused.
- CFDI fields are stored but timbrado (PAC integration) is a future milestone.

## Warranties

- A warranty is **auto-generated**, never manually created.
- Generated when a work order transitions to `COMPLETED`, one warranty per `WorkOrderItem` where `service.warrantyDays > 0`.
- A warranty can be `voided` by `OWNER` or `MANAGER` at any time.
- `validateClaim()` returns `true` only if the warranty exists, is not voided, and its expiry date (`issuedAt + warrantyDays`) is in the future.

## Inventory

- `InventoryItem` and `MaterialRoll` both extend the base `Inventory` table via class table inheritance (1-to-1 FK on `id`).
- `MaterialRoll` tracks `remainingLength` which decreases on each `InventoryUsage`.
- Usage is always linked to a `WorkOrder` — inventory cannot be consumed outside a work order context.

## Purchase Orders

### Status machine

```
PENDING → PARTIAL → RECEIVED
        ↘ CANCELLED
```

- `receive` transitions the PO to `PARTIAL` if not all items are received, or `RECEIVED` if complete.
- A cancelled PO cannot be modified.

## Activity Log

- The `ActivityLog` table is **append-only** — entries are never updated or deleted.
- Every significant operational event (status transitions, assignments, inventory usage) must produce an `ActivityLog` entry.
- The log is scoped to a branch — cross-branch querying is not supported.
