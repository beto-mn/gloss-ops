## ADDED Requirements

### Requirement: Página de creación recibe parámetros opcionales de URL

La página `/work-orders/new` SHALL leer `?customerId` y `?assetId` de los search params. Si están presentes, los comboboxes de cliente y activo se precargan con esos valores y quedan bloqueados (disabled).

#### Scenario: Creación desde detalle de cliente con assetId

- **WHEN** el usuario navega a `/work-orders/new?customerId=X&assetId=Y`
- **THEN** el combobox de cliente muestra el nombre del cliente X bloqueado y el combobox de activo muestra el activo Y bloqueado

#### Scenario: Creación desde lista sin parámetros

- **WHEN** el usuario navega a `/work-orders/new` sin params
- **THEN** ambos comboboxes están vacíos y habilitados para selección

### Requirement: Formulario de creación captura todos los campos de la orden

La página SHALL tener un formulario con:

- `customerId` (combobox con búsqueda, requerido)
- `assetId` (combobox dependiente de cliente, requerido)
- `type` (selector: STANDARD | WARRANTY_CLAIM, default STANDARD)
- `scheduledAt` (date picker, opcional)
- `note` (textarea, opcional)

#### Scenario: Combobox de activo se habilita al seleccionar cliente

- **WHEN** el usuario selecciona un cliente en el combobox
- **THEN** el combobox de activo se habilita y carga los activos de ese cliente

#### Scenario: Cambiar cliente resetea activo

- **WHEN** el usuario cambia el cliente después de haber seleccionado un activo
- **THEN** el campo `assetId` se resetea a vacío

#### Scenario: Validación impide submit sin cliente o activo

- **WHEN** el usuario intenta enviar sin seleccionar cliente o activo
- **THEN** los campos muestran error de validación "Campo requerido"

### Requirement: Tabla dinámica de items de la orden

La página SHALL incluir una sección "Items" con una tabla editable. Cada fila tiene:

- `serviceId` (combobox de servicios, requerido)
- `quantity` (número entero, mín 1, requerido)
- `unitPrice` (decimal, mín 0, requerido)
- `note` (texto libre, opcional)

Un botón "+ Agregar item" añade una nueva fila vacía. El ícono de trash en cada fila la elimina. La orden MUST tener al menos 1 item para poder enviarse.

#### Scenario: Agregar item

- **WHEN** el usuario hace click en "+ Agregar item"
- **THEN** se añade una nueva fila vacía al final de la tabla

#### Scenario: Eliminar item

- **WHEN** el usuario hace click en el ícono trash de una fila
- **THEN** la fila es removida inmediatamente

#### Scenario: Submit sin items

- **WHEN** el usuario intenta enviar el formulario sin items
- **THEN** se muestra el error "Agrega al menos un servicio"

#### Scenario: Total calculado en tiempo real

- **WHEN** el usuario ingresa quantity y unitPrice en cualquier fila
- **THEN** el subtotal de esa fila (quantity × unitPrice) y el total de la orden se actualizan en tiempo real

### Requirement: Submit crea la orden y redirige al detalle

Al enviar el formulario exitosamente, la página SHALL hacer POST a `/work-orders`, redirigir a `/work-orders/[id]` de la nueva orden e invalidar la query `['work-orders']`.

#### Scenario: Creación exitosa

- **WHEN** el usuario completa el formulario y hace click en "Crear orden"
- **THEN** la orden se crea, el usuario es redirigido a `/work-orders/[newId]`, y la lista de órdenes queda invalidada

#### Scenario: Error de red en creación

- **WHEN** la API retorna un error durante la creación
- **THEN** se muestra un mensaje de error inline y el formulario no se resetea

### Requirement: Botón cancelar regresa a la lista

La página SHALL tener un botón "Cancelar" (o breadcrumb clicable) que navega a `/work-orders` sin crear nada.

#### Scenario: Cancelar sin datos

- **WHEN** el usuario hace click en "Cancelar"
- **THEN** el navegador regresa a `/work-orders`
