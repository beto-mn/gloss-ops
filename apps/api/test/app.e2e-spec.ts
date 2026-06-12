import type { INestApplication } from '@nestjs/common'
import type TestAgent from 'supertest/lib/agent'

import { createTestApp } from './helpers'

describe('AppController (e2e)', () => {
  let app: INestApplication
  let http: TestAgent

  beforeAll(async () => {
    ;({ app, http } = await createTestApp())
  })

  afterAll(async () => {
    await app.close()
  })

  it('GET / — returns Hello World!', async () => {
    const res = await http.get('/').expect(200)
    // Root endpoint returns plain text, not JSON — assert response text directly.
    expect(res.text).toBe('Hello World!')
  })
})
