import { IsOptional, IsString, IsInt, IsIn, Min, Max } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'

import type { BranchStatusFilter } from '@branches/interfaces'

export class ListBranchesDto {
  @ApiPropertyOptional({
    enum: ['ACTIVE', 'INACTIVE', 'ALL'],
    default: 'ACTIVE',
  })
  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE', 'ALL'])
  status?: BranchStatusFilter

  @ApiPropertyOptional({ example: 'CDMX' })
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
