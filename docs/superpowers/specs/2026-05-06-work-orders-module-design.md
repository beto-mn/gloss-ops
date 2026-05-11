# Work Orders Module — Design Spec

**Date:** 2026-05-06
**Status:** Draft

---

## Goal

Implementar el módulo completo de Work Orders para que los talleres automotrices puedan gestionar
el ciclo de vida de una orden de trabajo: creación, cotización de servicios, asignación de técnicos,
registro de la condición del vehículo al entrar y salir, y cierre de la orden.

Sin este módulo no existe el concepto central del negocio — todas las demás entidades (clientes,
vehículos, servicios, inventario) convergen aquí.

---

## Scope

Este spec cubre cuatro recursos dentro de un único `WorkOrdersModule`:

| Recurso               | Descripción                                                           |
| --------------------- | --------------------------------------------------------------------- |
| `WorkOrder`           | CRUD + máquina de estados                                             |
| `WorkOrderItem`       | Ítems de servicio anidados, recalcula `totalAmount`                   |
| `WorkOrderAssignment` | Asignación de miembros (técnicos) a la orden                          |
| `AssetCheckpoint`     | Registro de recepción y entrega del vehículo con fotos y firma vía S3 |

**Fuera de scope:** facturación (`Invoice`), uso de inventario (`InventoryUsage`), garantías
(`Warranty`), notificaciones, generación de PDF, `ActivityLog`, validación de que `assetId`
pertenece a la org del branch.

---

## Background

El schema de Prisma ya contiene todos los modelos necesarios (`WorkOrder`, `WorkOrderItem`,
`WorkOrderAssignment`, `AssetCheckpoint`) con sus campos y relaciones. No se requieren cambios de
schema ni migraciones.

Se agregan cuatro variables de entorno para la integración con AWS S3:

```
AWS_S3_BUCKET=glossops-dev
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

El campo `AssetCheckpoint.photo` es un `Json` (array de URLs de S3). La clave de cada objeto en
S3 sigue el patrón:

```
work-orders/{workOrderId}/checkpoints/{type}/{uuid}.{ext}
```

---

## Data Model

### WorkOrder

```
id             UUID PK
branchId       UUID FK → Branch
assetId        UUID FK → CustomerAsset
type           WorkOrderType   (STANDARD | WARRANTY_CLAIM)
warrantyClaimId UUID? FK → Warranty
status         WorkOrderStatus (DRAFT | CONFIRMED | IN_PROGRESS | COMPLETED | CANCELLED)
scheduledAt    DateTime?
completedAt    DateTime?
totalAmount    Decimal(10,2)  default 0
note           String?
createdAt      DateTime
updatedAt      DateTime
```

### WorkOrderItem

```
id          UUID PK
workOrderId UUID FK → WorkOrder
serviceId   UUID FK → Service
description String?
quantity    Int     default 1
unitPrice   Decimal(10,2)
discount    Decimal(10,2)  default 0
subtotal    Decimal(10,2)  — computed: unitPrice × quantity − discount
isBillable  Boolean default true
createdAt   DateTime
```

### WorkOrderAssignment

```
id          UUID PK
workOrderId UUID FK → WorkOrder
memberId    UUID FK → OrganizationMember
role        String  default "assistant"
assignedAt  DateTime default now()

@@unique([workOrderId, memberId])
```

### AssetCheckpoint

```
id                   UUID PK
workOrderId          UUID FK → WorkOrder
type                 CheckpointType  (RECEPTION | DELIVERY)
mileage              Int?
fuelLevel            FuelLevel?  (EMPTY | QUARTER | HALF | THREE_QUARTERS | FULL)
generalCondition     AssetCondition  (EXCELLENT | GOOD | FAIR | POOR)
note                 String?
photo                Json  default []   — array de URLs de S3
customerSignatureUrl String?           — URL de S3
recordedAt           DateTime default now()
recordedById         UUID FK → Account

@@unique([workOrderId, type])
```

---

## API Contract

Todos los endpoints requieren JWT válido. `organizationId` siempre viene de `account.organizationId`
— nunca del body ni de la URL. `branchId` viene de `account.branchId` únicamente en la creación de
una orden.

### Work Orders — `POST /work-orders`

**Roles:** OWNER, MANAGER, FRONT_DESK

```ts
// Body
{
  assetId: string         // UUID, required
  type?: WorkOrderType    // default STANDARD
  warrantyClaimId?: string  // UUID, requerido si type = WARRANTY_CLAIM
  scheduledAt?: string    // ISO 8601
  note?: string
}
```

| Situación         | HTTP | Body                        |
| ----------------- | ---- | --------------------------- |
| Body inválido     | 400  | validation error            |
| Sin rol requerido | 403  | —                           |
| Éxito             | 201  | `WorkOrder` creada en DRAFT |

---

### Work Orders — `GET /work-orders`

**Roles:** todos

| Query param | Tipo              | Default | Notas               |
| ----------- | ----------------- | ------- | ------------------- |
| `status`    | `WorkOrderStatus` | —       | filtra por estado   |
| `assetId`   | UUID              | —       | filtra por vehículo |
| `page`      | int ≥ 1           | `1`     | —                   |
| `limit`     | int ∈ [1,100]     | `20`    | —                   |

Retorna `{ data: WorkOrder[], meta: PageMeta }`. Ordenado por `createdAt` desc.

---

### Work Orders — `GET /work-orders/:id`

**Roles:** todos

Retorna la orden con `items`, `assignments`, y `checkpoints` incluidos.

| Situación                  | HTTP | Body                                |
| -------------------------- | ---- | ----------------------------------- |
| No existe o es de otra org | 404  | `{ error: 'work_order_not_found' }` |
| Éxito                      | 200  | `WorkOrderWithDetails`              |

---

### Work Orders — `PATCH /work-orders/:id`

**Roles:** OWNER, MANAGER, FRONT_DESK

```ts
// Body (todos opcionales)
{
  scheduledAt?: string | null   // null limpia el campo
  note?: string | null
}
```

No hay restricción por estado — la metadata es editable en cualquier estado no terminal.

| Situación                  | HTTP | Body                                |
| -------------------------- | ---- | ----------------------------------- |
| No existe o es de otra org | 404  | `{ error: 'work_order_not_found' }` |
| Éxito                      | 200  | `WorkOrder` actualizada             |

---

### Work Orders — `PATCH /work-orders/:id/status`

**Roles:** OWNER, MANAGER, TECHNICIAN, FRONT_DESK

```ts
// Body
{
  status: WorkOrderStatus
}
```

**Máquina de estados — transiciones válidas:**

```
DRAFT       → CONFIRMED
DRAFT       → CANCELLED
CONFIRMED   → DRAFT        (revertir para edición)
CONFIRMED   → IN_PROGRESS
CONFIRMED   → CANCELLED
IN_PROGRESS → COMPLETED    (setea completedAt = now())
IN_PROGRESS → CANCELLED
```

`COMPLETED` y `CANCELLED` son terminales — no admiten más transiciones.

| Situación                  | HTTP | Body                                     |
| -------------------------- | ---- | ---------------------------------------- |
| No existe o es de otra org | 404  | `{ error: 'work_order_not_found' }`      |
| Transición inválida        | 409  | `{ error: 'invalid_status_transition' }` |
| Éxito                      | 200  | `WorkOrder` con nuevo estado             |

---

### Work Orders — `DELETE /work-orders/:id`

**Roles:** OWNER, MANAGER

Hard delete. Solo permitido en estado DRAFT.

| Situación                  | HTTP | Body                                    |
| -------------------------- | ---- | --------------------------------------- |
| No existe o es de otra org | 404  | `{ error: 'work_order_not_found' }`     |
| Estado ≠ DRAFT             | 409  | `{ error: 'work_order_not_deletable' }` |
| Éxito                      | 204  | (vacío)                                 |

---

### Work Order Items — `/work-orders/:id/items`

Todas las mutaciones requieren que la orden esté en estado **DRAFT**.

| Method   | Path                             | Roles                      | HTTP éxito |
| -------- | -------------------------------- | -------------------------- | ---------- |
| `GET`    | `/work-orders/:id/items`         | todos                      | 200        |
| `POST`   | `/work-orders/:id/items`         | OWNER, MANAGER, FRONT_DESK | 201        |
| `PATCH`  | `/work-orders/:id/items/:itemId` | OWNER, MANAGER, FRONT_DESK | 200        |
| `DELETE` | `/work-orders/:id/items/:itemId` | OWNER, MANAGER, FRONT_DESK | 204        |

**Body de POST:**

```ts
{
  serviceId: string     // UUID, required
  description?: string
  quantity?: number     // int ≥ 1, default 1
  unitPrice: number     // ≥ 0, 2 decimales
  discount?: number     // ≥ 0, 2 decimales, default 0
  isBillable?: boolean  // default true
}
```

**Body de PATCH:** todos los campos del POST son opcionales. `description` acepta `null`.

Después de cada mutación el service recalcula `totalAmount` de la orden:

```
totalAmount = Σ (unitPrice × quantity − discount) de todos los ítems
```

| Situación                        | HTTP | Body                                     |
| -------------------------------- | ---- | ---------------------------------------- |
| Orden no existe o es de otra org | 404  | `{ error: 'work_order_not_found' }`      |
| Ítem no existe en la orden       | 404  | `{ error: 'work_order_item_not_found' }` |
| Orden no está en DRAFT           | 409  | `{ error: 'work_order_not_editable' }`   |

---

### Work Order Assignments — `/work-orders/:id/assignments`

| Method   | Path                                     | Roles          | HTTP éxito |
| -------- | ---------------------------------------- | -------------- | ---------- |
| `GET`    | `/work-orders/:id/assignments`           | todos          | 200        |
| `POST`   | `/work-orders/:id/assignments`           | OWNER, MANAGER | 201        |
| `DELETE` | `/work-orders/:id/assignments/:memberId` | OWNER, MANAGER | 204        |

**Body de POST:**

```ts
{
  memberId: string  // UUID, required
  role?: string     // default "assistant"
}
```

El service valida que `memberId` pertenece a la misma organización que la orden antes de asignar.
Las asignaciones no están restringidas por estado excepto en órdenes COMPLETED o CANCELLED.

| Situación                        | HTTP | Body                                   |
| -------------------------------- | ---- | -------------------------------------- |
| Orden no existe o es de otra org | 404  | `{ error: 'work_order_not_found' }`    |
| Miembro no existe en la org      | 404  | `{ error: 'member_not_found' }`        |
| Miembro ya asignado              | 409  | `{ error: 'member_already_assigned' }` |
| Orden COMPLETED o CANCELLED      | 409  | `{ error: 'work_order_closed' }`       |

---

### Asset Checkpoints — `/work-orders/:id/checkpoints`

| Method  | Path                                 | Roles                                  | HTTP éxito |
| ------- | ------------------------------------ | -------------------------------------- | ---------- |
| `POST`  | `/work-orders/:id/checkpoints`       | OWNER, MANAGER, TECHNICIAN, FRONT_DESK | 201        |
| `GET`   | `/work-orders/:id/checkpoints/:type` | todos                                  | 200        |
| `PATCH` | `/work-orders/:id/checkpoints/:type` | OWNER, MANAGER, TECHNICIAN, FRONT_DESK | 200        |

**Body de POST:**

```ts
{
  type: 'RECEPTION' | 'DELIVERY'  // required
  generalCondition: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR'  // required
  mileage?: number    // int ≥ 0
  fuelLevel?: 'EMPTY' | 'QUARTER' | 'HALF' | 'THREE_QUARTERS' | 'FULL'
  note?: string
}
```

**Body de PATCH:** mismos campos, todos opcionales. `note` acepta `null`.

`recordedById` se setea desde `account.sub` — nunca viene del body.

Checkpoints no se pueden crear ni modificar en órdenes COMPLETED o CANCELLED.

| Situación                        | HTTP | Body                                     |
| -------------------------------- | ---- | ---------------------------------------- |
| Orden no existe o es de otra org | 404  | `{ error: 'work_order_not_found' }`      |
| Checkpoint no existe (GET/PATCH) | 404  | `{ error: 'checkpoint_not_found' }`      |
| Checkpoint ya existe (POST)      | 409  | `{ error: 'checkpoint_already_exists' }` |
| Orden COMPLETED o CANCELLED      | 409  | `{ error: 'work_order_closed' }`         |

---

### S3 Pre-signed URLs

| Method   | Path                                                   | Descripción                        |
| -------- | ------------------------------------------------------ | ---------------------------------- |
| `POST`   | `/work-orders/:id/checkpoints/:type/photos/presign`    | Pre-signed URL para una foto       |
| `POST`   | `/work-orders/:id/checkpoints/:type/signature/presign` | Pre-signed URL para la firma       |
| `DELETE` | `/work-orders/:id/checkpoints/:type/photos`            | Elimina una URL del array de fotos |

**Roles:** OWNER, MANAGER, TECHNICIAN, FRONT_DESK

**Body de presign:**

```ts
{
  contentType: 'image/jpeg' | 'image/png' | 'image/webp'
}
```

**Response de presign:**

```ts
{
  uploadUrl: string // PUT a este URL con el binario — expira en 5 minutos
  fileUrl: string // URL pública final en S3 — guardar en el checkpoint
}
```

**Body de DELETE fotos:**

```ts
{
  url: string
} // URL a eliminar del array
```

**Flujo completo para agregar una foto:**

1. `POST .../photos/presign` → `{ uploadUrl, fileUrl }`
2. Frontend hace `PUT uploadUrl` con el binario (sin pasar por el API)
3. `PATCH .../checkpoints/:type` con `fileUrl` agregado al array `photos`

El endpoint de presign valida que la orden exista en la org y que no esté en estado terminal antes
de generar la URL.

---

## Repository Layer

### Interfaces

**`WorkOrderRepositoryInterface`**

```ts
create(data: CreateWorkOrderData): Promise<WorkOrderModel>
findById(id: string, organizationId: string): Promise<WorkOrderWithDetails | null>
findAll(organizationId: string, query: WorkOrderQuery): Promise<WorkOrderPage>
update(id: string, organizationId: string, data: UpdateWorkOrderData): Promise<WorkOrderModel>
updateStatus(id: string, organizationId: string, status: WorkOrderStatus, completedAt?: Date): Promise<WorkOrderModel>
delete(id: string, organizationId: string): Promise<void>
```

`WorkOrderWithDetails` incluye items, assignments y checkpoints:

```ts
type WorkOrderWithDetails = WorkOrderModel & {
  items: WorkOrderItemModel[]
  assignments: WorkOrderAssignmentModel[]
  checkpoints: AssetCheckpointModel[]
}
```

**`WorkOrderItemRepositoryInterface`**

```ts
create(data: CreateWorkOrderItemData): Promise<WorkOrderItemModel>
findById(id: string, workOrderId: string): Promise<WorkOrderItemModel | null>
findAllByWorkOrder(workOrderId: string): Promise<WorkOrderItemModel[]>
update(id: string, workOrderId: string, data: UpdateWorkOrderItemData): Promise<WorkOrderItemModel>
delete(id: string, workOrderId: string): Promise<void>
```

**`WorkOrderAssignmentRepositoryInterface`**

```ts
assign(workOrderId: string, memberId: string, role: string): Promise<WorkOrderAssignmentModel>
findByMember(workOrderId: string, memberId: string): Promise<WorkOrderAssignmentModel | null>
findAllByWorkOrder(workOrderId: string): Promise<WorkOrderAssignmentModel[]>
isMemberInOrg(memberId: string, organizationId: string): Promise<boolean>
unassign(workOrderId: string, memberId: string): Promise<void>
```

**`AssetCheckpointRepositoryInterface`**

```ts
create(data: CreateCheckpointData): Promise<AssetCheckpointModel>
findByType(workOrderId: string, type: CheckpointType): Promise<AssetCheckpointModel | null>
update(workOrderId: string, type: CheckpointType, data: UpdateCheckpointData): Promise<AssetCheckpointModel>
addPhoto(workOrderId: string, type: CheckpointType, url: string): Promise<AssetCheckpointModel>
removePhoto(workOrderId: string, type: CheckpointType, url: string): Promise<AssetCheckpointModel>
setSignature(workOrderId: string, type: CheckpointType, url: string): Promise<AssetCheckpointModel>
```

### Prisma Implementation

- `WorkOrderRepository.findById` usa `include: { items: true, assignments: true, checkpoints: true }`.
- `WorkOrderRepository.findAll` usa `$transaction([findMany, count])` con `branch: { organizationId }`.
- `AssetCheckpointRepository.addPhoto` lee el checkpoint actual, hace spread del array `photo` existente con la nueva URL, y llama `update` con el array resultante — Prisma no soporta operaciones push nativas sobre campos `Json`.
- `AssetCheckpointRepository.removePhoto` lee el checkpoint actual, filtra el array por URL, y llama `update` con el array resultante.
- `WorkOrderAssignmentRepository.isMemberInOrg` hace `prisma.organizationMember.findFirst({ where: { id: memberId, branch: { organizationId } } })` y retorna `member !== null`.
- `WorkOrderAssignmentRepository.assign` captura Prisma error `P2002` en el unique `[workOrderId, memberId]` y rethrow como `ConflictException({ error: 'member_already_assigned' })`.

### In-Memory Implementation

- `InMemoryWorkOrderRepository` mantiene `branches: Map<string, string>` (branchId → organizationId) poblado via `seedBranches([...])`. Tres callbacks conectan los repos relacionados para que `findById` retorne `WorkOrderWithDetails`: `setItemsGetter`, `setAssignmentsGetter`, `setCheckpointsGetter`.
- `InMemoryWorkOrderAssignmentRepository` mantiene `members: Map<string, string>` (memberId → organizationId) poblado via `seedMembers([...])` para que `isMemberInOrg` funcione sin Prisma.
- `InMemoryAssetCheckpointRepository.addPhoto` hace spread del array existente con la nueva URL.
- `InMemoryAssetCheckpointRepository.removePhoto` filtra el array por URL.

---

## S3 Service

`S3Service` vive dentro de `WorkOrdersModule` como provider interno — no es un módulo separado.

```ts
@Injectable()
export class S3Service {
  private readonly client: S3Client
  private readonly bucket: string
  private readonly region: string

  constructor() {
    this.bucket = envs.aws.s3Bucket
    this.region = envs.aws.region
    this.client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: envs.aws.accessKeyId,
        secretAccessKey: envs.aws.secretAccessKey,
      },
    })
  }

  async generatePresignedUrl(
    key: string,
    contentType: string
  ): Promise<{ uploadUrl: string; fileUrl: string }> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    })
    const uploadUrl = await getSignedUrl(this.client, command, {
      expiresIn: 300,
    })
    const fileUrl = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`
    return { uploadUrl, fileUrl }
  }
}
```

Se agregan al schema de `envs.ts`:

```ts
AWS_S3_BUCKET: z.string().min(1)
AWS_REGION: z.string().min(1)
AWS_ACCESS_KEY_ID: z.string().min(1)
AWS_SECRET_ACCESS_KEY: z.string().min(1)
```

---

## Service Layer

Un único `WorkOrdersService` con inyección de los cuatro repositorios + `S3Service`.

Grupos de responsabilidad:

**Órdenes:** `create`, `findAll`, `findOne`, `update`, `transition`, `remove`

- `findOne` retorna `WorkOrderWithDetails` — es la fuente de verdad para "existe y pertenece a la org"
- `transition` valida la máquina de estados con un mapa estático `VALID_TRANSITIONS`
- `remove` verifica estado DRAFT antes de delegar al repo

**Ítems:** `addItem`, `getItems`, `updateItem`, `removeItem`

- Todas llaman `findOne` primero para verificar org + estado DRAFT
- `syncTotal` privado: suma subtotales y llama `workOrders.update({ totalAmount })`

**Assignments:** `assignMember`, `getAssignments`, `unassignMember`

- Valida que la orden no esté cerrada
- Valida que `memberId` pertenece a la org llamando `assignments.isMemberInOrg(memberId, organizationId)` — 404 si retorna false

**Checkpoints:** `createCheckpoint`, `getCheckpoint`, `updateCheckpoint`

- Valida que la orden no esté cerrada
- Inyecta `account.sub` como `recordedById`

**S3:** `presignPhoto`, `presignSignature`, `removePhoto`

- Valida existencia de la orden y estado no terminal
- Delega generación de URL a `S3Service`

---

## Controller Layer

Cuatro controllers, todos en el mismo módulo:

| Controller                       | Prefijo                        |
| -------------------------------- | ------------------------------ |
| `WorkOrdersController`           | `/work-orders`                 |
| `WorkOrderItemsController`       | `/work-orders/:id/items`       |
| `WorkOrderAssignmentsController` | `/work-orders/:id/assignments` |
| `WorkOrderCheckpointsController` | `/work-orders/:id/checkpoints` |

---

## Module Structure

```
apps/api/src/work-orders/
  interfaces/
    work-order.repository.interface.ts
    work-order-item.repository.interface.ts
    work-order-assignment.repository.interface.ts
    asset-checkpoint.repository.interface.ts
    index.ts
  infrastructure/
    prisma-work-order.repository.ts
    prisma-work-order-item.repository.ts
    prisma-work-order-assignment.repository.ts
    prisma-asset-checkpoint.repository.ts
    in-memory-work-order.repository.ts
    in-memory-work-order-item.repository.ts
    in-memory-work-order-assignment.repository.ts
    in-memory-asset-checkpoint.repository.ts
  dto/
    create-work-order.dto.ts
    update-work-order.dto.ts
    list-work-orders.dto.ts
    transition-status.dto.ts
    create-work-order-item.dto.ts
    update-work-order-item.dto.ts
    assign-member.dto.ts
    create-checkpoint.dto.ts
    update-checkpoint.dto.ts
    presign-upload.dto.ts
    remove-photo.dto.ts
    index.ts
  work-orders.tokens.ts
  work-orders.service.ts
  work-orders.service.spec.ts
  work-orders.controller.ts
  work-orders.controller.spec.ts
  work-order-items.controller.ts
  work-order-items.controller.spec.ts
  work-order-assignments.controller.ts
  work-order-assignments.controller.spec.ts
  work-order-checkpoints.controller.ts
  work-order-checkpoints.controller.spec.ts
  s3.service.ts
  work-orders.module.ts
  index.ts
```

**Tokens DI:**

```ts
WORK_ORDER_REPOSITORY
WORK_ORDER_ITEM_REPOSITORY
WORK_ORDER_ASSIGNMENT_REPOSITORY
ASSET_CHECKPOINT_REPOSITORY
```

---

## Testing Strategy

Sin mocks de Prisma ni de AWS. Todos los specs usan repositorios in-memory. `S3Service` se mockea
con `jest.fn()` en el service spec.

### Service spec (`work-orders.service.spec.ts`)

**Work Orders:**

- `create` crea en DRAFT con defaults
- `create` respeta `type` y `scheduledAt` provistos
- `findAll` pagina y filtra por status y assetId
- `findAll` no retorna órdenes de otra org
- `findOne` retorna la orden con items, assignments y checkpoints
- `findOne` 404 para id desconocido o de otra org
- `update` modifica note y scheduledAt; `null` limpia scheduledAt
- `update` 404 para orden desconocida
- `transition` caminos válidos: DRAFT→CONFIRMED, CONFIRMED→DRAFT, CONFIRMED→IN_PROGRESS, IN_PROGRESS→COMPLETED (setea completedAt), DRAFT→CANCELLED, CONFIRMED→CANCELLED, IN_PROGRESS→CANCELLED
- `transition` 409 para transición inválida (DRAFT→COMPLETED, COMPLETED→cualquier cosa)
- `remove` elimina una orden DRAFT
- `remove` 409 cuando estado ≠ DRAFT

**Items:**

- `addItem` agrega ítem y recalcula totalAmount (con y sin discount)
- `addItem` acumula totalAmount con múltiples ítems
- `addItem` 409 cuando orden no es DRAFT
- `addItem` 404 para orden desconocida
- `updateItem` modifica quantity y recalcula totalAmount
- `updateItem` 404 para ítem desconocido
- `updateItem` 409 cuando orden no es DRAFT
- `removeItem` elimina ítem y recalcula totalAmount
- `removeItem` 404 para ítem desconocido
- `removeItem` 409 cuando orden no es DRAFT

**Assignments:**

- `assignMember` asigna un miembro
- `assignMember` 409 si ya está asignado
- `assignMember` 409 si la orden está COMPLETED o CANCELLED
- `assignMember` 404 si el miembro no pertenece a la org
- `unassignMember` elimina la asignación
- `unassignMember` 404 si el miembro no estaba asignado

**Checkpoints:**

- `createCheckpoint` crea con `recordedById` del account
- `createCheckpoint` 409 si ya existe ese tipo para la orden
- `createCheckpoint` 409 si la orden está COMPLETED o CANCELLED
- `updateCheckpoint` modifica campos
- `updateCheckpoint` 404 si no existe el checkpoint
- `getCheckpoint` 404 si no existe

**S3:**

- `presignPhoto` llama `S3Service.generatePresignedUrl` con la key correcta y retorna `{ uploadUrl, fileUrl }`
- `presignPhoto` 409 si la orden está cerrada
- `removePhoto` elimina la URL del array de fotos del checkpoint

### Controller specs

Un spec por controller. El service se mockea con `jest.fn()`. Se verifica que cada handler delega
al service con los parámetros correctos extraídos de `AuthContext` (`organizationId`, `branchId`,
`account.sub`).

---

## Error Responses — Resumen

| Situación                        | HTTP | `error`                     |
| -------------------------------- | ---- | --------------------------- |
| DTO inválido                     | 400  | validation error            |
| Sin rol requerido                | 403  | —                           |
| Orden no existe o es de otra org | 404  | `work_order_not_found`      |
| Ítem no existe en la orden       | 404  | `work_order_item_not_found` |
| Miembro no existe en la org      | 404  | `member_not_found`          |
| Checkpoint no existe             | 404  | `checkpoint_not_found`      |
| Transición de estado inválida    | 409  | `invalid_status_transition` |
| Orden no está en DRAFT (items)   | 409  | `work_order_not_editable`   |
| Orden no está en DRAFT (delete)  | 409  | `work_order_not_deletable`  |
| Orden COMPLETED o CANCELLED      | 409  | `work_order_closed`         |
| Miembro ya asignado              | 409  | `member_already_assigned`   |
| Checkpoint ya existe             | 409  | `checkpoint_already_exists` |

Los 404 son uniformes — no revelan si el recurso existe en otra org.

---

## Files Changed

| Acción | Archivo                                                                                 |
| ------ | --------------------------------------------------------------------------------------- |
| Modify | `apps/api/src/config/envs.ts`                                                           |
| Modify | `apps/api/tsconfig.paths.json`                                                          |
| Modify | `apps/api/package.json` (jest moduleNameMapper)                                         |
| Modify | `apps/api/src/app.module.ts`                                                            |
| New    | `apps/api/src/work-orders/work-orders.tokens.ts`                                        |
| New    | `apps/api/src/work-orders/work-orders.module.ts`                                        |
| New    | `apps/api/src/work-orders/work-orders.service.ts`                                       |
| New    | `apps/api/src/work-orders/work-orders.service.spec.ts`                                  |
| New    | `apps/api/src/work-orders/work-orders.controller.ts`                                    |
| New    | `apps/api/src/work-orders/work-orders.controller.spec.ts`                               |
| New    | `apps/api/src/work-orders/work-order-items.controller.ts`                               |
| New    | `apps/api/src/work-orders/work-order-items.controller.spec.ts`                          |
| New    | `apps/api/src/work-orders/work-order-assignments.controller.ts`                         |
| New    | `apps/api/src/work-orders/work-order-assignments.controller.spec.ts`                    |
| New    | `apps/api/src/work-orders/work-order-checkpoints.controller.ts`                         |
| New    | `apps/api/src/work-orders/work-order-checkpoints.controller.spec.ts`                    |
| New    | `apps/api/src/work-orders/s3.service.ts`                                                |
| New    | `apps/api/src/work-orders/index.ts`                                                     |
| New    | `apps/api/src/work-orders/interfaces/work-order.repository.interface.ts`                |
| New    | `apps/api/src/work-orders/interfaces/work-order-item.repository.interface.ts`           |
| New    | `apps/api/src/work-orders/interfaces/work-order-assignment.repository.interface.ts`     |
| New    | `apps/api/src/work-orders/interfaces/asset-checkpoint.repository.interface.ts`          |
| New    | `apps/api/src/work-orders/interfaces/index.ts`                                          |
| New    | `apps/api/src/work-orders/dto/` (11 archivos)                                           |
| New    | `apps/api/src/work-orders/infrastructure/prisma-work-order.repository.ts`               |
| New    | `apps/api/src/work-orders/infrastructure/prisma-work-order-item.repository.ts`          |
| New    | `apps/api/src/work-orders/infrastructure/prisma-work-order-assignment.repository.ts`    |
| New    | `apps/api/src/work-orders/infrastructure/prisma-asset-checkpoint.repository.ts`         |
| New    | `apps/api/src/work-orders/infrastructure/in-memory-work-order.repository.ts`            |
| New    | `apps/api/src/work-orders/infrastructure/in-memory-work-order-item.repository.ts`       |
| New    | `apps/api/src/work-orders/infrastructure/in-memory-work-order-assignment.repository.ts` |
| New    | `apps/api/src/work-orders/infrastructure/in-memory-asset-checkpoint.repository.ts`      |
