import { ApiPropertyOptional } from '@nestjs/swagger'
import { Transform, Type } from 'class-transformer'
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator'

import { InventoryType } from '@glossops/database'

export class ListInventoryDto {
  @ApiPropertyOptional({ enum: InventoryType })
  @IsEnum(InventoryType)
  @IsOptional()
  type?: InventoryType

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  supplierId?: string

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  brandId?: string

  @ApiPropertyOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  lowStock?: boolean

  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number

  @ApiPropertyOptional({ default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number
}
