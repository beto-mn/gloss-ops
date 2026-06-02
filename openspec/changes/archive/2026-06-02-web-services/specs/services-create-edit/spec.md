## ADDED Requirements

### Requirement: Drawer único para crear y editar servicios

El sistema SHALL usar un componente `ServiceDrawer` (Sheet de shadcn) que actúa como formulario de creación cuando no recibe un servicio, y como formulario de edición cuando recibe un `service` prop. El drawer se abre desde el botón "Nuevo servicio" o desde la acción "Editar" en la fila.

#### Scenario: Drawer en modo creación inicia con campos vacíos

- **WHEN** el drawer se abre sin `service` prop
- **THEN** todos los campos están vacíos o en su valor por defecto (warrantyDays = 0)

#### Scenario: Drawer en modo edición precarga los valores del servicio

- **WHEN** el drawer se abre con un `service` prop
- **THEN** todos los campos se rellenan con los valores actuales del servicio

---

### Requirement: Campos del formulario con validación Zod

El formulario SHALL incluir los siguientes campos validados con Zod:

- **Nombre** (requerido, string no vacío)
- **Descripción** (opcional, textarea)
- **Precio** (requerido, número ≥ 0)
- **Días de garantía** (requerido, entero ≥ 0, default 0)
- **Clave Prod/Serv SAT** (opcional, ≤ 15 caracteres, solo alfanumérico)
- **Clave Unidad SAT** (opcional, ≤ 10 caracteres, solo alfanumérico)

#### Scenario: Nombre vacío bloquea el submit

- **WHEN** el usuario intenta guardar con el campo Nombre vacío
- **THEN** aparece un mensaje de error en el campo y el formulario no se envía

#### Scenario: Precio negativo bloquea el submit

- **WHEN** el usuario ingresa un precio negativo
- **THEN** aparece un mensaje de error indicando que el precio no puede ser negativo

#### Scenario: Días de garantía negativo bloquea el submit

- **WHEN** el usuario ingresa un valor negativo en Días de garantía
- **THEN** aparece un mensaje de error indicando que el valor mínimo es 0

#### Scenario: Clave SAT con caracteres especiales bloquea el submit

- **WHEN** el usuario ingresa caracteres no alfanuméricos en claveProdServ o claveUnidad
- **THEN** aparece un mensaje de error de formato

---

### Requirement: Error de nombre duplicado muestra error en el campo

Cuando la API devuelve 409 con `{ error: 'name_already_exists' }`, el drawer SHALL mostrar un error a nivel de campo en el input de Nombre en lugar de un error genérico.

#### Scenario: Nombre duplicado en creación muestra error en campo

- **WHEN** el usuario intenta crear un servicio con un nombre que ya existe en la org
- **THEN** el input de Nombre muestra el mensaje "Ya existe un servicio con este nombre"

#### Scenario: Nombre duplicado en edición muestra error en campo

- **WHEN** el usuario intenta renombrar un servicio a un nombre ya existente
- **THEN** el input de Nombre muestra el mensaje "Ya existe un servicio con este nombre"

---

### Requirement: Submit exitoso cierra el drawer e invalida el cache

Al guardar exitosamente (crear o editar), el drawer SHALL cerrarse y la lista de servicios SHALL actualizarse reflejando los cambios sin recargar la página.

#### Scenario: Creación exitosa refresca la lista

- **WHEN** el usuario crea un servicio y la API responde 201
- **THEN** el drawer se cierra y el nuevo servicio aparece en la tabla

#### Scenario: Edición exitosa refresca la lista

- **WHEN** el usuario edita un servicio y la API responde 200
- **THEN** el drawer se cierra y la fila muestra los valores actualizados
