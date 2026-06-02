## 1. Schema y tipos

- [x] 1.1 Extender `service.schema.ts`: agregar `ServiceListParams` (status?, search?, page?, limit?), `createServiceSchema` y `updateServiceSchema` con Zod, exportar `CreateServiceValues` y `UpdateServiceValues`

## 2. Hooks

- [x] 2.1 Refactorizar `useServices(params = {})` para aceptar `ServiceListParams` y construir la query string dinámicamente (compatible con callers existentes que llaman sin args)
- [x] 2.2 Agregar `useService(id)` para obtener un servicio por ID
- [x] 2.3 Agregar `useCreateService()` con invalidación de `['services']`
- [x] 2.4 Agregar `useUpdateService()` con invalidación de `['services']` y `['services', id]`
- [x] 2.5 Agregar `useActivateService()` con invalidación de `['services']`
- [x] 2.6 Agregar `useDeactivateService()` con invalidación de `['services']`
- [x] 2.7 Agregar `useDeleteService()` con invalidación de `['services']`

## 3. Drawer de creación/edición (`ServiceDrawer`)

- [x] 3.1 Crear `src/components/services/service-drawer.tsx` con Sheet, campos: Nombre, Descripción (textarea), Precio, Días de garantía, Clave Prod/Serv SAT, Clave Unidad SAT
- [x] 3.2 Implementar validación Zod: nombre requerido, precio ≥ 0, warrantyDays entero ≥ 0, claves SAT opcionales solo alfanumérico (≤15 y ≤10 chars respectivamente)
- [x] 3.3 En modo edición (prop `service` presente): precargar campos con `useEffect` + `form.reset()`
- [x] 3.4 Capturar error 409 `name_already_exists` y mostrar error a nivel de campo en el input Nombre
- [x] 3.5 Al submit exitoso: cerrar drawer e invalidar cache

## 4. Página de lista (`/services`)

- [x] 4.1 Reemplazar placeholder en `services/page.tsx` con layout completo: header con título "Servicios" y botón "Nuevo servicio" (solo OWNER/MANAGER), tabs Todos/Activos/Inactivos, input de búsqueda con debounce 300 ms, tabla paginada
- [x] 4.2 Implementar tabla con columnas: Nombre, Descripción, Precio (formatCurrency), Días de garantía (0 → "Sin garantía", N → "N días"), Status (badge), Acciones
- [x] 4.3 Implementar badges: ACTIVE = verde, INACTIVE = gris (muted)
- [x] 4.4 Implementar menú de acciones por fila: "Editar" (OWNER/MANAGER), "Activar"/"Desactivar" según status (OWNER/MANAGER), "Eliminar" con confirmación (OWNER únicamente)
- [x] 4.5 Implementar diálogo de confirmación para Eliminar (AlertDialog de Radix)
- [x] 4.6 Capturar error 409 en Eliminar y mostrar mensaje "El servicio tiene órdenes de trabajo o garantías asociadas y no puede eliminarse"
- [x] 4.7 Implementar paginación (10 por página) con botones Anterior/Siguiente
