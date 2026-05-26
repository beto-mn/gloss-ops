import { Test, type TestingModule } from '@nestjs/testing'
import { NotFoundException } from '@nestjs/common'
import {
  ActivityAction,
  InvoiceStatus,
  WorkOrderStatus,
} from '@glossops/database'

import { InMemoryInvoiceRepository } from './infrastructure/in-memory-invoice.repository'
import { ActivityLogsService } from '../activity-logs/activity-logs.service'
import { WorkOrdersService } from '../work-orders/work-orders.service'
import type { WorkOrderWithItems } from '../work-orders/interfaces'
import { INVOICE_REPOSITORY } from './invoices.tokens'
import { InvoicesService } from './invoices.service'
import type { InvoiceRecord } from './interfaces'

const BRANCH_ID = 'branch-1'
const ORG_ID = 'org-1'
const ACCOUNT_ID = 'acc-1'
const WO_ID = 'wo-1'
const ASSET_ID = 'asset-1'

const makeWoEmbed = (status: WorkOrderStatus = WorkOrderStatus.COMPLETED) => ({
  id: WO_ID,
  status,
  totalAmount: 1000,
  asset: { id: ASSET_ID, assetType: 'VEHICLE', model: 'Civic', year: 2020 },
})

const makeWoRecord = (status: WorkOrderStatus = WorkOrderStatus.COMPLETED) => ({
  id: WO_ID,
  branchId: BRANCH_ID,
  status,
  totalAmount: 1000,
  assetId: ASSET_ID,
})

const seedInvoice = (
  repo: InMemoryInvoiceRepository,
  status: InvoiceStatus = InvoiceStatus.DRAFT
): InvoiceRecord => {
  const id = 'inv-1'
  const record: InvoiceRecord = {
    id,
    branchId: BRANCH_ID,
    workOrderId: WO_ID,
    status,
    folio: `INV-2026-0001`,
    subtotal: 1000,
    taxRate: 0.16,
    taxAmount: 160,
    total: 1160,
    customerTaxId: null,
    customerName: null,
    customerAddress: null,
    customerZipCode: null,
    customerFiscalRegime: null,
    cfdiUse: null,
    paymentMethod: null,
    paymentForm: null,
    cfdiUuid: null,
    cfdiXml: null,
    cfdiSealedAt: null,
    issuedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    workOrder: makeWoEmbed(WorkOrderStatus.COMPLETED),
  }
  repo.store.set(id, record)
  return record
}

describe('InvoicesService', () => {
  let service: InvoicesService
  let repo: InMemoryInvoiceRepository
  let workOrdersService: jest.Mocked<Pick<WorkOrdersService, 'findOne'>>
  let activityLogs: jest.Mocked<Pick<ActivityLogsService, 'record'>>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesService,
        { provide: INVOICE_REPOSITORY, useClass: InMemoryInvoiceRepository },
        {
          provide: WorkOrdersService,
          useValue: { findOne: jest.fn() },
        },
        {
          provide: ActivityLogsService,
          useValue: { record: jest.fn() },
        },
      ],
    }).compile()

    service = module.get(InvoicesService)
    repo = module.get(INVOICE_REPOSITORY)
    workOrdersService = module.get(WorkOrdersService)
    activityLogs = module.get(ActivityLogsService)
  })

  afterEach(() => {
    repo.store.clear()
    jest.clearAllMocks()
  })

  // ── create ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates invoice in DRAFT with correct folio and computed totals', async () => {
      workOrdersService.findOne.mockResolvedValue(
        makeWoRecord() as unknown as WorkOrderWithItems
      )
      repo.seedWorkOrder(WO_ID, makeWoEmbed())

      const result = await service.create(
        BRANCH_ID,
        ORG_ID,
        { workOrderId: WO_ID },
        ACCOUNT_ID
      )

      expect(result.status).toBe(InvoiceStatus.DRAFT)
      expect(result.folio).toMatch(/^INV-\d{4}-0001$/)
      expect(result.subtotal).toBe(1000)
      expect(result.taxRate).toBe(0.16)
      expect(result.taxAmount).toBe(160)
      expect(result.total).toBe(1160)
    })

    it('records activity log on creation', async () => {
      workOrdersService.findOne.mockResolvedValue(
        makeWoRecord() as unknown as WorkOrderWithItems
      )
      repo.seedWorkOrder(WO_ID, makeWoEmbed())
      activityLogs.record.mockResolvedValue(undefined)

      const result = await service.create(
        BRANCH_ID,
        ORG_ID,
        { workOrderId: WO_ID },
        ACCOUNT_ID
      )

      expect(activityLogs.record).toHaveBeenCalledWith({
        organizationId: ORG_ID,
        branchId: BRANCH_ID,
        accountId: ACCOUNT_ID,
        action: ActivityAction.CREATED,
        entity: 'Invoice',
        entityId: result.id,
      })
    })

    it('throws 404 work_order_not_found when WO belongs to a different branch', async () => {
      workOrdersService.findOne.mockResolvedValue({
        ...makeWoRecord(),
        branchId: 'other-branch',
      } as unknown as WorkOrderWithItems)

      await expect(
        service.create(BRANCH_ID, ORG_ID, { workOrderId: WO_ID }, ACCOUNT_ID)
      ).rejects.toMatchObject({ response: { error: 'work_order_not_found' } })
    })

    it('throws 404 work_order_not_found when WO does not exist', async () => {
      workOrdersService.findOne.mockRejectedValue(
        new NotFoundException({ error: 'work_order_not_found' })
      )

      await expect(
        service.create(BRANCH_ID, ORG_ID, { workOrderId: WO_ID }, ACCOUNT_ID)
      ).rejects.toBeInstanceOf(NotFoundException)
    })

    it('throws 409 invoice_already_exists when WO already has an invoice', async () => {
      workOrdersService.findOne.mockResolvedValue(
        makeWoRecord() as unknown as WorkOrderWithItems
      )
      seedInvoice(repo)

      await expect(
        service.create(BRANCH_ID, ORG_ID, { workOrderId: WO_ID }, ACCOUNT_ID)
      ).rejects.toMatchObject({ response: { error: 'invoice_already_exists' } })
    })
  })

  // ── findAll ────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns paginated invoices for the branch', async () => {
      seedInvoice(repo)

      const result = await service.findAll(BRANCH_ID, { page: 1, limit: 20 })

      expect(result.data).toHaveLength(1)
      expect(result.total).toBe(1)
    })
  })

  // ── findOne ────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('returns the invoice', async () => {
      const seeded = seedInvoice(repo)

      const result = await service.findOne(seeded.id, BRANCH_ID)

      expect(result.id).toBe(seeded.id)
    })

    it('throws 404 invoice_not_found when not found', async () => {
      await expect(
        service.findOne('nonexistent', BRANCH_ID)
      ).rejects.toMatchObject({ response: { error: 'invoice_not_found' } })
    })
  })

  // ── findByWorkOrder ────────────────────────────────────────────────────────

  describe('findByWorkOrder', () => {
    it('returns the invoice for the work order', async () => {
      seedInvoice(repo)

      const result = await service.findByWorkOrder(WO_ID, BRANCH_ID)

      expect(result.workOrderId).toBe(WO_ID)
    })

    it('throws 404 invoice_not_found when no invoice exists for the WO', async () => {
      await expect(
        service.findByWorkOrder(WO_ID, BRANCH_ID)
      ).rejects.toMatchObject({ response: { error: 'invoice_not_found' } })
    })
  })

  // ── update ─────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('updates fiscal data on a DRAFT invoice', async () => {
      const seeded = seedInvoice(repo, InvoiceStatus.DRAFT)

      const result = await service.update(seeded.id, BRANCH_ID, {
        customerName: 'Empresa SA',
        customerTaxId: 'RFC123',
      })

      expect(result.customerName).toBe('Empresa SA')
      expect(result.customerTaxId).toBe('RFC123')
    })

    it('throws 409 invoice_not_editable when invoice is not DRAFT', async () => {
      const seeded = seedInvoice(repo, InvoiceStatus.ISSUED)

      await expect(
        service.update(seeded.id, BRANCH_ID, { customerName: 'X' })
      ).rejects.toMatchObject({ response: { error: 'invoice_not_editable' } })
    })
  })

  // ── transition ─────────────────────────────────────────────────────────────

  describe('transition', () => {
    it('transitions DRAFT → ISSUED when WO is COMPLETED and sets issuedAt', async () => {
      const seeded = seedInvoice(repo, InvoiceStatus.DRAFT)

      const result = await service.transition(
        seeded.id,
        BRANCH_ID,
        ORG_ID,
        InvoiceStatus.ISSUED,
        ACCOUNT_ID
      )

      expect(result.status).toBe(InvoiceStatus.ISSUED)
      expect(result.issuedAt).toBeInstanceOf(Date)
    })

    it('throws 409 work_order_not_completed when DRAFT → ISSUED and WO is not COMPLETED', async () => {
      const invoice: InvoiceRecord = {
        ...seedInvoice(repo, InvoiceStatus.DRAFT),
        workOrder: makeWoEmbed(WorkOrderStatus.IN_PROGRESS),
      }
      repo.store.set(invoice.id, invoice)

      await expect(
        service.transition(
          invoice.id,
          BRANCH_ID,
          ORG_ID,
          InvoiceStatus.ISSUED,
          ACCOUNT_ID
        )
      ).rejects.toMatchObject({
        response: { error: 'work_order_not_completed' },
      })
    })

    it('transitions DRAFT → CANCELLED', async () => {
      const seeded = seedInvoice(repo, InvoiceStatus.DRAFT)

      const result = await service.transition(
        seeded.id,
        BRANCH_ID,
        ORG_ID,
        InvoiceStatus.CANCELLED,
        ACCOUNT_ID
      )

      expect(result.status).toBe(InvoiceStatus.CANCELLED)
    })

    it('transitions ISSUED → PAID', async () => {
      const seeded = seedInvoice(repo, InvoiceStatus.ISSUED)

      const result = await service.transition(
        seeded.id,
        BRANCH_ID,
        ORG_ID,
        InvoiceStatus.PAID,
        ACCOUNT_ID
      )

      expect(result.status).toBe(InvoiceStatus.PAID)
    })

    it('transitions ISSUED → CANCELLED', async () => {
      const seeded = seedInvoice(repo, InvoiceStatus.ISSUED)

      const result = await service.transition(
        seeded.id,
        BRANCH_ID,
        ORG_ID,
        InvoiceStatus.CANCELLED,
        ACCOUNT_ID
      )

      expect(result.status).toBe(InvoiceStatus.CANCELLED)
    })

    it('throws 409 invalid_status_transition for PAID → any', async () => {
      const seeded = seedInvoice(repo, InvoiceStatus.PAID)

      await expect(
        service.transition(
          seeded.id,
          BRANCH_ID,
          ORG_ID,
          InvoiceStatus.CANCELLED,
          ACCOUNT_ID
        )
      ).rejects.toMatchObject({
        response: { error: 'invalid_status_transition' },
      })
    })

    it('throws 409 invalid_status_transition for CANCELLED → any', async () => {
      const seeded = seedInvoice(repo, InvoiceStatus.CANCELLED)

      await expect(
        service.transition(
          seeded.id,
          BRANCH_ID,
          ORG_ID,
          InvoiceStatus.ISSUED,
          ACCOUNT_ID
        )
      ).rejects.toMatchObject({
        response: { error: 'invalid_status_transition' },
      })
    })

    it('throws 409 invalid_status_transition for DRAFT → PAID (skipping ISSUED)', async () => {
      const seeded = seedInvoice(repo, InvoiceStatus.DRAFT)

      await expect(
        service.transition(
          seeded.id,
          BRANCH_ID,
          ORG_ID,
          InvoiceStatus.PAID,
          ACCOUNT_ID
        )
      ).rejects.toMatchObject({
        response: { error: 'invalid_status_transition' },
      })
    })

    it('records activity log with STATUS_CHANGED on transition', async () => {
      const seeded = seedInvoice(repo, InvoiceStatus.DRAFT)
      activityLogs.record.mockResolvedValue(undefined)

      await service.transition(
        seeded.id,
        BRANCH_ID,
        ORG_ID,
        InvoiceStatus.CANCELLED,
        ACCOUNT_ID
      )

      expect(activityLogs.record).toHaveBeenCalledWith({
        organizationId: ORG_ID,
        branchId: BRANCH_ID,
        accountId: ACCOUNT_ID,
        action: ActivityAction.STATUS_CHANGED,
        entity: 'Invoice',
        entityId: seeded.id,
        metadata: { from: InvoiceStatus.DRAFT, to: InvoiceStatus.CANCELLED },
      })
    })
  })
})
