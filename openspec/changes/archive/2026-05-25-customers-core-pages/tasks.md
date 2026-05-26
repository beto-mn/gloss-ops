## 1. Database — Rename ResourceStatus.DELETED → INACTIVE

- [x] 1.1 Update `packages/database/prisma/schema.prisma`: rename enum value `DELETED` to `INACTIVE` in `ResourceStatus`
- [x] 1.2 Run `prisma migrate dev --name rename-resource-status-deleted-to-inactive` and verify the generated SQL uses `ALTER TYPE "ResourceStatus" RENAME VALUE 'DELETED' TO 'INACTIVE'`
- [x] 1.3 Run `prisma generate` to regenerate the Prisma client

## 2. API — Mechanical rename of ResourceStatus.DELETED across all modules

- [x] 2.1 Find-replace `ResourceStatus.DELETED` → `ResourceStatus.INACTIVE` in all files under `apps/api/src/` (customers, customer-assets, branches, services, organizations, work-orders, and any other references)
- [x] 2.2 Run `pnpm --filter api test` — all 596 tests must pass before proceeding

## 3. API — Customers: sort params

- [x] 3.1 Add `sortBy: 'firstName' | 'lastName' | 'createdAt'` and `sortOrder: 'asc' | 'desc'` to `ListCustomersDto` with class-validator decorators and Swagger annotations; defaults `createdAt` / `desc`
- [x] 3.2 Add `sortBy` and `sortOrder` fields to `CustomerQuery` interface in `interfaces/customer.repository.interface.ts`
- [x] 3.3 Update `PrismaCustomerRepository.findAll` to build `orderBy` dynamically from `query.sortBy` / `query.sortOrder`
- [x] 3.4 Update `InMemoryCustomerRepository.findAll` to sort the in-memory array before slicing
- [x] 3.5 Add tests for sort in `customers.controller.spec.ts` and `in-memory-customer.repository.spec.ts`

## 4. API — Customers: activeWorkOrderCount in list response

- [x] 4.1 Define `CustomerWithCount` type (extends `Prisma.CustomerModel` adding `activeWorkOrderCount: number`) in `interfaces/customer.repository.interface.ts`; update `CustomerPage.data` to `CustomerWithCount[]`
- [x] 4.2 Update `PrismaCustomerRepository.findAll` to include `_count: { select: { workOrders: { where: { status: { in: ['DRAFT','CONFIRMED','IN_PROGRESS'] } } } } }` in `findMany` and map the result to `CustomerWithCount`
- [x] 4.3 Update `InMemoryCustomerRepository.findAll` to return `activeWorkOrderCount: 0` for each customer (in-memory store has no work orders)
- [x] 4.4 Update `CustomersService.findAll` return type to `CustomerPage` (already `CustomerPage`, just verify `data` type flows through)
- [x] 4.5 Add tests covering `activeWorkOrderCount` in `customers.service.spec.ts`

## 5. Web — Shared schemas and API hooks for customers

- [x] 5.1 Create `src/lib/schemas/customer.schema.ts` with Zod schemas for `CreateCustomerSchema` and `UpdateCustomerSchema`; export inferred types
- [x] 5.2 Create `src/hooks/use-customers.ts` with `useCustomers(params)`, `useCustomer(id)`, `useCreateCustomer()`, `useUpdateCustomer()`, `useArchiveCustomer()`, `useDeleteCustomer()` hooks using TanStack Query

## 6. Web — Shared schemas and API hooks for customer assets

- [x] 6.1 Create `src/lib/schemas/customer-asset.schema.ts` with Zod schemas for `CreateVehicleSchema` and `UpdateVehicleSchema`
- [x] 6.2 Create `src/hooks/use-customer-assets.ts` with `useCustomerAssets(customerId)`, `useCreateAsset()`, `useUpdateAsset()`, `useDeleteAsset()` hooks

## 7. Web — CustomerDrawer component

- [x] 7.1 Create `src/components/customers/customer-drawer.tsx` — shared drawer for create and edit modes; accepts optional `customer` prop; uses React Hook Form + Zod; calls `useCreateCustomer` or `useUpdateCustomer` depending on mode
- [x] 7.2 Create `src/components/customers/customer-drawer.stories.tsx` with create and edit story variants

## 8. Web — VehicleDrawer component

- [x] 8.1 Create `src/components/customers/vehicle-drawer.tsx` — shared drawer for create and edit modes for `CustomerAsset`; accepts optional `asset` prop; uses React Hook Form + Zod
- [x] 8.2 Create `src/components/customers/vehicle-drawer.stories.tsx` with create and edit story variants

## 9. Web — /customers list page

- [x] 9.1 Build `src/app/(dashboard)/customers/page.tsx`: tabs (Activos/Archivados), search input with debounce, sort selector, "Nuevo cliente" button, paginated table
- [x] 9.2 Implement table columns: Nombre completo, Teléfono, Email, Registrado el, badge "Orden activa" (`activeWorkOrderCount > 0`)
- [x] 9.3 Implement row actions: Editar (opens `CustomerDrawer` in edit mode), Archivar (soft delete with confirmation) in Activos tab; Eliminar (hard delete with confirmation, Owner-only) in Archivados tab
- [x] 9.4 Implement empty state for both tabs
- [x] 9.5 Verify row click navigates to `/customers/[id]` (click on row body, not action buttons)

## 10. Web — /customers/[id] detail page

- [x] 10.1 Build `src/app/(dashboard)/customers/[id]/page.tsx`: breadcrumb "Clientes > [Nombre]", customer info section with "Editar" button, "Nueva orden de trabajo" button in header
- [x] 10.2 Customer info section: display all fields (nombre, email, teléfono, dirección, RFC, régimen, CP, fuente, notas); "Editar" opens `CustomerDrawer` in edit mode
- [x] 10.3 "Nueva orden de trabajo" header button navigates to `/work-orders/new?customerId=[id]`
- [x] 10.4 Build vehicles table: columns tipo, marca/modelo, año, placa/identificador; "Agregar vehículo" button opens `VehicleDrawer` in create mode
- [x] 10.5 Vehicle row actions: "Editar" opens `VehicleDrawer` in edit mode; "Nueva orden" navigates to `/work-orders/new?customerId=[id]&assetId=[vehicleId]`; "Eliminar" opens confirmation dialog then calls hard delete
- [x] 10.6 Implement not-found state (customer ID not in org)
- [x] 10.7 Implement empty vehicles state with "Agregar vehículo" prompt

## 11. Web — Responsividad

- [x] 11.1 Wrap the customers table in `src/app/(dashboard)/customers/page.tsx` with `overflow-x-auto` to prevent horizontal scroll on mobile
- [x] 11.2 Hide low-priority columns on small screens in the customers table: ocultar "Email" y "Registrado el" en móvil (`hidden sm:table-cell`), mostrar solo Nombre, Teléfono y badge
- [x] 11.3 Wrap the vehicles table in `src/app/(dashboard)/customers/[id]/page.tsx` with `overflow-x-auto`
- [x] 11.4 Hide low-priority columns on small screens in the vehicles table: ocultar "Año" e "Identificador" en móvil (`hidden sm:table-cell`), mostrar solo Tipo y Marca/Modelo

## 13. Web — Brand picker visual en VehicleDrawer

- [x] 13.1 Crear `src/components/ui/brand-picker.tsx` — Dialog con búsqueda + grid de cards; cada card muestra inicial + nombre; acepta `logoUrl?` en las opciones para futura integración
- [x] 13.2 Actualizar `vehicle-drawer.tsx`: reemplazar `<Combobox>` del campo Marca por `<BrandPicker>`; trigger muestra nombre de la marca seleccionada o placeholder
- [x] 13.3 Campo País: reemplazar `<Input maxLength={2}>` por `<Combobox>` con 22 países de Latinoamérica + Norteamérica; MX primero, resto A-Z; almacena código ISO-2

## 12. Web — Reactivar cliente (OWNER / MANAGER only)

- [x] 12.1 API: add `restore(id, organizationId)` to `CustomerRepositoryInterface`; implement in `PrismaCustomerRepository` and `InMemoryCustomerRepository`; add `CustomersService.restore()`; add `PATCH /customers/:id/restore` endpoint with `@Roles(Role.OWNER, Role.MANAGER)`
- [x] 12.2 Web: store user role in localStorage (`gloss_user_role`) after login/register via `storeOrgAfterAuth`; also set it in `RequireAuth` on page refresh; add `getUserRole()` / `setUserRole()` to `api-client.ts`; clear on logout
- [x] 12.3 Web: add `useReactivateCustomer()` hook calling `PATCH /customers/:id/restore`; show "Reactivar" (RotateCcw icon) in Inactivos tab row actions only when role is OWNER or MANAGER; confirmation AlertDialog before mutation
