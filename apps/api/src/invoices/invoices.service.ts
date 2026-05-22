import {
  ConflictException,
  NotFoundException,
  Injectable,
  Inject,
} from '@nestjs/common'
import {
  ActivityAction,
  InvoiceStatus,
  WorkOrderStatus,
} from '@glossops/database'

import type {
  InvoiceRepositoryInterface,
  InvoiceRecord,
  InvoicePage,
} from '@invoices/interfaces'

import type { CreateInvoiceDto, ListInvoicesDto, UpdateInvoiceDto } from './dto'
import { ActivityLogsService } from '../activity-logs/activity-logs.service'
import { WorkOrdersService } from '../work-orders/work-orders.service'
import { INVOICE_REPOSITORY } from './invoices.tokens'

const TAX_RATE = 0.16

const VALID_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  [InvoiceStatus.DRAFT]: [InvoiceStatus.ISSUED, InvoiceStatus.CANCELLED],
  [InvoiceStatus.ISSUED]: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED],
  [InvoiceStatus.PAID]: [],
  [InvoiceStatus.CANCELLED]: [],
}

@Injectable()
export class InvoicesService {
  constructor(
    @Inject(INVOICE_REPOSITORY)
    private readonly repo: InvoiceRepositoryInterface,
    private readonly workOrdersService: WorkOrdersService,
    private readonly activityLogs: ActivityLogsService
  ) {}

  async create(
    branchId: string,
    organizationId: string,
    dto: CreateInvoiceDto,
    accountId: string
  ): Promise<InvoiceRecord> {
    const wo = await this.workOrdersService.findOne(
      dto.workOrderId,
      organizationId
    )
    if (wo.branchId !== branchId) {
      throw new NotFoundException({ error: 'work_order_not_found' })
    }
    const existing = await this.repo.findByWorkOrder(dto.workOrderId)
    if (existing) {
      throw new ConflictException({ error: 'invoice_already_exists' })
    }
    const subtotal = Number(wo.totalAmount)
    const taxAmount = Math.round(subtotal * TAX_RATE * 100) / 100
    const total = Math.round((subtotal + taxAmount) * 100) / 100

    const invoice = await this.repo.create({
      branchId,
      workOrderId: dto.workOrderId,
      subtotal,
      taxRate: TAX_RATE,
      taxAmount,
      total,
      customerTaxId: dto.customerTaxId ?? null,
      customerName: dto.customerName ?? null,
      customerAddress: dto.customerAddress ?? null,
      customerZipCode: dto.customerZipCode ?? null,
      customerFiscalRegime: dto.customerFiscalRegime ?? null,
      cfdiUse: dto.cfdiUse ?? null,
      paymentMethod: dto.paymentMethod ?? null,
      paymentForm: dto.paymentForm ?? null,
    })
    await this.activityLogs.record({
      organizationId,
      branchId,
      accountId,
      action: ActivityAction.CREATED,
      entity: 'Invoice',
      entityId: invoice.id,
    })
    return invoice
  }

  findAll(branchId: string, dto: ListInvoicesDto): Promise<InvoicePage> {
    return this.repo.findAll(branchId, {
      status: dto.status,
      page: dto.page ?? 1,
      limit: dto.limit ?? 20,
    })
  }

  async findOne(id: string, branchId: string): Promise<InvoiceRecord> {
    const invoice = await this.repo.findById(id, branchId)
    if (!invoice) throw new NotFoundException({ error: 'invoice_not_found' })
    return invoice
  }

  async findByWorkOrder(
    workOrderId: string,
    branchId: string
  ): Promise<InvoiceRecord> {
    const invoice = await this.repo.findByWorkOrder(workOrderId)
    if (!invoice || invoice.branchId !== branchId) {
      throw new NotFoundException({ error: 'invoice_not_found' })
    }
    return invoice
  }

  async update(
    id: string,
    branchId: string,
    dto: UpdateInvoiceDto
  ): Promise<InvoiceRecord> {
    const invoice = await this.findOne(id, branchId)
    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new ConflictException({ error: 'invoice_not_editable' })
    }
    return this.repo.update(id, branchId, {
      customerTaxId: dto.customerTaxId,
      customerName: dto.customerName,
      customerAddress: dto.customerAddress,
      customerZipCode: dto.customerZipCode,
      customerFiscalRegime: dto.customerFiscalRegime,
      cfdiUse: dto.cfdiUse,
      paymentMethod: dto.paymentMethod,
      paymentForm: dto.paymentForm,
    })
  }

  async transition(
    id: string,
    branchId: string,
    organizationId: string,
    newStatus: InvoiceStatus,
    accountId: string
  ): Promise<InvoiceRecord> {
    const invoice = await this.findOne(id, branchId)
    if (!VALID_TRANSITIONS[invoice.status].includes(newStatus)) {
      throw new ConflictException({ error: 'invalid_status_transition' })
    }
    if (
      newStatus === InvoiceStatus.ISSUED &&
      invoice.workOrder.status !== WorkOrderStatus.COMPLETED
    ) {
      throw new ConflictException({ error: 'work_order_not_completed' })
    }
    const issuedAt = newStatus === InvoiceStatus.ISSUED ? new Date() : undefined
    const updated = await this.repo.updateStatus(
      id,
      branchId,
      newStatus,
      issuedAt
    )
    await this.activityLogs.record({
      organizationId,
      branchId,
      accountId,
      action: ActivityAction.STATUS_CHANGED,
      entity: 'Invoice',
      entityId: id,
      metadata: { from: invoice.status, to: newStatus },
    })
    return updated
  }
}
