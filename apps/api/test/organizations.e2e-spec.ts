import type { INestApplication } from '@nestjs/common'
import type TestAgent from 'supertest/lib/agent'
import { z } from 'zod'

import {
  OrganizationWithRoleSchema,
  InvitationCreatedSchema,
  MemberWithAccountSchema,
  OrganizationSchema,
} from '@glossops/shared'

import {
  createTestApp,
  parseWith,
  seedTenant,
  type SeededTenant,
} from './helpers'

const OrganizationWithRoleListSchema = z.array(OrganizationWithRoleSchema)
const MemberWithAccountListSchema = z.array(MemberWithAccountSchema)

describe('Organizations (e2e)', () => {
  let app: INestApplication
  let http: TestAgent
  let tenant: SeededTenant

  beforeAll(async () => {
    ;({ app, http } = await createTestApp())
    tenant = await seedTenant(http)
  })

  afterAll(async () => {
    await app.close()
  })

  describe('GET /organizations', () => {
    it('200 — lists my organizations', async () => {
      const res = await http
        .get('/organizations')
        .set('Authorization', `Bearer ${tenant.accessToken}`)
        .expect(200)

      const list = parseWith(OrganizationWithRoleListSchema)(res)
      expect(list.length).toBeGreaterThanOrEqual(1)
      expect(list[0].role).toEqual(expect.any(String))
    })
  })

  describe('GET /organizations/me', () => {
    it('200 — returns the current organization (validated via OrganizationSchema)', async () => {
      const res = await http.get('/organizations/me').set(tenant.authHeaders)
      const org = parseWith(OrganizationSchema)(res)
      expect(org.id).toBe(tenant.organizationId)
    })
  })

  describe('PATCH /organizations/me', () => {
    it('200 — updates organization name', async () => {
      const newName = 'Updated Org Name ' + Date.now()
      const res = await http
        .patch('/organizations/me')
        .set(tenant.authHeaders)
        .send({ name: newName })

      const org = parseWith(OrganizationSchema)(res)
      expect(org.name).toBe(newName)
    })
  })

  describe('GET /organizations/me/members', () => {
    it('200 — lists current organization members', async () => {
      const res = await http
        .get('/organizations/me/members')
        .set(tenant.authHeaders)
        .expect(200)

      const members = parseWith(MemberWithAccountListSchema)(res)
      const owner = members.find(m => m.accountId === tenant.accountId)
      expect(owner).toBeDefined()
      expect(owner?.role).toBe('OWNER')
    })
  })

  describe('POST /organizations/invitations', () => {
    it('201 — creates an invitation with explicit branchId', async () => {
      const res = await http
        .post('/organizations/invitations')
        .set(tenant.authHeaders)
        .send({
          email: `inv-${Date.now()}@e2e.test`,
          role: 'TECHNICIAN',
          branchId: tenant.branchId,
        })
        .expect(201)

      const body = parseWith(InvitationCreatedSchema)(res)
      expect(body.invitationUrl).toContain('invitations/accept')
    })
  })

  describe('DELETE /organizations/me', () => {
    it('204 — soft-deletes organization, then GET /me returns 404 (separate tenant)', async () => {
      const tmp = await seedTenant(http)
      await http.delete('/organizations/me').set(tmp.authHeaders).expect(204)

      // After soft-delete the org is INACTIVE; `getMyOrganization` filters on ACTIVE → 404.
      await http.get('/organizations/me').set(tmp.authHeaders).expect(404)
    })

    it('204 — ?permanent=true is silently ignored (soft-delete only)', async () => {
      const tmp = await seedTenant(http)
      // The validation pipe strips unknown query keys. The flag has no destructive effect.
      await http
        .delete('/organizations/me?permanent=true')
        .set(tmp.authHeaders)
        .expect(204)

      await http.get('/organizations/me').set(tmp.authHeaders).expect(404)
    })
  })
})
