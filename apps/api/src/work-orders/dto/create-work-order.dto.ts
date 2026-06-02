import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator'
import { Type } from 'class-transformer'

import { WorkOrderType } from '@glossops/database'

class CreateWorkOrderItemInlineDto {
  @ApiProperty({ example: 'uuid-of-service' })
  @IsUUID()
  serviceId: string

  @ApiPropertyOptional({ example: 1, minimum: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number

  @ApiProperty({ example: 1500.0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string
}

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

  @ApiPropertyOptional({ type: [CreateWorkOrderItemInlineDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateWorkOrderItemInlineDto)
  items?: CreateWorkOrderItemInlineDto[]
}
