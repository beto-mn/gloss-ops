# Design: Asset Checkpoints Module

## Context

`AssetCheckpoint` is scoped to a `WorkOrder`, which is branch-scoped. A work order can have at most two checkpoints — one RECEPTION (vehicle arrives) and one DELIVERY (vehicle returned). Ownership is verified by resolving the WO through `account.organizationId`. `AssetCheckpointsModule` imports `WorkOrdersModule`, which must export `WorkOrdersService` for injection into the checkpoints service. All write endpoints are nested under `/work-orders/:workOrderId/checkpoints`.

## Goals

- CRUD for asset checkpoints scoped to work orders
- Status-based creation guards (blocked on CANCELLED, RECEPTION blocked on COMPLETED)
- Duplicate type prevention per work order
- Correct `recordedById` tracking from JWT

## Non-Goals

- Photo upload (URLs are passed in as strings; actual file hosting is out of scope)
- Signature capture UI
- Checkpoint history or versioning
- Activity logging for checkpoint events (deferred)
- Status re-validation on update or delete (admin correction is allowed)

## Decisions

**`AssetCheckpointsModule` imports `WorkOrdersModule`:** Rather than duplicating WO lookup logic or creating a shared utility, the module reuses `WorkOrdersService.findOne()` for ownership validation. `WorkOrdersModule` was updated to export `WorkOrdersService`.

**No `ListAssetCheckpointsDto`:** A work order has at most 2 checkpoints; the list endpoint returns a plain array without pagination overhead.

**`type` is immutable after creation:** Changing a checkpoint's type would lose semantic meaning (RECEPTION vs DELIVERY). The `UpdateAssetCheckpointDto` intentionally omits the `type` field.

**No status re-validation on PATCH/DELETE:** OWNER and MANAGER are trusted to correct erroneous checkpoint data regardless of WO state. This avoids blocking admin corrections on terminal orders.

## Risks / Trade-offs

**Circular import risk between `AssetCheckpointsModule` and `WorkOrdersModule`:** Mitigated by the import direction being one-way (checkpoints → work-orders only). `WorkOrdersModule` does not import `AssetCheckpointsModule`.

**Photo URLs are not validated against storage:** The `IsUrl` validator only checks URL format. Invalid or expired URLs will be stored without error.
