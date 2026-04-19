import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'

import { envs } from '@config'

import { AppModule } from './app.module'

import 'dotenv/config'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }))
  await app.listen(envs.port)
}
bootstrap().catch(console.error)
