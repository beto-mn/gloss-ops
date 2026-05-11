import { IsEnum } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

import { WorkOrderStatus } from '@glossops/database'

export class TransitionStatusDto {
  @ApiProperty({ enum: WorkOrderStatus })
  @IsEnum(WorkOrderStatus)
  status: WorkOrderStatus
}
