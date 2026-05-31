## ADDED Requirements

### Requirement: Página muestra tabla paginada de órdenes de trabajo

La página `/work-orders` SHALL renderizar una tabla con columnas: Folio, Cliente, Activo, Tipo, Fecha programada, Status (badge) y acciones. La tabla MUST paginar con los parámetros `page` y `limit` de la API.

#### Scenario: Tabla muestra órdenes activas

- **WHEN** el usuario navega a `/work-orders`
- **THEN** se muestra una tabla de órdenes con las columnas correctas y el tab "Todas" seleccionado

#### Scenario: Sin órdenes

- **WHEN** la organización no tiene órdenes de trabajo
- **THEN** la tabla muestra un estado vacío con el mensaje "No hay órdenes de trabajo"

#### Scenario: Badge de status con color contextual

- **WHEN** una orden tiene status `IN_PROGRESS`
- **THEN** el badge muestra "En progreso" con color naranja; `COMPLETED` muestra "Completada" en verde; `CANCELLED` en gris; `DRAFT` en amarillo; `CONFIRMED` en azul

### Requirement: Tabs filtran por status

La página SHALL tener tabs: "Todas", "Borrador", "Confirmadas", "En progreso", "Completadas", "Canceladas". Cada tab filtra por el status correspondiente via `?status=` en la API.

#### Scenario: Tab "En progreso" filtra correctamente

- **WHEN** el usuario hace click en el tab "En progreso"
- **THEN** la tabla recarga mostrando solo órdenes con `status = IN_PROGRESS`

#### Scenario: Cambiar de tab resetea la paginación

- **WHEN** el usuario está en la página 3 y cambia de tab
- **THEN** la paginación regresa a la página 1

### Requirement: Búsqueda filtra por folio o nombre de cliente

La página SHALL incluir un input de búsqueda con debounce de 300ms que pasa `?search=` a la API.

#### Scenario: Búsqueda por folio

- **WHEN** el usuario escribe "WO-2024" en el buscador
- **THEN** la tabla muestra solo órdenes cuyo folio coincida

#### Scenario: Búsqueda vacía muestra todas

- **WHEN** el usuario borra el texto del buscador
- **THEN** la tabla muestra todas las órdenes del tab activo

### Requirement: Botón "Nueva orden" abre la página de creación

El header de la página SHALL tener un botón "Nueva orden" que navega a `/work-orders/new`.

#### Scenario: Click en "Nueva orden"

- **WHEN** el usuario hace click en "Nueva orden"
- **THEN** el navegador va a `/work-orders/new`

### Requirement: Acciones por fila según status y rol

Cada fila SHALL tener un menú de acciones contextual:

- "Ver detalle" — siempre disponible, navega a `/work-orders/[id]`
- "Editar" — solo si `status = DRAFT` y rol es OWNER o MANAGER
- "Cancelar" — si status no es COMPLETED ni CANCELLED, y rol es OWNER o MANAGER; abre diálogo de confirmación
- "Eliminar" — solo si `status = DRAFT` y rol es OWNER; abre diálogo de confirmación

#### Scenario: Ver detalle navega a la página correcta

- **WHEN** el usuario hace click en "Ver detalle" de la fila con id `abc`
- **THEN** el navegador navega a `/work-orders/abc`

#### Scenario: Cancelar orden con confirmación

- **WHEN** el usuario hace click en "Cancelar" y confirma el diálogo
- **THEN** la orden pasa a status `CANCELLED` y la tabla se refresca

#### Scenario: Eliminar borrador con confirmación

- **WHEN** un OWNER hace click en "Eliminar" en una orden DRAFT y confirma
- **THEN** la orden es eliminada permanentemente y la tabla se refresca

#### Scenario: Acciones de edición ocultas para TECHNICIAN/FRONT_DESK

- **WHEN** un TECHNICIAN abre el menú de acciones de una orden
- **THEN** solo "Ver detalle" es visible
