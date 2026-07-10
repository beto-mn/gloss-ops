import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { ZodValidationPipe } from 'nestjs-zod'
import request from 'supertest'
import type TestAgent from 'supertest/lib/agent'
import type { App } from 'supertest/types'

import { ZodValidationExceptionFilter } from '../../src/common'
import { AppModule } from '../../src/app.module'

export interface TestApp {
  app: INestApplication
  http: TestAgent
}

export async function createTestApp(): Promise<TestApp> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile()

  const app = moduleFixture.createNestApplication()
  app.useGlobalPipes(new ZodValidationPipe())
  app.useGlobalFilters(new ZodValidationExceptionFilter())
  await app.init()

  const http = request(app.getHttpServer() as App)
  return { app, http }
}
