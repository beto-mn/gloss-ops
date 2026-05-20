export interface WarrantyRecord {
  id: string
  workOrderItemId: string
  serviceId: string
  branchId: string
  description: string
  term: string | null
  validFrom: Date
  validUntil: Date
  isVoid: boolean
  voidReason: string | null
  createdAt: Date
  updatedAt: Date
}

export interface WarrantyWithAsset {
  id: string
  isVoid: boolean
  validUntil: Date
  assetId: string
}

export interface ItemForGeneration {
  id: string
  serviceId: string
  service: {
    warrantyDays: number | null
    warrantyDescription: string | null
    warrantyTerm: string | null
    name: string
  }
}

export interface CreateWarrantyData {
  workOrderItemId: string
  serviceId: string
  description: string
  term: string | null
  validFrom: Date
  validUntil: Date
}

export interface WarrantyRepositoryInterface {
  createMany(data: CreateWarrantyData[]): Promise<WarrantyRecord[]>
  findItemsForGeneration(workOrderId: string): Promise<ItemForGeneration[]>
  findById(id: string, organizationId: string): Promise<WarrantyRecord | null>
  findByWorkOrder(
    workOrderId: string,
    organizationId: string
  ): Promise<WarrantyRecord[]>
  findByAsset(
    assetId: string,
    organizationId: string
  ): Promise<WarrantyRecord[]>
  findForClaimValidation(
    warrantyId: string,
    organizationId: string
  ): Promise<WarrantyWithAsset | null>
  void(id: string, reason: string): Promise<WarrantyRecord>
}
