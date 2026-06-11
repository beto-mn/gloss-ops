import { Response } from 'supertest'
import { ZodError, ZodTypeAny, z } from 'zod'

function formatZodError(error: ZodError): string {
  const issues = error.issues
    .map(issue => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n')
  return `Zod schema validation failed:\n${issues}`
}

function isSuccessStatus(status: number): boolean {
  return status >= 200 && status < 300
}

export function parseWith<TSchema extends ZodTypeAny>(
  schema: TSchema
): (response: Response) => z.infer<TSchema> {
  return (response: Response): z.infer<TSchema> => {
    if (!isSuccessStatus(response.status)) {
      throw new Error(
        `Expected 2xx response but got ${response.status}. Body: ${JSON.stringify(response.body)}`
      )
    }

    try {
      return schema.parse(response.body) as z.infer<TSchema>
    } catch (err) {
      if (err instanceof ZodError) {
        throw new Error(
          `${formatZodError(err)}\n\nReceived body:\n${JSON.stringify(response.body, null, 2)}`
        )
      }
      throw err
    }
  }
}
