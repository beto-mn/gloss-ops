import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'

import { AssetType } from '@glossops/database'

export class ListCustomerAssetsDto {
  @ApiPropertyOptional({
    example: 'ACTIVE',
    enum: ['ACTIVE', 'DELETED', 'ALL'],
  })
  @IsOptional()
  @IsString()
  status?: string

  @ApiPropertyOptional({ enum: AssetType, example: AssetType.VEHICLE })
  @IsOptional()
  @IsEnum(AssetType)
  assetType?: AssetType

  @ApiPropertyOptional({ example: 'Civic' })
  @IsOptional()
  @IsString()
  search?: string

  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number

  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number
}
