import { IsEnum, IsOptional, IsUUID } from 'class-validator'

import { AssignmentRole } from '@glossops/database'

export class CreateWorkOrderAssignmentDto {
  @IsUUID()
  memberId: string

  @IsOptional()
  @IsEnum(AssignmentRole)
  role?: AssignmentRole
}
