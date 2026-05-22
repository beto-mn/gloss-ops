# Design: Work Order Assignments

## Context

Work orders are branch-scoped entities. Before this change, there was no structured mechanism to track which organization members are responsible for a given job. The `WorkOrderAssignment` table existed in the schema but lacked a typed role field and had no API layer. This module adds the full NestJS layer and introduces the `AssignmentRole` enum to replace the previous freeform string field.

## Goals / Non-Goals

**Goals:**

- Expose POST, GET, and DELETE endpoints under `/work-orders/:workOrderId/assignments`
- Enforce role-based access: OWNER and MANAGER can write; all roles can read
- Validate work order status before write (reject COMPLETED/CANCELLED)
- Validate org membership of the assignee before write
- Prevent duplicate `(workOrderId, memberId)` pairs
- Record an activity log entry on every successful assignment
- Replace `WorkOrderAssignment.role: String` with `AssignmentRole` enum (`LEAD`, `ASSISTANT`)

**Non-Goals:**

- Re-validating work order status on unassignment (OWNER/MANAGER can unassign regardless of WO state)
- Notifications or webhooks on assignment events
- Assignment history or audit beyond the activity log

## Decisions

- **`WorkOrderAssignmentsModule` imports `WorkOrdersModule`** — work order ownership and status validation is delegated to `WorkOrdersService.findOne()` rather than re-implementing it in this module, keeping concerns separated
- **`existsMemberInOrg` lives in the repository** — the repository owns the DB layer and is permitted to cross-check `OrganizationMember` without going through a separate module, avoiding unnecessary coupling
- **No status re-validation on DELETE** — the business decision was that managers should always be able to unassign, even if the WO is complete, because correcting historical assignments outweighs the protection

## Risks / Trade-offs

- **Cross-table query in repository** — `existsMemberInOrg` queries `OrganizationMember` inside the assignments repository. This is a deliberate trade-off: it avoids importing `OrganizationsModule` or `MembersModule` but couples the repository to a table outside its primary domain.
- **`WorkOrdersModule` circular risk** — if `WorkOrdersModule` ever needed to import `WorkOrderAssignmentsModule`, a circular dependency would occur. The current dependency is strictly one-directional.
