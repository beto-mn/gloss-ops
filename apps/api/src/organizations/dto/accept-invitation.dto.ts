import { createZodDto } from 'nestjs-zod'

import { AcceptInvitationSchema } from '@glossops/shared'

export class AcceptInvitationDto extends createZodDto(AcceptInvitationSchema) {}
