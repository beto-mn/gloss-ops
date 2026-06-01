## Why

El flujo de órdenes de trabajo es el core operativo de GlossOps: los talleres crean, asignan, ejecutan y cierran trabajos desde esta pantalla. Actualmente la página `/work-orders` muestra un placeholder; sin este flujo los usuarios no pueden operar el sistema.

## What Changes

- **Nueva**: Lista de órdenes de trabajo con filtros por status, búsqueda, paginación y acciones por fila
- **Nueva**: Drawer para crear una orden (disparado desde lista y desde detalle de cliente)
- **Nueva**: Página de detalle `/work-orders/[id]` con header de folio/status, info general, tabla de items, sección de asignaciones, checkpoints de recepción/entrega, garantías (post-COMPLETED) y factura (post-COMPLETED)
- **Nueva**: Flujo de edición para órdenes en DRAFT
- **Nueva**: Transiciones de status contextuales (DRAFT→CONFIRMED→IN_PROGRESS→COMPLETED, any→CANCELLED)
- **Extiende**: Hook `use-work-orders.ts` con mutaciones y queries faltantes
- **Extiende**: Schema `work-order.schema.ts` con tipos completos (items, assignments, checkpoints, warranties, invoice)

## Capabilities

### New Capabilities

- `work-order-list-page`: Lista paginada de órdenes con tabs por status, búsqueda, dropdown de acciones (ver, editar, cancelar, eliminar)
- `work-order-create`: Drawer de creación con selección de cliente/activo, tipo (STANDARD/WARRANTY_CLAIM), fecha programada, nota e items (servicio + cantidad + precio)
- `work-order-detail-page`: Página de detalle con toda la información operativa de la orden: header con folio, status badge y botones de transición; sección de info; tabla de items; gestión de asignaciones de técnicos; checkpoints de activo; garantías generadas; factura

### Modified Capabilities

- `work-orders-module`: Ningún cambio de contrato en la API — solo se consumen endpoints existentes desde el frontend

## Impact

- `apps/web/src/app/(dashboard)/work-orders/page.tsx` — reemplazar placeholder
- `apps/web/src/app/(dashboard)/work-orders/[id]/page.tsx` — nueva
- `apps/web/src/components/work-orders/` — nuevos componentes (drawer, items table, assignment section, checkpoint section, warranties section, invoice section)
- `apps/web/src/hooks/use-work-orders.ts` — extender con todas las mutaciones
- `apps/web/src/hooks/use-work-order-assignments.ts` — nuevo
- `apps/web/src/hooks/use-checkpoints.ts` — nuevo
- `apps/web/src/lib/schemas/work-order.schema.ts` — extender con tipos completos
- `apps/web/src/app/(dashboard)/customers/[id]/page.tsx` — conectar botón "crear orden" existente al nuevo drawer
