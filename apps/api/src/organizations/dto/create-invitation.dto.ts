import { createZodDto } from 'nestjs-zod'

import { CreateInvitationSchema } from '@glossops/shared'

export class CreateInvitationDto extends createZodDto(CreateInvitationSchema) {}
