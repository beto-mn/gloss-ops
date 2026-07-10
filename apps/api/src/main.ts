import 'dotenv/config'

import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { cleanupOpenApiDoc, ZodValidationPipe } from 'nestjs-zod'
import { NestFactory } from '@nestjs/core'

import { envs } from '@config'

import { ZodValidationExceptionFilter } from './common'
import { AppModule } from './app.module'

const DARK_CSS = `
  body { background: #1c1c1c !important; }
  .swagger-ui { background: #1c1c1c; color: #d4d4d4; }

  .swagger-ui .topbar { background: #111; box-shadow: 0 1px 0 #333; }
  .swagger-ui .topbar .topbar-wrapper svg { display: none; }
  .swagger-ui .topbar .topbar-wrapper a span { color: #fff; font-size: 1.2rem; font-weight: 600; }

  .swagger-ui .information-container { background: #1c1c1c; }
  .swagger-ui .info .title { color: #fff; }
  .swagger-ui .info .description p { color: #999; }
  .swagger-ui .info .version { background: #444; color: #fff; border-radius: 3px; padding: 2px 8px; }

  .swagger-ui .opblock-tag { color: #d4d4d4 !important; border-bottom: 1px solid #333; }
  .swagger-ui .opblock-tag:hover { background: #252525 !important; }
  .swagger-ui .opblock-tag small { color: #777; }

  .swagger-ui .opblock { background: #252525; border: 1px solid #333; border-radius: 6px; margin: 3px 0; box-shadow: none; }

  .swagger-ui .opblock.opblock-get .opblock-summary-method { background: #1a73e8; }
  .swagger-ui .opblock.opblock-post .opblock-summary-method { background: #2e7d32; }
  .swagger-ui .opblock.opblock-patch .opblock-summary-method { background: #6a1fa0; }
  .swagger-ui .opblock.opblock-put .opblock-summary-method { background: #e65100; }
  .swagger-ui .opblock.opblock-delete .opblock-summary-method { background: #b71c1c; }
  .swagger-ui .opblock-summary-method { border-radius: 4px; font-weight: 700; min-width: 70px; }

  .swagger-ui .opblock .opblock-body { background: #1c1c1c; border-top: 1px solid #333; }
  .swagger-ui .opblock-summary-path { color: #d4d4d4 !important; font-family: monospace; }
  .swagger-ui .opblock-summary-description { color: #777; }
  .swagger-ui .opblock-section-header { background: #222; border-bottom: 1px solid #333; }
  .swagger-ui .opblock-section-header h4 { color: #aaa; }

  .swagger-ui .parameter__name { color: #d4d4d4; }
  .swagger-ui .parameter__type { color: #9cdcfe; }
  .swagger-ui .parameter__in { color: #666; }
  .swagger-ui table thead tr th, .swagger-ui table thead tr td { color: #888; border-bottom: 1px solid #333; }
  .swagger-ui table tbody tr td { color: #c0c0c0; border-bottom: 1px solid #2a2a2a; }

  .swagger-ui input[type=text], .swagger-ui input[type=password], .swagger-ui input[type=email] { background: #2a2a2a; border: 1px solid #444; color: #d4d4d4; border-radius: 4px; }
  .swagger-ui input:focus { border-color: #666; outline: none; }
  .swagger-ui select { background: #2a2a2a; border: 1px solid #444; color: #d4d4d4; border-radius: 4px; }
  .swagger-ui textarea { background: #2a2a2a; border: 1px solid #444; color: #d4d4d4; border-radius: 4px; }

  .swagger-ui .btn { border-radius: 4px; transition: opacity 0.15s; }
  .swagger-ui .btn.authorize { background: transparent; border: 1px solid #555; color: #d4d4d4; }
  .swagger-ui .btn.authorize:hover { background: #2a2a2a; }
  .swagger-ui .btn.execute { background: #1a73e8; border-color: #1a73e8; color: #fff; }
  .swagger-ui .btn.execute:hover { opacity: 0.85; }
  .swagger-ui .btn.btn-clear { background: transparent; border: 1px solid #555; color: #aaa; }
  .swagger-ui .btn.cancel { background: transparent; border: 1px solid #555; color: #aaa; }

  .swagger-ui .response-col_status { color: #9cdcfe; font-weight: 600; }
  .swagger-ui table.responses-table { background: transparent; }

  .swagger-ui .highlight-code { background: #141414; border: 1px solid #333; border-radius: 4px; }
  .swagger-ui .microlight { color: #ce9178; }
  .swagger-ui .response-body pre { background: #141414 !important; }

  .swagger-ui section.models { background: #252525; border: 1px solid #333; border-radius: 6px; margin-top: 16px; }
  .swagger-ui section.models h4 { color: #d4d4d4; }
  .swagger-ui section.models .model-container { background: transparent; }
  .swagger-ui .model { color: #c0c0c0; }
  .swagger-ui span.prop-type { color: #9cdcfe; }
  .swagger-ui span.prop-format { color: #666; }
  .swagger-ui .model-box { background: #1c1c1c; border-radius: 4px; }
  .swagger-ui .model-title { color: #d4d4d4; }

  .swagger-ui .dialog-ux .modal-ux { background: #252525; border: 1px solid #444; border-radius: 8px; }
  .swagger-ui .dialog-ux .modal-ux-header { background: #1c1c1c; border-bottom: 1px solid #333; }
  .swagger-ui .dialog-ux .modal-ux-header h3 { color: #d4d4d4; }
  .swagger-ui .dialog-ux .modal-ux-content { color: #c0c0c0; }
  .swagger-ui .dialog-ux .modal-ux-content code { background: #1c1c1c; color: #9cdcfe; padding: 2px 6px; border-radius: 3px; }

  .swagger-ui .scheme-container { background: #1c1c1c; border-bottom: 1px solid #333; box-shadow: none; }
  .swagger-ui .servers > label select { background: #2a2a2a; border: 1px solid #444; color: #d4d4d4; }

  .swagger-ui .arrow { fill: #777; }

  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: #1c1c1c; }
  ::-webkit-scrollbar-thumb { background: #444; border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: #555; }
`

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.enableCors({ origin: envs.app.frontendUrl, credentials: true })
  app.useGlobalPipes(new ZodValidationPipe())
  app.useGlobalFilters(new ZodValidationExceptionFilter())

  const config = new DocumentBuilder()
    .setTitle('GlossOps API')
    .setDescription('Documentación interna de la API')
    .setVersion('1.0')
    .addBearerAuth()
    .build()

  const document = cleanupOpenApiDoc(SwaggerModule.createDocument(app, config))
  SwaggerModule.setup('api-docs', app, document, {
    customCss: DARK_CSS,
    customSiteTitle: 'GlossOps API',
  })

  await app.listen(envs.port)
}
bootstrap().catch(console.error)
