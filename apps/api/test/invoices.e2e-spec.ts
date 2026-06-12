import type { INestApplication } from '@nestjs/common'
import type TestAgent from 'supertest/lib/agent'

import {
  WorkOrderCreateResponseSchema,
  CustomerCreateResponseSchema,
  CustomerAssetSchema,
  InvoicePageSchema,
  ServiceSchema,
  InvoiceSchema,
  BrandSchema,
} from '@glossops/shared'

import {
  createTestApp,
  parseWith,
  seedTenant,
  type SeededTenant,
} from './helpers'

describe('Invoices (e2e)', () => {
  let app: INestApplication
  let http: TestAgent
  let tenant: SeededTenant
  let workOrderId: string
  let invoiceId: string

  beforeAll(async () => {
    ;({ app, http } = await createTestApp())
    tenant = await seedTenant(http)

    const cRes = await http
      .post('/customers')
      .set(tenant.authHeaders)
      .send({ firstName: 'Inv', lastName: 'Customer' })
    const customerId = parseWith(CustomerCreateResponseSchema)(cRes).id

    const bRes = await http
      .post('/brands')
      .set(tenant.authHeaders)
      .send({
        name: 'Inv Brand',
        slug: 'inv-' + Date.now(),
        category: 'VEHICLE',
      })
    const brandId = parseWith(BrandSchema)(bRes).id

    const aRes = await http
      .post(`/customers/${customerId}/assets`)
      .set(tenant.authHeaders)
      .send({
        assetType: 'VEHICLE',
        brandId,
        model: 'Pilot',
        identifier: 'INV-' + Date.now(),
      })
    const assetId = parseWith(CustomerAssetSchema)(aRes).id

    const sRes = await http
      .post('/services')
      .set(tenant.authHeaders)
      .send({ name: 'Inv Svc ' + Date.now(), basePrice: 1500 })
    const serviceId = parseWith(ServiceSchema)(sRes).id

    const woRes = await http
      .post('/work-orders')
      .set(tenant.authHeaders)
      .send({
        assetId,
        type: 'STANDARD',
        items: [{ serviceId, quantity: 1, unitPrice: 1500 }],
      })
      .expect(201)
    workOrderId = parseWith(WorkOrderCreateResponseSchema)(woRes).id

    for (const status of ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED']) {
      await http
        .patch(`/work-orders/${workOrderId}/status`)
        .set(tenant.authHeaders)
        .send({ status })
        .expect(200)
    }
  })

  afterAll(async () => {
    await app.close()
  })

  it('POST /invoices — creates an invoice for a COMPLETED work order', async () => {
    const res = await http
      .post('/invoices')
      .set(tenant.authHeaders)
      .send({ workOrderId })
      .expect(201)

    const invoice = parseWith(InvoiceSchema)(res)
    expect(invoice.workOrderId).toBe(workOrderId)
    expect(invoice.status).toBe('DRAFT')
    expect(invoice.folio).toEqual(expect.any(String))
    // D7: Decimal fields arrive as JS numbers after parsing
    expect(typeof invoice.total).toBe('number')
    expect(typeof invoice.subtotal).toBe('number')
    expect(typeof invoice.taxAmount).toBe('number')
    invoiceId = invoice.id
  })

  it('GET /invoices — lists invoices for the branch', async () => {
    const res = await http.get('/invoices').set(tenant.authHeaders).expect(200)

    const page = parseWith(InvoicePageSchema)(res)
    expect(page.data.some(i => i.id === invoiceId)).toBe(true)
    expect(typeof page.total).toBe('number')
  })

  it('GET /invoices/:id — returns invoice detail', async () => {
    const res = await http
      .get(`/invoices/${invoiceId}`)
      .set(tenant.authHeaders)
      .expect(200)
    const invoice = parseWith(InvoiceSchema)(res)
    expect(invoice.id).toBe(invoiceId)
  })

  it('PATCH /invoices/:id — updates fiscal data on DRAFT invoice', async () => {
    const res = await http
      .patch(`/invoices/${invoiceId}`)
      .set(tenant.authHeaders)
      .send({ customerName: 'Test Customer', customerTaxId: 'TEST123' })
      .expect(200)
    const invoice = parseWith(InvoiceSchema)(res)
    expect(invoice.customerName).toBe('Test Customer')
  })

  it('PATCH /invoices/:id/status — DRAFT → ISSUED', async () => {
    const res = await http
      .patch(`/invoices/${invoiceId}/status`)
      .set(tenant.authHeaders)
      .send({ status: 'ISSUED' })
      .expect(200)
    const invoice = parseWith(InvoiceSchema)(res)
    expect(invoice.status).toBe('ISSUED')
  })

  it('GET /work-orders/:id/invoice — returns invoice for a work order', async () => {
    const res = await http
      .get(`/work-orders/${workOrderId}/invoice`)
      .set(tenant.authHeaders)
      .expect(200)
    const invoice = parseWith(InvoiceSchema)(res)
    expect(invoice.workOrderId).toBe(workOrderId)
  })
})
