import { randomUUID } from 'crypto'
import type { INestApplication } from '@nestjs/common'
import type TestAgent from 'supertest/lib/agent'

import { AuthTokensSchema } from '@glossops/shared'

import { createTestApp, parseWith, seedTenant } from './helpers'

interface ErrorBody {
  error: string
}

describe('Auth (e2e)', () => {
  let app: INestApplication
  let http: TestAgent

  beforeAll(async () => {
    ;({ app, http } = await createTestApp())
  })

  afterAll(async () => {
    await app.close()
  })

  describe('POST /auth/register', () => {
    it('201 — creates account + organization + branch + OWNER member and returns token pair', async () => {
      const tag = randomUUID().slice(0, 8)
      const res = await http
        .post('/auth/register')
        .send({
          email: `register-${tag}@e2e.test`,
          password: 'TestPass123!',
          name: 'Owner Test',
          orgName: `Reg Org ${tag}`,
        })
        .expect(201)

      const body = parseWith(AuthTokensSchema)(res)
      expect(body.accessToken).toEqual(expect.any(String))
      expect(body.refreshToken).toMatch(/^[^:]+:[^:]+$/)
      expect(body.expiresIn).toBe(900)

      // seedTenant verifies the Account+Org+Branch+OWNER side-effects via /organizations
      const tenant = await seedTenant(http)
      expect(tenant.organizationId).toEqual(expect.any(String))
      expect(tenant.branchId).toEqual(expect.any(String))
    })

    it('409 — returns email_already_registered when email is taken', async () => {
      const tag = randomUUID().slice(0, 8)
      const payload = {
        email: `dup-${tag}@e2e.test`,
        password: 'TestPass123!',
        name: 'Dup User',
        orgName: `Dup Org ${tag}`,
      }
      await http.post('/auth/register').send(payload).expect(201)
      const res = await http
        .post('/auth/register')
        .send({ ...payload, orgName: `Dup Org 2 ${tag}` })
        .expect(409)

      expect((res.body as ErrorBody).error).toBe('email_already_registered')
    })

    it('400 — returns validation error for invalid body', async () => {
      await http
        .post('/auth/register')
        .send({ email: 'not-an-email', password: 'short' })
        .expect(400)
    })
  })

  describe('POST /auth/login', () => {
    it('200 — returns token pair for valid credentials', async () => {
      const tenant = await seedTenant(http)
      const res = await http
        .post('/auth/login')
        .send({ email: tenant.email, password: tenant.password })
        .expect(200)

      const body = parseWith(AuthTokensSchema)(res)
      expect(body.accessToken).toEqual(expect.any(String))
      expect(body.refreshToken).toMatch(/^[^:]+:[^:]+$/)
      expect(body.expiresIn).toBe(900)
    })

    it('401 — returns invalid_credentials for wrong password', async () => {
      const tenant = await seedTenant(http)
      const res = await http
        .post('/auth/login')
        .send({ email: tenant.email, password: 'wrong-password' })
        .expect(401)

      expect((res.body as ErrorBody).error).toBe('invalid_credentials')
    })

    it('401 — returns invalid_credentials for unknown email', async () => {
      const res = await http
        .post('/auth/login')
        .send({ email: 'no-user@e2e.test', password: 'TestPass123!' })
        .expect(401)

      expect((res.body as ErrorBody).error).toBe('invalid_credentials')
    })
  })

  describe('POST /auth/refresh', () => {
    it('200 — returns a new token pair for a valid refresh token', async () => {
      const tenant = await seedTenant(http)

      const res = await http
        .post('/auth/refresh')
        .send({ refreshToken: tenant.refreshToken })
        .expect(200)

      const body = parseWith(AuthTokensSchema)(res)
      expect(body.accessToken).toEqual(expect.any(String))
      expect(body.refreshToken).toMatch(/^[^:]+:[^:]+$/)
      expect(body.refreshToken).not.toBe(tenant.refreshToken)
    })

    it('401 — returns invalid_refresh_token for an unknown token', async () => {
      const res = await http
        .post('/auth/refresh')
        .send({ refreshToken: 'fake-acc-id:fake-tok-id' })
        .expect(401)

      expect((res.body as ErrorBody).error).toBe('invalid_refresh_token')
    })

    it('401 — old refresh token is rejected after rotation', async () => {
      const tenant = await seedTenant(http)
      await http
        .post('/auth/refresh')
        .send({ refreshToken: tenant.refreshToken })
        .expect(200)
      const res = await http
        .post('/auth/refresh')
        .send({ refreshToken: tenant.refreshToken })
        .expect(401)

      expect((res.body as ErrorBody).error).toBe('invalid_refresh_token')
    })
  })

  describe('POST /auth/logout', () => {
    it('200 — logs out successfully and invalidates the refresh token', async () => {
      const tenant = await seedTenant(http)

      await http
        .post('/auth/logout')
        .set('Authorization', `Bearer ${tenant.accessToken}`)
        .send({ refreshToken: tenant.refreshToken })
        .expect(200)

      const res = await http
        .post('/auth/refresh')
        .send({ refreshToken: tenant.refreshToken })
        .expect(401)

      expect((res.body as ErrorBody).error).toBe('invalid_refresh_token')
    })

    it('401 — returns Unauthorized when no access token provided', async () => {
      await http
        .post('/auth/logout')
        .send({ refreshToken: 'something:else' })
        .expect(401)
    })
  })
})
