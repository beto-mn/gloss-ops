import type { INestApplication } from '@nestjs/common'
import type TestAgent from 'supertest/lib/agent'
import { z } from 'zod'

import { OrganizationSchema } from '@glossops/shared'

import {
  createTestApp,
  parseWith,
  seedTenant,
  type SeededTenant,
} from './helpers'

// no shared schema yet — TODO publish OrganizationWithRoleSchema in @glossops/shared (Organization + role)
interface OrganizationWithRole {
  id: string
  name: string
  slug: string
  role: string
}

// no shared schema yet — TODO publish MemberWithAccountSchema in @glossops/shared
interface MemberWithAccount {
  id: string
  branchId: string
  accountId: string
  role: string
}

// no shared schema yet — TODO publish InvitationCreatedSchema in @glossops/shared
interface InvitationCreated {
  invitationUrl: string
}

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

      // no shared schema yet — TODO publish OrganizationWithRoleSchema in @glossops/shared (Organization + role)
      const list = res.body as OrganizationWithRole[]
      expect(Array.isArray(list)).toBe(true)
      expect(list.length).toBeGreaterThanOrEqual(1)
      expect(list[0]).toEqual(
        expect.objectContaining({
          id: expect.any(String) as unknown,
          name: expect.any(String) as unknown,
          slug: expect.any(String) as unknown,
          role: expect.any(String) as unknown,
        })
      )
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

      // no shared schema yet — TODO publish MemberWithAccountSchema in @glossops/shared
      const members = res.body as MemberWithAccount[]
      expect(Array.isArray(members)).toBe(true)
      expect(members[0]).toEqual(
        expect.objectContaining({
          id: expect.any(String) as unknown,
          branchId: expect.any(String) as unknown,
          accountId: tenant.accountId,
          role: 'OWNER',
        })
      )
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

      // no shared schema yet — TODO publish InvitationCreatedSchema in @glossops/shared
      expect(res.body).toEqual(
        expect.objectContaining({
          invitationUrl: expect.any(String) as unknown,
        })
      )
      expect((res.body as InvitationCreated).invitationUrl).toContain(
        'invitations/accept'
      )
    })
  })

  describe('DELETE /organizations/me', () => {
    it('204 — soft-deletes organization, then GET /me returns 404 (separate tenant)', async () => {
      const tmp = await seedTenant(http)
      await http.delete('/organizations/me').set(tmp.authHeaders).expect(204)

      // After soft-delete the org is INACTIVE; `getMyOrganization` filters on ACTIVE → 404.
      await http.get('/organizations/me').set(tmp.authHeaders).expect(404)
    })
  })

  // touch z to ensure import stays even if all schemas removed
  void z
})
