import { createZodDto } from 'nestjs-zod'

import { UpdateOrganizationSchema } from '@glossops/shared'

export class UpdateOrgDto extends createZodDto(UpdateOrganizationSchema) {}
