import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator'

import { WorkOrderType } from '@glossops/database'

export class CreateWorkOrderDto {
  @ApiProperty({ example: 'uuid-of-customer-asset' })
  @IsUUID()
  assetId: string

  @ApiPropertyOptional({ enum: WorkOrderType, default: WorkOrderType.STANDARD })
  @IsOptional()
  @IsEnum(WorkOrderType)
  type?: WorkOrderType

  @ApiPropertyOptional({ description: 'Required when type is WARRANTY_CLAIM' })
  @IsOptional()
  @IsUUID()
  warrantyClaimId?: string

  @ApiPropertyOptional({ example: '2026-05-10T10:00:00Z' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string

  @ApiPropertyOptional({ example: 'Customer requests premium vinyl' })
  @IsOptional()
  @IsString()
  note?: string
}
