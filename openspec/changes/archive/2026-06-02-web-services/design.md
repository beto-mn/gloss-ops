## Context

The services module API is complete. The frontend has a placeholder page and a minimal hook used only to populate comboboxes in the work order create flow. Shop managers need a dedicated screen to maintain their price list without going to the API directly.

## Goals / Non-Goals

**Goals:**

- Full CRUD UI for services at `/services`
- Activate/deactivate lifecycle exposed as row actions
- RBAC enforcement in the UI (hide destructive actions from TECHNICIAN/FRONT_DESK)
- Create/edit in a drawer so the user never leaves the list context

**Non-Goals:**

- Detail page for a single service (drawer covers the read/edit use case)
- Bulk operations (activate all, delete all)
- Inventory or material-roll integration (separate feature)

## Decisions

### 1. Extend `use-services.ts` instead of creating a new file

The hook already exists for the combobox use case. Adding mutations and a parameterized list query to the same file avoids splitting service-related cache keys across two modules. The existing `useServices()` signature changes to accept params, which is a minor breaking change limited to `work-orders/new/page.tsx` (the only caller — it passes no args so the default `{}` keeps it working).

### 2. Single `ServiceDrawer` for create and edit

Create and edit share the same fields and validation schema. A single drawer component receives an optional `service` prop — when present it pre-fills for edit, when absent it's a create form. This mirrors the pattern used in CustomerDrawer and WorkOrderEditDrawer.

### 3. Activate/Deactivate as row action, not a toggle

API uses explicit `/activate` and `/deactivate` endpoints (not a PATCH on `isActive`). The UI exposes this as a contextual row action: "Desactivar" for ACTIVE services, "Activar" for INACTIVE ones. No inline toggle switch to avoid accidental clicks.

### 4. Status filter via tabs, not dropdown

Consistent with the work orders list page: tabs for Todos / Activos / Inactivos. The API `status` param maps directly (ACTIVE, INACTIVE; omit for all).

### 5. `warrantyDays = 0` means no warranty

The form shows `0` as the default and no separate checkbox. The table shows "Sin garantía" when `warrantyDays === 0`, otherwise `N días`.

## Risks / Trade-offs

- **409 on delete (service has references)** → Show a toast/error message instead of a generic failure. The API returns `{ error: 'service_has_references' }` which the UI translates to a user-friendly message.
- **Name collision on create/edit** → API returns 409 with `{ error: 'name_already_exists' }`. The drawer catches this and sets a field-level error on the name input.
- **Existing `useServices()` callers** → Only `work-orders/new/page.tsx` calls it without params. Changing the signature to `useServices(params = {})` is backwards-compatible.
