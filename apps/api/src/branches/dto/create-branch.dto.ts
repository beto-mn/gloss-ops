import { createZodDto } from 'nestjs-zod'

import { CreateBranchSchema } from '@glossops/shared'

export class CreateBranchDto extends createZodDto(CreateBranchSchema) {}
