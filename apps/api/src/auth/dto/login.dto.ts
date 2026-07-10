import { createZodDto } from 'nestjs-zod'

import { LoginSchema } from '@glossops/shared'

export class LoginDto extends createZodDto(LoginSchema) {}
