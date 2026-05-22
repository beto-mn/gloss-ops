import { randomUUID } from 'crypto'

import { Injectable } from '@nestjs/common'

import { InvoiceStatus } from '@glossops/database'

import type {
  InvoiceRepositoryInterface,
  InvoiceWorkOrderEmbed,
  CreateInvoiceData,
  UpdateInvoiceData,
  InvoiceFilters,
  InvoiceRecord,
  InvoicePage,
} from '@invoices/interfaces'

@Injectable()
export class InMemoryInvoiceRepository implements InvoiceRepositoryInterface {
  readonly store = new Map<string, InvoiceRecord>()
  private readonly counters = new Map<string, number>()
  private readonly workOrderEmbeds = new Map<string, InvoiceWorkOrderEmbed>()

  seedWorkOrder(workOrderId: string, embed: InvoiceWorkOrderEmbed): void {
    this.workOrderEmbeds.set(workOrderId, embed)
  }

  create(data: CreateInvoiceData): Promise<InvoiceRecord> {
    const seq = (this.counters.get(data.branchId) ?? 0) + 1
    this.counters.set(data.branchId, seq)
    const year = new Date().getFullYear()
    const folio = `INV-${year}-${String(seq).padStart(4, '0')}`
    const embed = this.workOrderEmbeds.get(data.workOrderId)!
    const record: InvoiceRecord = {
      id: randomUUID(),
      branchId: data.branchId,
      workOrderId: data.workOrderId,
      status: InvoiceStatus.DRAFT,
      folio,
      subtotal: data.subtotal,
      taxRate: data.taxRate,
      taxAmount: data.taxAmount,
      total: data.total,
      customerTaxId: data.customerTaxId,
      customerName: data.customerName,
      customerAddress: data.customerAddress,
      customerZipCode: data.customerZipCode,
      customerFiscalRegime: data.customerFiscalRegime,
      cfdiUse: data.cfdiUse,
      paymentMethod: data.paymentMethod,
      paymentForm: data.paymentForm,
      cfdiUuid: null,
      cfdiXml: null,
      cfdiSealedAt: null,
      issuedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      workOrder: embed,
    }
    this.store.set(record.id, record)
    return Promise.resolve(record)
  }

  findById(id: string, branchId: string): Promise<InvoiceRecord | null> {
    const record = this.store.get(id)
    if (!record || record.branchId !== branchId) return Promise.resolve(null)
    return Promise.resolve(record)
  }

  findByWorkOrder(workOrderId: string): Promise<InvoiceRecord | null> {
    const record = Array.from(this.store.values()).find(
      r => r.workOrderId === workOrderId
    )
    return Promise.resolve(record ?? null)
  }

  findAll(branchId: string, filters: InvoiceFilters): Promise<InvoicePage> {
    let records = Array.from(this.store.values()).filter(
      r => r.branchId === branchId
    )
    if (filters.status) {
      records = records.filter(r => r.status === filters.status)
    }
    const total = records.length
    const start = (filters.page - 1) * filters.limit
    const data = records.slice(start, start + filters.limit)
    return Promise.resolve({
      data,
      total,
      page: filters.page,
      limit: filters.limit,
    })
  }

  update(
    id: string,
    branchId: string,
    data: UpdateInvoiceData
  ): Promise<InvoiceRecord> {
    const record = this.store.get(id)!
    const updated: InvoiceRecord = {
      ...record,
      customerTaxId:
        data.customerTaxId !== undefined
          ? (data.customerTaxId ?? null)
          : record.customerTaxId,
      customerName:
        data.customerName !== undefined
          ? (data.customerName ?? null)
          : record.customerName,
      customerAddress:
        data.customerAddress !== undefined
          ? (data.customerAddress ?? null)
          : record.customerAddress,
      customerZipCode:
        data.customerZipCode !== undefined
          ? (data.customerZipCode ?? null)
          : record.customerZipCode,
      customerFiscalRegime:
        data.customerFiscalRegime !== undefined
          ? (data.customerFiscalRegime ?? null)
          : record.customerFiscalRegime,
      cfdiUse:
        data.cfdiUse !== undefined ? (data.cfdiUse ?? null) : record.cfdiUse,
      paymentMethod:
        data.paymentMethod !== undefined
          ? (data.paymentMethod ?? null)
          : record.paymentMethod,
      paymentForm:
        data.paymentForm !== undefined
          ? (data.paymentForm ?? null)
          : record.paymentForm,
      updatedAt: new Date(),
    }
    this.store.set(id, updated)
    return Promise.resolve(updated)
  }

  updateStatus(
    id: string,
    branchId: string,
    status: InvoiceStatus,
    issuedAt?: Date
  ): Promise<InvoiceRecord> {
    const record = this.store.get(id)!
    const updated: InvoiceRecord = {
      ...record,
      status,
      issuedAt: issuedAt ?? record.issuedAt,
      updatedAt: new Date(),
    }
    this.store.set(id, updated)
    return Promise.resolve(updated)
  }
}
