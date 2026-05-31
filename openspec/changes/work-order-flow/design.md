## Context

El backend de órdenes de trabajo está 100% completo. El frontend tiene un placeholder en `/work-orders` y hooks mínimos. Se necesita construir el flujo completo: lista, creación, detalle y transiciones.

La página de detalle de cliente ya tiene un botón "Nueva orden de trabajo" que navega a `/work-orders/new?customerId=X` (o `&assetId=Y`). Ese contrato ya está fijado en el spec de `customer-detail-page`.

## Goals / Non-Goals

**Goals:**

- Lista de órdenes con filtros por status, búsqueda y paginación
- Página de creación (`/work-orders/new`) con selección de cliente/activo, tipo, items y fecha
- Página de detalle (`/work-orders/[id]`) con header, info, items, asignaciones, checkpoints, garantías y factura
- Transiciones de status contextuales según el rol y estado actual
- Edición de órdenes en DRAFT

**Non-Goals:**

- Timbrado CFDI / integración con PAC (marcado como futuro en el backend)
- Generación de PDF de factura
- Upload de fotos en checkpoints (photoUrls se envía como strings pero no hay UI de upload)
- Notificaciones push o email

## Decisions

### Creación como página, no drawer

La creación es un formulario complejo: cliente (combobox con búsqueda), activo (combobox dependiente), tipo, fecha, nota, y tabla dinámica de items (servicio, cantidad, precio). Un drawer sería demasiado estrecho.

**Alternativa descartada**: Drawer multi-step. Descartada por complejidad de navegación y pérdida de estado al cerrar accidentalmente.

**Decisión**: Página dedicada `/work-orders/new`. Si viene con `?customerId` y/o `?assetId`, los comboboxes se precargan y bloquean.

### Estado global de items con `useFieldArray`

La tabla de items (agregar/eliminar filas dinámicamente) se maneja con `useFieldArray` de React Hook Form. Cada fila tiene `serviceId`, `quantity`, `unitPrice`, `note`.

**Alternativa descartada**: Estado local con `useState`. Descartada porque pierde integración con validación de Zod y submit del formulario.

### Secciones del detalle cargadas en paralelo

El detalle hace múltiples queries independientes: work order, assignments, checkpoints, warranties (solo si COMPLETED), invoice (solo si COMPLETED). Se usan `enabled` flags en TanStack Query para evitar requests innecesarios.

### Transiciones de status como botones contextuales en el header

Cada status expone solo las acciones válidas para el rol actual:

- DRAFT: "Confirmar" (→ CONFIRMED), "Cancelar" (→ CANCELLED) — solo OWNER/MANAGER
- CONFIRMED: "Iniciar trabajo" (→ IN_PROGRESS) — OWNER/MANAGER/TECHNICIAN
- IN_PROGRESS: "Completar" (→ COMPLETED) — OWNER/MANAGER
- COMPLETED: ninguna transición disponible
- CANCELLED: ninguna transición disponible

### Hooks separados por dominio

En lugar de un solo `use-work-orders.ts` enorme, se crean hooks especializados:

- `use-work-orders.ts` — lista y mutations de la orden (crear, actualizar, cambiar status, eliminar)
- `use-work-order-assignments.ts` — asignaciones de técnicos
- `use-checkpoints.ts` — checkpoints de activo

Las warranties usan el hook existente `use-warranties.ts`.

## Risks / Trade-offs

- [Combobox de clientes con búsqueda] Si la org tiene miles de clientes, buscar en el combobox puede ser lento → Mitigación: debounce de 300ms + `limit=20` en la query
- [Items dinámicos] El precio unitario puede desincronizarse si el usuario edita el servicio después de fijar el precio → Mitigación: cuando cambia el `serviceId`, se resetea `unitPrice` a vacío para forzar entrada manual
- [Checkpoints con fotos] El campo `photoUrls` existe en la API pero no hay UI de upload en este alcance → Mitigación: campo oculto, se puede extender en iteración futura
