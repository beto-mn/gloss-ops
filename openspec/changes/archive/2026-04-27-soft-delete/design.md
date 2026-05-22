# Design: Soft Delete & Hard Delete

## Context

The `customers` and `organizations` modules had CRUD operations but no deletion path. Permanently removing a row on every delete would destroy audit history and make accidental deletions unrecoverable. A soft-delete pattern was chosen so deleted records are hidden from all queries but remain in the database. A hard-delete option was added exclusively for Owners to permanently clean up records when necessary.

## Goals

- Add `status: ACTIVE | DELETED` to `Customer` and `Organization` via a shared Prisma enum
- All read methods (`findById`, `findAll`, `findByEmail`, `findByPhone`) return only `ACTIVE` records
- `DELETE /:id` soft-deletes by default; `DELETE /:id?permanent=true` hard-deletes (Owner only)
- No `?includeDeleted=true` query param — deleted records are fully hidden from callers

## Non-Goals

- Exposing deleted records to non-Owner roles
- A restore endpoint for soft-deleted records
- Extending soft-delete to modules other than `customers` and `organizations` in this change

## Decisions

- **Single shared enum `ResourceStatus`** rather than per-model booleans — reused across all future modules that need the same pattern, keeping the schema consistent.
- **Role check in the controller, not the service** — the controller already has `AuthContext` with `role`, so enforcing Owner-only for `permanent=true` there avoids threading the role into the service layer.
- **`softDelete` as a separate repository method** rather than an overloaded `delete` — keeps the intent explicit and makes it impossible to accidentally hard-delete when a soft-delete was intended.
- **`delete` operates without a status filter** — an Owner must be able to permanently clean up a previously soft-deleted record without first restoring it.

## Risks / Trade-offs

- No `?includeDeleted` option means Owners cannot audit deleted records via the API in this version — acceptable for MVP, easy to add later.
- Controllers enforce the Owner-only permanent-delete rule directly (not via a dedicated guard) — consistent with the existing pattern in the codebase but slightly more duplication if this pattern is needed in many more controllers.
