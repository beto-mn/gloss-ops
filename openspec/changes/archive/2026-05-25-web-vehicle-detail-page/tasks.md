## 1. Schema types

- [x] 1.1 Create `src/lib/schemas/warranty.schema.ts` — export `Warranty` interface with fields: `id`, `workOrderItemId`, `serviceId`, `description`, `term`, `validFrom`, `validUntil`, `isVoid`, `voidReason`, `createdAt`
- [x] 1.2 Create `src/lib/schemas/work-order.schema.ts` — export minimal `WorkOrder` interface with fields: `id`, `folio`, `status` (`WorkOrderStatus` union), `type` (`WorkOrderType` union), `createdAt`, `completedAt`; export `WorkOrderStatus` and `WorkOrderType` string-union types matching the Prisma enums

## 2. Hooks

- [x] 2.1 Add `useAsset(id: string)` to `src/hooks/use-customer-assets.ts` — `useQuery` calling `GET /customer-assets/:id`, `queryKey: ['customer-assets', id]`, `enabled: !!id`
- [x] 2.2 Create `src/hooks/use-warranties.ts` — export `useAssetWarranties(assetId: string)` calling `GET /customer-assets/:assetId/warranties`; `queryKey: ['warranties', 'asset', assetId]`; `enabled: !!assetId`
- [x] 2.3 Create `src/hooks/use-work-orders.ts` — export `useWorkOrders({ assetId }: { assetId?: string })` building query string `?assetId=...` and calling `GET /work-orders`; `queryKey: ['work-orders', { assetId }]`; `enabled: !!assetId`

## 3. Make vehicle rows clickable

- [x] 3.1 In `src/app/(dashboard)/customers/[id]/page.tsx`, add `cursor-pointer` to the `<tr>` className and `onClick={() => router.push(\`/customers/${id}/vehicles/${asset.id}\`)}`— the click handler must call`e.stopPropagation()` inside the dropdown cell so the dropdown trigger does not also fire navigation

## 4. Vehicle detail page

- [x] 4.1 Create route directory `src/app/(dashboard)/customers/[id]/vehicles/[vid]/` and `page.tsx` — client component; read `params.id` and `params.vid`; run all four queries in parallel (`useCustomer`, `useAsset`, `useAssetWarranties`, `useWorkOrders`)
- [x] 4.2 Implement skeleton loading state — show skeleton blocks for breadcrumb, header, info section, and both tables while any query is pending
- [x] 4.3 Implement cross-customer guard — after asset resolves, if `asset.customerId !== params.id` OR asset fetch returns 404, render not-found state with "Volver a clientes" link pointing to `/customers`
- [x] 4.4 Implement breadcrumb — `Clientes` → `[customer.firstName] [customer.lastName]` → `[model] [year?]`; each segment uses `<Link>` except the last
- [x] 4.5 Implement page header — display vehicle title (`[brand] [model] [year?]`); three buttons: "Nueva orden" (navigates to `/work-orders/new?customerId=:id&assetId=:vid`), "Editar" (opens `VehicleDrawer` in edit mode), "Eliminar" (opens `AlertDialog`)
- [x] 4.6 Wire "Eliminar" button — on confirm call `useDeleteAsset(params.id)` with `params.vid`; on success navigate to `/customers/:id`; show disabled state while `deleteAsset.isPending`
- [x] 4.7 Wire "Editar" button — open `VehicleDrawer` passing `asset` as the `asset` prop and `customerId={params.id}`; on drawer close reset the edit state
- [x] 4.8 Implement vehicle info section — responsive grid (`sm:grid-cols-2 lg:grid-cols-3`) with `<Field>` components for: tipo de activo, tipo personalizado (only when `assetType === OTHER`), marca (`brandId` — display as raw ID until a brands hook exists), modelo, año, identificador, país, color, notas
- [x] 4.9 Implement warranties section — table with columns: descripción, vigencia (`validFrom` – `validUntil`), término, estado (badge); derive badge from `isVoid` and `validUntil`; show empty state "Sin garantías registradas" when array is empty
- [x] 4.10 Implement work-order history section — table with columns: folio, estado (badge), tipo, fecha creación; each row links to `/work-orders/[id]`; show empty state "Sin órdenes de trabajo" when array is empty; apply status badge colors per spec

## 5. Invalidation

- [x] 5.1 In `useDeleteAsset` (`use-customer-assets.ts`), the existing `onSuccess` already invalidates `[ASSETS_KEY, customerId]` — verify this also covers the `useAsset(id)` query (same key prefix); if not, add invalidation of `['customer-assets', id]` in the mutation
