import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import request from 'supertest'
import { App } from 'supertest/types'

import { AppModule } from '../src/app.module'
import { PrismaService } from '../src/prisma/prisma.service'

interface TokenPairBody {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

interface ErrorBody {
  error: string
}

describe('Auth (e2e)', () => {
  let app: INestApplication<App>
  let prisma: PrismaService

  const e2eEmail = 'auth-test@e2e.test'
  const payload = {
    email: e2eEmail,
    password: 'password123',
    firstName: 'Test',
    lastName: 'User',
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }))
    await app.init()

    prisma = app.get(PrismaService)
  })

  afterAll(async () => {
    await prisma.account.deleteMany({
      where: { email: { contains: '@e2e.test' } },
    })
    await app.close()
  })

  afterEach(async () => {
    await prisma.account.deleteMany({ where: { email: e2eEmail } })
  })

  describe('POST /auth/register', () => {
    it('201 — creates account and returns token pair', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send(payload)
        .expect(201)

      const body = res.body as TokenPairBody
      expect(body.accessToken).toEqual(expect.any(String))
      expect(body.refreshToken).toEqual(expect.any(String))
      expect(body.expiresIn).toBe(900)
    })

    it('409 — returns email_already_registered when email is taken', async () => {
      await request(app.getHttpServer()).post('/auth/register').send(payload)
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send(payload)
        .expect(409)

      expect((res.body as ErrorBody).error).toBe('email_already_registered')
    })

    it('400 — returns validation error for invalid body', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'not-an-email', password: 'short' })
        .expect(400)
    })
  })

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      await request(app.getHttpServer()).post('/auth/register').send(payload)
    })

    it('200 — returns token pair for valid credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: payload.email, password: payload.password })
        .expect(200)

      const body = res.body as TokenPairBody
      expect(body.accessToken).toEqual(expect.any(String))
      expect(body.refreshToken).toEqual(expect.any(String))
      expect(body.expiresIn).toBe(900)
    })

    it('401 — returns invalid_credentials for wrong password', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: payload.email, password: 'wrong-password' })
        .expect(401)

      expect((res.body as ErrorBody).error).toBe('invalid_credentials')
    })

    it('401 — returns invalid_credentials for unknown email', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'unknown@e2e.test', password: 'password123' })
        .expect(401)

      expect((res.body as ErrorBody).error).toBe('invalid_credentials')
    })
  })

  describe('POST /auth/refresh', () => {
    let refreshToken: string

    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send(payload)
      refreshToken = (res.body as TokenPairBody).refreshToken
    })

    it('200 — returns new token pair for valid refresh token', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200)

      const body = res.body as TokenPairBody
      expect(body.accessToken).toEqual(expect.any(String))
      expect(body.refreshToken).toEqual(expect.any(String))
      expect(body.expiresIn).toBe(900)
    })

    it('401 — returns invalid_refresh_token for unknown token', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'fake-acc-id:fake-tok-id' })
        .expect(401)

      expect((res.body as ErrorBody).error).toBe('invalid_refresh_token')
    })

    it('401 — old refresh token is rejected after rotation', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })

      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(401)

      expect((res.body as ErrorBody).error).toBe('invalid_refresh_token')
    })
  })

  describe('POST /auth/logout', () => {
    let accessToken: string
    let refreshToken: string

    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send(payload)
      accessToken = (res.body as TokenPairBody).accessToken
      refreshToken = (res.body as TokenPairBody).refreshToken
    })

    it('200 — logs out successfully', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken })
        .expect(200)
    })

    it('401 — refresh token invalid after logout', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken })

      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(401)

      expect((res.body as ErrorBody).error).toBe('invalid_refresh_token')
    })

    it('401 — returns Unauthorized when no access token provided', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .send({ refreshToken })
        .expect(401)
    })
  })
})
