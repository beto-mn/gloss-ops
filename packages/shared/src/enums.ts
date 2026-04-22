export enum PurchaseOrderStatus {
  PARTIALLY_RECEIVED = 'PARTIALLY_RECEIVED',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  RECEIVED = 'RECEIVED',
  DRAFT = 'DRAFT',
  SENT = 'SENT',
}

export enum WorkOrderStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  CONFIRMED = 'CONFIRMED',
  DRAFT = 'DRAFT',
}

export enum AssetCondition {
  EXCELLENT = 'EXCELLENT',
  FAIR = 'FAIR',
  GOOD = 'GOOD',
  POOR = 'POOR',
}

export enum CfdiPaymentMethod {
  PPD = 'PPD',
  PUE = 'PUE',
}

export enum ActivityAction {
  STATUS_CHANGED = 'STATUS_CHANGED',
  ASSIGNED = 'ASSIGNED',
  CREATED = 'CREATED',
  DELETED = 'DELETED',
  UPDATED = 'UPDATED',
}

export enum CheckpointType {
  RECEPTION = 'RECEPTION',
  DELIVERY = 'DELIVERY',
}

export enum WorkOrderType {
  WARRANTY_CLAIM = 'WARRANTY_CLAIM',
  STANDARD = 'STANDARD',
}

export enum InvoiceStatus {
  CANCELLED = 'CANCELLED',
  ISSUED = 'ISSUED',
  DRAFT = 'DRAFT',
  PAID = 'PAID',
}

export enum InventoryType {
  ITEM = 'ITEM',
  ROLL = 'ROLL',
}

export enum FuelLevel {
  THREE_QUARTERS = 'THREE_QUARTERS',
  QUARTER = 'QUARTER',
  EMPTY = 'EMPTY',
  FULL = 'FULL',
  HALF = 'HALF',
}

export enum Role {
  TECHNICIAN = 'TECHNICIAN',
  FRONT_DESK = 'FRONT_DESK',
  MANAGER = 'MANAGER',
  OWNER = 'OWNER',
}
