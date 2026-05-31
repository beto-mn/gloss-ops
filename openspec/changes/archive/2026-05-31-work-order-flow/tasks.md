## 1. Schemas y tipos

- [x] 1.1 Extender `work-order.schema.ts` con tipos completos: `WorkOrderDetail`, `WorkOrderItem`, `WorkOrderAssignment`, `WorkOrderCheckpoint`, `CreateWorkOrderValues`, `UpdateWorkOrderValues`, `WorkOrderStatusTransition`
- [x] 1.2 Crear `src/lib/schemas/invoice.schema.ts` con tipos: `Invoice`, `CreateInvoiceValues`, `InvoiceStatus`
- [x] 1.3 Extender `src/lib/schemas/warranty.schema.ts` con el tipo completo de `Warranty` si aún no lo tiene

## 2. Hooks

- [x] 2.1 Extender `use-work-orders.ts`: agregar `useWorkOrder(id)`, `useCreateWorkOrder()`, `useUpdateWorkOrder()`, `useTransitionWorkOrderStatus()`, `useCancelWorkOrder()`, `useDeleteWorkOrder()` con invalidación correcta de cache
- [x] 2.2 Crear `use-work-order-assignments.ts`: `useWorkOrderAssignments(workOrderId)`, `useAssignTechnician(workOrderId)`, `useUnassignTechnician(workOrderId)`
- [x] 2.3 Crear `use-checkpoints.ts`: `useCheckpoints(workOrderId)`, `useCreateCheckpoint(workOrderId)`, `useUpdateCheckpoint(workOrderId)`, `useDeleteCheckpoint(workOrderId)`
- [x] 2.4 Extender (o crear) `use-warranties.ts` para incluir `useWorkOrderWarranties(workOrderId)`
- [x] 2.5 Crear `use-invoices.ts`: `useWorkOrderInvoice(workOrderId)`, `useCreateInvoice()`, `useTransitionInvoiceStatus()`

## 3. Lista de órdenes (`/work-orders`)

- [x] 3.1 Reemplazar placeholder en `work-orders/page.tsx` con tabla paginada usando `useWorkOrders` con tabs por status (Todas, Borrador, Confirmadas, En progreso, Completadas, Canceladas)
- [x] 3.2 Implementar búsqueda con debounce 300ms y paginación
- [x] 3.3 Implementar badges de status con colores: DRAFT=amarillo, CONFIRMED=azul, IN_PROGRESS=naranja, COMPLETED=verde, CANCELLED=gris
- [x] 3.4 Implementar menú de acciones por fila: "Ver detalle" (siempre), "Cancelar" (si no COMPLETED/CANCELLED y OWNER/MANAGER), "Eliminar" (DRAFT + OWNER) con diálogos de confirmación
- [x] 3.5 Agregar botón "Nueva orden" en el header que navega a `/work-orders/new`

## 4. Creación de orden (`/work-orders/new`)

- [x] 4.1 Crear `src/app/(dashboard)/work-orders/new/page.tsx` con breadcrumb y layout
- [x] 4.2 Implementar combobox de cliente con búsqueda (debounce), precarga y bloqueo desde `?customerId`
- [x] 4.3 Implementar combobox de activo dependiente del cliente seleccionado, precarga y bloqueo desde `?assetId`
- [x] 4.4 Implementar campos: tipo (STANDARD/WARRANTY_CLAIM), fecha programada (date picker), nota (textarea)
- [x] 4.5 Implementar tabla dinámica de items con `useFieldArray`: serviceId (combobox), quantity, unitPrice, note; botón "+ Agregar item" y trash por fila
- [x] 4.6 Mostrar subtotal por fila (quantity × unitPrice) y total de la orden calculados en tiempo real
- [x] 4.7 Implementar validación Zod: customerId requerido, assetId requerido, mínimo 1 item, quantity ≥ 1, unitPrice ≥ 0
- [x] 4.8 Al submit exitoso: redirigir a `/work-orders/[newId]` e invalidar `['work-orders']`
- [x] 4.9 Implementar botón "Cancelar" que navega a `/work-orders`

## 5. Detalle de orden (`/work-orders/[id]`)

- [x] 5.1 Crear `src/app/(dashboard)/work-orders/[id]/page.tsx` con breadcrumb "Órdenes de trabajo > [folio]"
- [x] 5.2 Implementar header: folio, status badge, botones de transición contextuales por status + rol con `useTransitionWorkOrderStatus()`
- [x] 5.3 Implementar sección "Información": folio, tipo, cliente (link), activo, fechas, nota; botón "Editar" visible solo en DRAFT para OWNER/MANAGER
- [x] 5.4 Implementar drawer de edición de orden (DRAFT únicamente): campos editables con `useUpdateWorkOrder()`
- [x] 5.5 Implementar tabla de items: Servicio, Cantidad, Precio unitario, Subtotal, Notas; total al pie
- [x] 5.6 Implementar sección "Técnicos asignados": lista de asignaciones con rol badge, selector + botón "Asignar" y trash (OWNER/MANAGER), usando `use-work-order-assignments.ts`
- [x] 5.7 Implementar sección "Checkpoints": lista con tipo (Recepción/Entrega) y notas; botón "Agregar checkpoint" con drawer (tipo, notas), editar y eliminar (OWNER/MANAGER), usando `use-checkpoints.ts`
- [x] 5.8 Implementar sección "Garantías generadas" visible solo si `status = COMPLETED`: lista con servicio, fechas, status badge, usando `useWorkOrderWarranties()`
- [x] 5.9 Implementar sección "Factura" visible solo si `status = COMPLETED`: si existe muestra folio y status; si no existe muestra botón "Crear factura" (OWNER/MANAGER) que abre drawer con subtotal, tax, total, usando `use-invoices.ts`

## 6. Integración con detalle de cliente

- [x] 6.1 Verificar que el botón "Nueva orden de trabajo" en `/customers/[id]` navega a `/work-orders/new?customerId=[id]`
- [x] 6.2 Verificar que el botón "Nueva orden" en filas de vehículos navega a `/work-orders/new?customerId=[id]&assetId=[vid]`
