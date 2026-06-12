import type { INestApplication } from '@nestjs/common'
import type TestAgent from 'supertest/lib/agent'

import {
  BrandSchema,
  CustomerAssetSchema,
  ServiceSchema,
} from '@glossops/shared'

import {
  createTestApp,
  parseWith,
  seedTenant,
  type SeededTenant,
} from './helpers'

// no shared schema yet — TODO publish CustomerCreateResponseSchema in @glossops/shared
interface CustomerCreateResponse {
  id: string
}

// no shared schema yet — TODO publish WorkOrderCreateResponseSchema in @glossops/shared
interface WorkOrderCreateResponse {
  id: string
}

// no shared schema yet — TODO publish InvoiceResponseSchema in @glossops/shared
// (InvoiceSchema declares subtotal/tax/total as z.number(), API returns Prisma.Decimal serialized as strings)
interface InvoiceResponse {
  id: string
  workOrderId: string
  status: string
  folio: string
  customerName?: string
}

// no shared schema yet — TODO publish InvoicePageSchema in @glossops/shared
// (list wrapper is flat {data, total, page, limit}, unlike branches/customers nested meta)
interface InvoicePageResponse {
  data: InvoiceResponse[]
  total: number
  page: number
  limit: number
}

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
    const customerId = (cRes.body as CustomerCreateResponse).id

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
    workOrderId = (woRes.body as WorkOrderCreateResponse).id

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

    // no shared schema yet — TODO publish InvoiceResponseSchema in @glossops/shared
    expect(res.body).toEqual(
      expect.objectContaining({
        id: expect.any(String) as unknown,
        workOrderId,
        status: 'DRAFT',
        folio: expect.any(String) as unknown,
      })
    )
    invoiceId = (res.body as InvoiceResponse).id
  })

  it('GET /invoices — lists invoices for the branch', async () => {
    const res = await http.get('/invoices').set(tenant.authHeaders).expect(200)

    // no shared schema yet — TODO publish InvoicePageSchema in @glossops/shared
    expect(res.body).toEqual(
      expect.objectContaining({
        data: expect.any(Array) as unknown,
        total: expect.any(Number) as unknown,
        page: expect.any(Number) as unknown,
        limit: expect.any(Number) as unknown,
      })
    )
    const page = res.body as InvoicePageResponse
    expect(page.data.some(i => i.id === invoiceId)).toBe(true)
  })

  it('GET /invoices/:id — returns invoice detail', async () => {
    const res = await http
      .get(`/invoices/${invoiceId}`)
      .set(tenant.authHeaders)
      .expect(200)
    // no shared schema yet — TODO publish InvoiceResponseSchema in @glossops/shared
    expect((res.body as InvoiceResponse).id).toBe(invoiceId)
  })

  it('PATCH /invoices/:id — updates fiscal data on DRAFT invoice', async () => {
    const res = await http
      .patch(`/invoices/${invoiceId}`)
      .set(tenant.authHeaders)
      .send({ customerName: 'Test Customer', customerTaxId: 'TEST123' })
      .expect(200)
    expect((res.body as InvoiceResponse).customerName).toBe('Test Customer')
  })

  it('PATCH /invoices/:id/status — DRAFT → ISSUED', async () => {
    const res = await http
      .patch(`/invoices/${invoiceId}/status`)
      .set(tenant.authHeaders)
      .send({ status: 'ISSUED' })
      .expect(200)
    expect((res.body as InvoiceResponse).status).toBe('ISSUED')
  })

  it('GET /work-orders/:id/invoice — returns invoice for a work order', async () => {
    const res = await http
      .get(`/work-orders/${workOrderId}/invoice`)
      .set(tenant.authHeaders)
      .expect(200)
    // no shared schema yet — TODO publish InvoiceResponseSchema in @glossops/shared
    expect((res.body as InvoiceResponse).workOrderId).toBe(workOrderId)
  })
})
