import { createZodDto } from 'nestjs-zod'

import { ListBranchesQuerySchema } from '@glossops/shared'

export class ListBranchesDto extends createZodDto(ListBranchesQuerySchema) {}
