import type {
  CfdiPaymentMethod,
  InvoiceStatus,
  WorkOrderStatus,
} from '@glossops/database'

export interface InvoiceWorkOrderEmbed {
  id: string
  status: WorkOrderStatus
  totalAmount: number
  asset: {
    id: string
    assetType: string
    model: string | null
    year: number | null
  }
}

export interface InvoiceRecord {
  id: string
  branchId: string
  workOrderId: string
  status: InvoiceStatus
  folio: string
  subtotal: number
  taxRate: number
  taxAmount: number
  total: number
  customerTaxId: string | null
  customerName: string | null
  customerAddress: string | null
  customerZipCode: string | null
  customerFiscalRegime: string | null
  cfdiUse: string | null
  paymentMethod: CfdiPaymentMethod | null
  paymentForm: string | null
  cfdiUuid: string | null
  cfdiXml: string | null
  cfdiSealedAt: Date | null
  issuedAt: Date | null
  createdAt: Date
  updatedAt: Date
  workOrder: InvoiceWorkOrderEmbed
}

export interface CreateInvoiceData {
  branchId: string
  workOrderId: string
  subtotal: number
  taxRate: number
  taxAmount: number
  total: number
  customerTaxId: string | null
  customerName: string | null
  customerAddress: string | null
  customerZipCode: string | null
  customerFiscalRegime: string | null
  cfdiUse: string | null
  paymentMethod: CfdiPaymentMethod | null
  paymentForm: string | null
}

export interface UpdateInvoiceData {
  customerTaxId?: string | null
  customerName?: string | null
  customerAddress?: string | null
  customerZipCode?: string | null
  customerFiscalRegime?: string | null
  cfdiUse?: string | null
  paymentMethod?: CfdiPaymentMethod | null
  paymentForm?: string | null
}

export interface InvoiceFilters {
  status?: InvoiceStatus
  page: number
  limit: number
}

export interface InvoicePage {
  data: InvoiceRecord[]
  total: number
  page: number
  limit: number
}

export interface InvoiceRepositoryInterface {
  create(data: CreateInvoiceData): Promise<InvoiceRecord>
  findById(id: string, branchId: string): Promise<InvoiceRecord | null>
  findByWorkOrder(workOrderId: string): Promise<InvoiceRecord | null>
  findAll(branchId: string, filters: InvoiceFilters): Promise<InvoicePage>
  update(
    id: string,
    branchId: string,
    data: UpdateInvoiceData
  ): Promise<InvoiceRecord>
  updateStatus(
    id: string,
    branchId: string,
    status: InvoiceStatus,
    issuedAt?: Date
  ): Promise<InvoiceRecord>
}
