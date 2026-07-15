import { createZodDto } from 'nestjs-zod'

import { UpdateBranchSchema } from '@glossops/shared'

export class UpdateBranchDto extends createZodDto(UpdateBranchSchema) {}
