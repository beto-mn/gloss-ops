import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'

import { envs } from '@config'

import { AppModule } from './app.module'

import 'dotenv/config'

const NEON_DARK_CSS = `
  body { background: #0d0d12 !important; }
  .swagger-ui { background: #0d0d12; color: #e0e0f0; }

  /* Topbar */
  .swagger-ui .topbar { background: #08080e; border-bottom: 1px solid #00f5ff40; }
  .swagger-ui .topbar .topbar-wrapper svg { display: none; }
  .swagger-ui .topbar .topbar-wrapper a span { color: #00f5ff; text-shadow: 0 0 12px #00f5ff; font-size: 1.3rem; font-weight: 700; letter-spacing: 1px; }

  /* Info */
  .swagger-ui .information-container { background: #0d0d12; }
  .swagger-ui .info .title { color: #fff; text-shadow: 0 0 20px #00f5ff80; }
  .swagger-ui .info .description p, .swagger-ui .info li { color: #8888aa; }
  .swagger-ui .info .version { background: #00f5ff; color: #000; font-weight: 700; }

  /* Tags */
  .swagger-ui .opblock-tag { color: #00f5ff !important; border-bottom: 1px solid #00f5ff20; text-shadow: 0 0 8px #00f5ff50; }
  .swagger-ui .opblock-tag:hover { background: #00f5ff08 !important; }
  .swagger-ui .opblock-tag small { color: #6b6b8a; }

  /* Operation blocks */
  .swagger-ui .opblock { background: #13131e; border: 1px solid #ffffff10; border-radius: 8px; margin: 4px 0; box-shadow: none; }
  .swagger-ui .opblock:hover { border-color: #ffffff20; }

  /* GET */
  .swagger-ui .opblock.opblock-get { border-left: 3px solid #00f5ff; }
  .swagger-ui .opblock.opblock-get .opblock-summary-method { background: #00f5ff; color: #000; font-weight: 700; }
  .swagger-ui .opblock.opblock-get .opblock-summary { background: #00f5ff08; }
  .swagger-ui .opblock.opblock-get.is-open .opblock-summary { background: #00f5ff12; }

  /* POST */
  .swagger-ui .opblock.opblock-post { border-left: 3px solid #ff2af3; }
  .swagger-ui .opblock.opblock-post .opblock-summary-method { background: #ff2af3; color: #000; font-weight: 700; }
  .swagger-ui .opblock.opblock-post .opblock-summary { background: #ff2af308; }
  .swagger-ui .opblock.opblock-post.is-open .opblock-summary { background: #ff2af312; }

  /* PATCH */
  .swagger-ui .opblock.opblock-patch { border-left: 3px solid #a855f7; }
  .swagger-ui .opblock.opblock-patch .opblock-summary-method { background: #a855f7; color: #fff; font-weight: 700; }
  .swagger-ui .opblock.opblock-patch .opblock-summary { background: #a855f708; }

  /* PUT */
  .swagger-ui .opblock.opblock-put { border-left: 3px solid #f59e0b; }
  .swagger-ui .opblock.opblock-put .opblock-summary-method { background: #f59e0b; color: #000; font-weight: 700; }
  .swagger-ui .opblock.opblock-put .opblock-summary { background: #f59e0b08; }

  /* DELETE */
  .swagger-ui .opblock.opblock-delete { border-left: 3px solid #ff2d6b; }
  .swagger-ui .opblock.opblock-delete .opblock-summary-method { background: #ff2d6b; color: #fff; font-weight: 700; }
  .swagger-ui .opblock.opblock-delete .opblock-summary { background: #ff2d6b08; }

  /* Operation body */
  .swagger-ui .opblock .opblock-body { background: #0d0d12; border-top: 1px solid #ffffff10; }
  .swagger-ui .opblock-summary-path { color: #e0e0f0 !important; font-family: monospace; }
  .swagger-ui .opblock-summary-description { color: #6b6b8a; }
  .swagger-ui .opblock-section-header { background: #0a0a10; border-bottom: 1px solid #ffffff10; }
  .swagger-ui .opblock-section-header h4 { color: #00f5ff; }

  /* Parameters */
  .swagger-ui .parameter__name { color: #00f5ff; }
  .swagger-ui .parameter__type { color: #ff2af3; font-style: italic; }
  .swagger-ui .parameter__in { color: #6b6b8a; font-style: italic; }
  .swagger-ui table thead tr th, .swagger-ui table thead tr td { color: #6b6b8a; border-bottom: 1px solid #ffffff10; }
  .swagger-ui table tbody tr td { color: #c0c0d8; border-bottom: 1px solid #ffffff08; }

  /* Inputs */
  .swagger-ui input[type=text], .swagger-ui input[type=password], .swagger-ui input[type=email] { background: #1a1a2e; border: 1px solid #00f5ff30; color: #e0e0f0; border-radius: 4px; }
  .swagger-ui input[type=text]:focus, .swagger-ui input[type=password]:focus { border-color: #00f5ff; box-shadow: 0 0 0 2px #00f5ff20; outline: none; }
  .swagger-ui select { background: #1a1a2e; border: 1px solid #00f5ff30; color: #e0e0f0; border-radius: 4px; }
  .swagger-ui textarea { background: #1a1a2e; border: 1px solid #00f5ff30; color: #e0e0f0; border-radius: 4px; }
  .swagger-ui textarea:focus { border-color: #00f5ff; box-shadow: 0 0 0 2px #00f5ff20; outline: none; }

  /* Buttons */
  .swagger-ui .btn { border-radius: 4px; font-weight: 600; transition: all 0.2s; }
  .swagger-ui .btn.authorize { background: transparent; border: 1px solid #00f5ff; color: #00f5ff; box-shadow: 0 0 8px #00f5ff20; }
  .swagger-ui .btn.authorize:hover { background: #00f5ff12; box-shadow: 0 0 16px #00f5ff40; }
  .swagger-ui .btn.execute { background: #ff2af3; border: none; color: #fff; box-shadow: 0 0 10px #ff2af340; }
  .swagger-ui .btn.execute:hover { background: #ff2af3cc; box-shadow: 0 0 18px #ff2af360; }
  .swagger-ui .btn.btn-clear { background: transparent; border: 1px solid #ff2d6b; color: #ff2d6b; }
  .swagger-ui .btn.cancel { background: transparent; border: 1px solid #6b6b8a; color: #6b6b8a; }

  /* Responses */
  .swagger-ui .response-col_status { color: #00f5ff; font-weight: 700; }
  .swagger-ui table.responses-table { background: transparent; }

  /* Code / JSON */
  .swagger-ui .highlight-code { background: #090910; border: 1px solid #00f5ff15; border-radius: 6px; }
  .swagger-ui .microlight { color: #a0d0ff; }
  .swagger-ui .response-body pre { background: #090910 !important; }

  /* Models */
  .swagger-ui section.models { background: #13131e; border: 1px solid #ffffff10; border-radius: 8px; margin-top: 20px; }
  .swagger-ui section.models h4 { color: #00f5ff; text-shadow: 0 0 8px #00f5ff40; }
  .swagger-ui section.models .model-container { background: transparent; margin: 4px 0; border-radius: 6px; }
  .swagger-ui .model { color: #c0c0d8; }
  .swagger-ui span.prop-type { color: #ff2af3; font-weight: 600; }
  .swagger-ui span.prop-format { color: #6b6b8a; }
  .swagger-ui .model-box { background: #0d0d12; border-radius: 4px; }
  .swagger-ui .model-toggle { color: #00f5ff; }
  .swagger-ui .model-title { color: #e0e0f0; }

  /* Auth dialog */
  .swagger-ui .dialog-ux .modal-ux { background: #13131e; border: 1px solid #00f5ff30; border-radius: 10px; box-shadow: 0 0 30px #00f5ff20; }
  .swagger-ui .dialog-ux .modal-ux-header { background: #0a0a14; border-bottom: 1px solid #00f5ff20; }
  .swagger-ui .dialog-ux .modal-ux-header h3 { color: #00f5ff; text-shadow: 0 0 10px #00f5ff60; }
  .swagger-ui .dialog-ux .modal-ux-content { color: #c0c0d8; }
  .swagger-ui .dialog-ux .modal-ux-content code { color: #00f5ff; background: #0a0a14; padding: 2px 6px; border-radius: 3px; }

  /* Scheme container */
  .swagger-ui .scheme-container { background: #0d0d12; border-bottom: 1px solid #ffffff10; box-shadow: none; }
  .swagger-ui .servers > label select { background: #13131e; border: 1px solid #00f5ff30; color: #e0e0f0; }

  /* Arrow icons */
  .swagger-ui .arrow { fill: #00f5ff; }
  .swagger-ui .expand-methods svg, .swagger-ui .expand-operation svg { fill: #6b6b8a; }
  .swagger-ui .expand-methods svg:hover, .swagger-ui .expand-operation svg:hover { fill: #00f5ff; }

  /* Scrollbar */
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: #0d0d12; }
  ::-webkit-scrollbar-thumb { background: #00f5ff30; border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: #00f5ff60; }
`

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }))

  const config = new DocumentBuilder()
    .setTitle('GlossOps API')
    .setDescription('Documentación interna de la API')
    .setVersion('1.0')
    .addBearerAuth()
    .build()

  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('api-docs', app, document, {
    customCss: NEON_DARK_CSS,
    customSiteTitle: 'GlossOps API',
  })

  await app.listen(envs.port)
}
bootstrap().catch(console.error)
