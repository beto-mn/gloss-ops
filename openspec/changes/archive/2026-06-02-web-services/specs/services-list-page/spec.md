## ADDED Requirements

### Requirement: Página muestra tabla paginada del catálogo de servicios

La página `/services` SHALL renderizar una tabla con columnas: Nombre, Descripción, Precio (MXN formateado), Días de garantía, Status (badge) y columna de acciones. La tabla MUST paginar a 10 filas por página usando los parámetros `page` y `limit` de la API.

#### Scenario: Tabla carga y muestra servicios

- **WHEN** el usuario navega a `/services`
- **THEN** la página muestra un skeleton mientras carga y luego la tabla con los servicios de la organización

#### Scenario: Días de garantía cero muestra "Sin garantía"

- **WHEN** un servicio tiene `warrantyDays === 0`
- **THEN** la columna muestra el texto "Sin garantía" en lugar de "0 días"

---

### Requirement: Tabs de status filtran la lista

La página SHALL mostrar tres tabs: **Todos**, **Activos**, **Inactivos**. Seleccionar un tab actualiza la query con el parámetro `status` correspondiente (omitido para Todos, `ACTIVE` para Activos, `INACTIVE` para Inactivos).

#### Scenario: Tab Activos filtra solo servicios activos

- **WHEN** el usuario selecciona el tab "Activos"
- **THEN** la tabla solo muestra servicios con `status = ACTIVE`

#### Scenario: Tab Inactivos filtra solo servicios inactivos

- **WHEN** el usuario selecciona el tab "Inactivos"
- **THEN** la tabla solo muestra servicios con `status = INACTIVE`

---

### Requirement: Búsqueda con debounce de 300 ms

La página SHALL incluir un input de búsqueda que dispara la query al API con el parámetro `search` después de 300 ms de inactividad.

#### Scenario: Búsqueda filtra por nombre

- **WHEN** el usuario escribe en el input de búsqueda y espera 300 ms
- **THEN** la tabla se actualiza mostrando solo servicios cuyo nombre coincida con el término buscado

---

### Requirement: Badges de status con colores diferenciados

La página SHALL mostrar el status de cada servicio como un badge: ACTIVE = badge verde, INACTIVE = badge gris.

#### Scenario: Servicio activo muestra badge verde

- **WHEN** un servicio tiene `status = ACTIVE`
- **THEN** el badge muestra "Activo" con fondo verde

#### Scenario: Servicio inactivo muestra badge gris

- **WHEN** un servicio tiene `status = INACTIVE`
- **THEN** el badge muestra "Inactivo" con fondo gris (muted)

---

### Requirement: Botón "Nuevo servicio" abre el drawer de creación

El header de la página SHALL incluir un botón "Nuevo servicio" visible solo para roles OWNER y MANAGER. Al hacer clic abre el drawer de creación.

#### Scenario: OWNER ve el botón de creación

- **WHEN** un usuario con rol OWNER visita `/services`
- **THEN** el botón "Nuevo servicio" aparece en el header

#### Scenario: TECHNICIAN no ve el botón de creación

- **WHEN** un usuario con rol TECHNICIAN visita `/services`
- **THEN** el botón "Nuevo servicio" NO aparece en la página

---

### Requirement: Menú de acciones por fila con acciones contextuales por rol

Cada fila SHALL mostrar un menú dropdown con las siguientes acciones según rol y estado del servicio:

- **Editar**: visible para OWNER y MANAGER (siempre)
- **Desactivar**: visible para OWNER y MANAGER cuando `status = ACTIVE`
- **Activar**: visible para OWNER y MANAGER cuando `status = INACTIVE`
- **Eliminar**: visible solo para OWNER, con diálogo de confirmación

#### Scenario: OWNER ve todas las acciones sobre un servicio activo

- **WHEN** un OWNER abre el menú de un servicio con `status = ACTIVE`
- **THEN** el menú muestra: Editar, Desactivar, Eliminar

#### Scenario: MANAGER ve acciones limitadas

- **WHEN** un MANAGER abre el menú de cualquier servicio
- **THEN** el menú muestra Editar y la acción de ciclo de vida, pero NO Eliminar

#### Scenario: TECHNICIAN no ve el menú de acciones

- **WHEN** un TECHNICIAN visita `/services`
- **THEN** la columna de acciones no muestra ningún menú o botón

#### Scenario: Eliminar requiere confirmación

- **WHEN** un OWNER hace clic en "Eliminar"
- **THEN** aparece un diálogo de confirmación antes de ejecutar la acción

#### Scenario: Error 409 al eliminar muestra mensaje descriptivo

- **WHEN** la API devuelve 409 al intentar eliminar un servicio con referencias
- **THEN** se muestra un mensaje de error indicando que el servicio tiene órdenes de trabajo o garantías asociadas y no puede eliminarse
