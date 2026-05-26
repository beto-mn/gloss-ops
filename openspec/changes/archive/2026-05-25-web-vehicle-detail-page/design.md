## Context

The customer detail page (`/customers/[id]`) already renders a vehicle table with full CRUD actions. Each row has hover styles but no navigation — there is no way to drill into a single vehicle. This change adds that drill-down, with the vehicle page serving as the hub for the asset's work history and warranties.

All required API endpoints already exist:

- `GET /customer-assets/:id` — asset detail
- `GET /customer-assets/:assetId/warranties` — warranties for an asset
- `GET /work-orders?assetId=vid` — work orders filtered by asset

This is a web-only change. No API modifications are needed.

## Goals / Non-Goals

**Goals:**

- Add `/customers/[id]/vehicles/[vid]` as a clickable destination from the vehicle table.
- Show vehicle fields, warranties, and work-order history on that page.
- Provide edit/delete/new-work-order actions consistent with the existing customer detail page.

**Non-Goals:**

- Warranty void action — that belongs to a future warranties management change.
- Work order detail navigation — `/work-orders/[id]` is not built yet; links will exist but lead to a "Próximamente" placeholder. Consistent with the pattern used in `customers-core-pages`.
- Paginating the warranties or work orders lists — both collections are small enough per vehicle to render fully.
- Any API changes.

## Decisions

### 1. Route: `/customers/[id]/vehicles/[vid]` (nested under customer)

**Decision**: Keep the vehicle under the customer path segment rather than a flat `/vehicles/[id]`.

**Alternatives considered**:

- Flat `/vehicles/[id]` — simpler URL but loses breadcrumb context (`Clientes → [name]`). Also requires an extra fetch to resolve the customer name.
- Nested (chosen) — `[id]` is already in the URL; the customer is fetched as part of the breadcrumb. Consistent with how the API nests creation: `POST /customers/:customerId/assets`.

### 2. Warranty status derived client-side, not from the API

**Decision**: The `Warranty` model has `isVoid` (boolean) and `validUntil` (datetime). Status is derived:

- `isVoid === true` → **Anulada** (red)
- `validUntil < now` → **Vencida** (amber)
- else → **Vigente** (green)

The API does not return a pre-computed status field; deriving it client-side is accurate and avoids a server round-trip.

**Risk**: Clock skew between client and server. Acceptable — a warranty expiring within minutes of page load is an edge case.

### 3. Minimal `WorkOrder` type — expanded in the work-orders change

**Decision**: Define a `WorkOrder` interface in `src/lib/schemas/work-order.schema.ts` with only the fields the vehicle detail page needs: `id`, `status`, `type`, `createdAt`, `completedAt`. The work-orders page change will expand this schema without breaking this page.

**Alternatives considered**:

- Wait for the work-orders page change to define the schema — blocks this feature unnecessarily.
- Define a full schema now — premature; the API response shape will be driven by the work-orders page requirements.

### 4. Cross-customer access guard in the page

**Decision**: After fetching the asset, verify `asset.customerId === params.id`. If not, render the not-found state. This prevents `/customers/other-id/vehicles/[vid]` from silently showing a vehicle belonging to a different customer (even though both belong to the same org).

The API itself does not enforce this at `GET /customer-assets/:id` — it only checks org scope. The page adds the extra guard.

### 5. `useWorkOrders` hook scoped to this change only

**Decision**: Create `src/hooks/use-work-orders.ts` with a single exported function `useWorkOrders({ assetId })`. The hook builds the query string and calls `GET /work-orders`. The work-orders page change will add `useCreateWorkOrder`, `useUpdateWorkOrder`, etc. to this same file.

**No collision risk**: the vehicle detail page only reads; it does not mutate work orders.

### 6. Work order `folio` field

The API returns a `folio` field on work orders (e.g., `WO-2025-0042`). Include it in the `WorkOrder` interface and display it as the primary identifier in the history table, since it is more meaningful than the raw UUID.

## Risks / Trade-offs

- **`/work-orders/[id]` not yet built** → Work order rows will link to a non-existent route. Acceptable — same tradeoff as the "Nueva orden" button in `customers-core-pages`. The link is semantically correct; the destination is pending.
- **`useWorkOrders` minimal scope** → If the work-orders page change lands before this one and defines a conflicting hook shape, a small merge is needed. Low probability; both changes are sequential.
- **No warranty pagination** → If a vehicle accumulates hundreds of warranties over years this becomes a long list. Deferred — the typical vehicle has 1–5 warranties.
