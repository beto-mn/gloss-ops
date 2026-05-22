import { Injectable } from '@nestjs/common'

import type { Prisma } from '@glossops/database'
import { InvoiceStatus } from '@glossops/database'

import { PrismaService } from '@prisma'
import type {
  InvoiceRepositoryInterface,
  CreateInvoiceData,
  UpdateInvoiceData,
  InvoiceFilters,
  InvoiceRecord,
  InvoicePage,
} from '@invoices/interfaces'

const includeForRecord = {
  workOrder: {
    include: {
      asset: { select: { id: true, assetType: true, model: true, year: true } },
    },
  },
} as const

@Injectable()
export class PrismaInvoiceRepository implements InvoiceRepositoryInterface {
  constructor(private readonly prisma: PrismaService) {}

  private toRecord(
    row: Prisma.InvoiceGetPayload<{ include: typeof includeForRecord }>
  ): InvoiceRecord {
    return {
      id: row.id,
      branchId: row.branchId,
      workOrderId: row.workOrderId,
      status: row.status,
      folio: row.folio,
      subtotal: Number(row.subtotal),
      taxRate: Number(row.taxRate),
      taxAmount: Number(row.taxAmount),
      total: Number(row.total),
      customerTaxId: row.customerTaxId,
      customerName: row.customerName,
      customerAddress: row.customerAddress,
      customerZipCode: row.customerZipCode,
      customerFiscalRegime: row.customerFiscalRegime,
      cfdiUse: row.cfdiUse,
      paymentMethod: row.paymentMethod,
      paymentForm: row.paymentForm,
      cfdiUuid: row.cfdiUuid,
      cfdiXml: row.cfdiXml,
      cfdiSealedAt: row.cfdiSealedAt,
      issuedAt: row.issuedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      workOrder: {
        id: row.workOrder.id,
        status: row.workOrder.status,
        totalAmount: Number(row.workOrder.totalAmount),
        asset: {
          id: row.workOrder.asset.id,
          assetType: row.workOrder.asset.assetType,
          model: row.workOrder.asset.model,
          year: row.workOrder.asset.year,
        },
      },
    }
  }

  async create(data: CreateInvoiceData): Promise<InvoiceRecord> {
    return this.prisma.$transaction(async tx => {
      const counter = await tx.invoiceCounter.upsert({
        where: { branchId: data.branchId },
        create: { branchId: data.branchId, lastSeq: 1 },
        update: { lastSeq: { increment: 1 } },
      })
      const year = new Date().getFullYear()
      const folio = `INV-${year}-${String(counter.lastSeq).padStart(4, '0')}`
      const row = await tx.invoice.create({
        data: {
          branchId: data.branchId,
          workOrderId: data.workOrderId,
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
        },
        include: includeForRecord,
      })
      return this.toRecord(row)
    })
  }

  async findById(id: string, branchId: string): Promise<InvoiceRecord | null> {
    const row = await this.prisma.invoice.findFirst({
      where: { id, branchId },
      include: includeForRecord,
    })
    return row ? this.toRecord(row) : null
  }

  async findByWorkOrder(workOrderId: string): Promise<InvoiceRecord | null> {
    const row = await this.prisma.invoice.findUnique({
      where: { workOrderId },
      include: includeForRecord,
    })
    return row ? this.toRecord(row) : null
  }

  async findAll(
    branchId: string,
    filters: InvoiceFilters
  ): Promise<InvoicePage> {
    const where: Prisma.InvoiceWhereInput = {
      branchId,
      ...(filters.status ? { status: filters.status } : {}),
    }
    const [data, total] = await this.prisma.$transaction([
      this.prisma.invoice.findMany({
        where,
        include: includeForRecord,
        orderBy: { createdAt: 'desc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      this.prisma.invoice.count({ where }),
    ])
    return {
      data: data.map(row => this.toRecord(row)),
      total,
      page: filters.page,
      limit: filters.limit,
    }
  }

  async update(
    id: string,
    branchId: string,
    data: UpdateInvoiceData
  ): Promise<InvoiceRecord> {
    const row = await this.prisma.invoice.update({
      where: { id },
      data: {
        customerTaxId: data.customerTaxId,
        customerName: data.customerName,
        customerAddress: data.customerAddress,
        customerZipCode: data.customerZipCode,
        customerFiscalRegime: data.customerFiscalRegime,
        cfdiUse: data.cfdiUse,
        paymentMethod: data.paymentMethod,
        paymentForm: data.paymentForm,
      },
      include: includeForRecord,
    })
    return this.toRecord(row)
  }

  async updateStatus(
    id: string,
    branchId: string,
    status: InvoiceStatus,
    issuedAt?: Date
  ): Promise<InvoiceRecord> {
    const row = await this.prisma.invoice.update({
      where: { id },
      data: { status, ...(issuedAt ? { issuedAt } : {}) },
      include: includeForRecord,
    })
    return this.toRecord(row)
  }
}
