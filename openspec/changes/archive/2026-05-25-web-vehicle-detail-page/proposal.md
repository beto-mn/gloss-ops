## Why

The customer detail page shows a vehicle table but rows lead nowhere — there is no drill-down to a single vehicle. A dedicated vehicle page is the natural home for the data that matters most in a wrap/detailing shop: the asset's full work history and active warranties.

## What Changes

- Make vehicle rows in `/customers/[id]` clickable — navigate to `/customers/[id]/vehicles/[vid]`.
- New page `/customers/[id]/vehicles/[vid]` — vehicle header with all asset fields, edit/delete/new-work-order actions, a warranties section, and a work-order history table.
- Add `useAsset(id)` hook to `use-customer-assets.ts` — `GET /customer-assets/:id`.
- New `use-warranties.ts` hook file with `useAssetWarranties(assetId)` — `GET /customer-assets/:assetId/warranties`.
- New `use-work-orders.ts` hook file with `useWorkOrders({ assetId })` — `GET /work-orders?assetId=vid` (read-only subset; will be expanded in the work-orders page change).
- New schema files: `src/lib/schemas/warranty.schema.ts` and `src/lib/schemas/work-order.schema.ts` (minimal types for read display).

No API changes required — all endpoints already exist.

## Capabilities

### New Capabilities

- `vehicle-detail-page`: Web page `/customers/[id]/vehicles/[vid]` — vehicle info, warranties, work-order history, edit/delete/new-order actions.

### Modified Capabilities

- `customer-assets-module`: Vehicle table rows in the customer detail page become clickable (navigation only — no behavior change to the API or mutations).

## Impact

- **`apps/web/src/app/(dashboard)/customers/[id]/page.tsx`** — add `cursor-pointer` + `onClick` to vehicle `<tr>` rows.
- **`apps/web/src/app/(dashboard)/customers/[id]/vehicles/[vid]/page.tsx`** — new route.
- **`apps/web/src/hooks/use-customer-assets.ts`** — add `useAsset(id)`.
- **`apps/web/src/hooks/use-warranties.ts`** — new file.
- **`apps/web/src/hooks/use-work-orders.ts`** — new file (minimal).
- **`apps/web/src/lib/schemas/warranty.schema.ts`** — new file.
- **`apps/web/src/lib/schemas/work-order.schema.ts`** — new file (minimal).
- No new npm dependencies required.
