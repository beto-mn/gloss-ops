## ADDED Requirements

### Requirement: Header muestra folio, status y botones de transición

La página `/work-orders/[id]` SHALL renderizar un breadcrumb "Órdenes de trabajo > [folio]", el status badge y los botones de transición disponibles para el status y rol actuales:

- DRAFT + OWNER/MANAGER: "Confirmar orden" (→ CONFIRMED), "Cancelar" (→ CANCELLED)
- CONFIRMED + OWNER/MANAGER/TECHNICIAN: "Iniciar trabajo" (→ IN_PROGRESS)
- CONFIRMED + OWNER/MANAGER: también "Cancelar" (→ CANCELLED)
- IN_PROGRESS + OWNER/MANAGER: "Completar orden" (→ COMPLETED), "Cancelar" (→ CANCELLED)
- COMPLETED o CANCELLED: sin botones de transición

Toda transición destructiva (Cancelar) abre un diálogo de confirmación antes de ejecutarse.

#### Scenario: DRAFT muestra "Confirmar orden"

- **WHEN** el usuario con rol MANAGER navega a una orden en DRAFT
- **THEN** el header muestra los botones "Confirmar orden" y "Cancelar"

#### Scenario: Confirmar orden cambia status

- **WHEN** el usuario hace click en "Confirmar orden"
- **THEN** el status cambia a CONFIRMED y el header se actualiza sin recargar la página

#### Scenario: TECHNICIAN no ve botones de transición en DRAFT

- **WHEN** un TECHNICIAN navega a una orden en DRAFT
- **THEN** el header no muestra ningún botón de transición

#### Scenario: Orden no encontrada

- **WHEN** el ID de la URL no existe en la organización
- **THEN** la página muestra un estado "No encontrado" con link a `/work-orders`

### Requirement: Sección de información general

La página SHALL mostrar una sección "Información" con: folio, tipo (badge), cliente (link a `/customers/[id]`), activo (tipo + marca/modelo + identificador), fecha programada, fecha de completado (si aplica), notas. Un botón "Editar" abre el drawer de edición solo si `status = DRAFT`.

#### Scenario: Link al cliente navega correctamente

- **WHEN** el usuario hace click en el nombre del cliente en la sección de información
- **THEN** el navegador navega a `/customers/[customerId]`

#### Scenario: Botón editar solo visible en DRAFT

- **WHEN** la orden está en status IN_PROGRESS
- **THEN** el botón "Editar" no aparece en la sección de información

### Requirement: Tabla de items de la orden

La página SHALL mostrar una tabla "Items" con columnas: Servicio, Cantidad, Precio unitario, Subtotal, Notas. Al pie de la tabla se muestra el Total de la orden.

#### Scenario: Tabla de items con datos

- **WHEN** la orden tiene 3 items
- **THEN** la tabla muestra 3 filas con los datos correctos y el total calculado

#### Scenario: Items vacíos

- **WHEN** la orden no tiene items
- **THEN** la sección muestra un estado vacío "Sin items"

### Requirement: Sección de asignaciones de técnicos

La página SHALL mostrar una sección "Técnicos asignados" con la lista de asignaciones (nombre, rol LEAD/ASSISTANT). OWNER y MANAGER pueden asignar técnicos via un selector y desasignarlos con el ícono trash. La sección está visible en todos los statuses excepto CANCELLED.

#### Scenario: Asignar técnico

- **WHEN** el usuario selecciona un técnico y hace click en "Asignar"
- **THEN** el técnico aparece en la lista de asignados

#### Scenario: Desasignar técnico con confirmación

- **WHEN** el usuario hace click en trash de un técnico asignado y confirma
- **THEN** el técnico es removido de la lista

#### Scenario: FRONT_DESK no puede asignar

- **WHEN** un FRONT_DESK navega al detalle de la orden
- **THEN** el selector de asignación no aparece, solo la lista de técnicos asignados

### Requirement: Sección de checkpoints del activo

La página SHALL mostrar una sección "Checkpoints" con los checkpoints de recepción y entrega. OWNER y MANAGER pueden crear checkpoints (tipo RECEPTION o DELIVERY, notas) y editar o eliminar los existentes. La sección está visible en todos los statuses excepto CANCELLED.

#### Scenario: Crear checkpoint de recepción

- **WHEN** el usuario hace click en "Agregar checkpoint", selecciona RECEPTION y guarda
- **THEN** el checkpoint aparece en la lista con tipo "Recepción" y fecha de creación

#### Scenario: Sin checkpoints

- **WHEN** la orden no tiene checkpoints
- **THEN** la sección muestra "Sin checkpoints registrados" con el botón de agregar visible para OWNER/MANAGER

### Requirement: Sección de garantías (solo COMPLETED)

La página SHALL mostrar una sección "Garantías generadas" únicamente cuando `status = COMPLETED`. Lista las garantías con: servicio, fecha de inicio, fecha de expiración, status (badge). Esta sección es de solo lectura.

#### Scenario: Garantías visibles al completar orden

- **WHEN** la orden pasa a COMPLETED y tiene servicios con garantía
- **THEN** la sección "Garantías generadas" aparece con la lista de garantías

#### Scenario: Sección oculta en órdenes no completadas

- **WHEN** la orden está en IN_PROGRESS
- **THEN** la sección de garantías no aparece en la página

### Requirement: Sección de factura (solo COMPLETED)

La página SHALL mostrar una sección "Factura" únicamente cuando `status = COMPLETED`. Si existe una factura, muestra folio, subtotal, impuesto, total y status (badge). Si no existe, muestra un botón "Crear factura" (disponible para OWNER y MANAGER) que abre un drawer de creación de factura con campos: subtotal, tax, total.

#### Scenario: Crear factura desde la orden completada

- **WHEN** el usuario hace click en "Crear factura", llena los campos y confirma
- **THEN** la factura es creada y la sección muestra los datos de la factura con status DRAFT

#### Scenario: Factura existente muestra folio

- **WHEN** la orden ya tiene una factura asociada
- **THEN** la sección muestra el folio `INV-YYYY-NNNN` y el status actual de la factura

#### Scenario: Sección de factura oculta en órdenes no completadas

- **WHEN** la orden está en CONFIRMED
- **THEN** la sección de factura no aparece en la página
