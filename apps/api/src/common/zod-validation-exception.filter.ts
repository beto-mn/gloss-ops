import { ZodValidationException } from 'nestjs-zod'
import { Response } from 'express'
import { ZodError } from 'zod'
import {
  ArgumentsHost,
  ExceptionFilter,
  HttpStatus,
  Catch,
} from '@nestjs/common'

interface ValidationErrorItem {
  path: string
  message: string
}

interface ValidationErrorResponse {
  statusCode: number
  message: string
  errors: ValidationErrorItem[]
}

/**
 * Maps a `ZodValidationException` (thrown by `ZodValidationPipe`) to a stable
 * HTTP 400 body: `{ statusCode, message, errors: [{ path, message }] }`.
 *
 * The `apps/web` API client reads `body.error ?? body.message`, so the string
 * `message` keeps client error handling working; `errors` gives per-field
 * detail for forms.
 */
@Catch(ZodValidationException)
export class ZodValidationExceptionFilter implements ExceptionFilter {
  catch(exception: ZodValidationException, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>()
    const zodError = exception.getZodError() as ZodError

    const errors: ValidationErrorItem[] = zodError.issues.map(issue => ({
      path: issue.path.join('.'),
      message: issue.message,
    }))

    const body: ValidationErrorResponse = {
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'Validation failed',
      errors,
    }

    response.status(HttpStatus.BAD_REQUEST).json(body)
  }
}
