import { Type } from 'class-transformer'
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator'

import { ActivityAction } from '@glossops/database'

export class ListActivityLogsDto {
  @IsOptional()
  @IsString()
  entity?: string

  @IsOptional()
  @IsUUID()
  entityId?: string

  @IsOptional()
  @IsEnum(ActivityAction)
  action?: ActivityAction

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number
}
