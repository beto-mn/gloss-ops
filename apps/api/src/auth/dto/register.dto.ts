import { createZodDto } from 'nestjs-zod'

import { RegisterSchema } from '@glossops/shared'

export class RegisterDto extends createZodDto(RegisterSchema) {}
