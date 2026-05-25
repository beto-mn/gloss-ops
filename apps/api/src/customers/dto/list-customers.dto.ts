import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'

import type { CustomerStatusFilter } from '@customers/interfaces'

export class ListCustomersDto {
  @ApiPropertyOptional({
    enum: ['ACTIVE', 'INACTIVE', 'ALL'],
    default: 'ACTIVE',
  })
  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE', 'ALL'])
  status?: CustomerStatusFilter

  @ApiPropertyOptional({ example: 'John' })
  @IsOptional()
  @IsString()
  search?: string

  @ApiPropertyOptional({
    enum: ['firstName', 'lastName', 'createdAt'],
    default: 'createdAt',
  })
  @IsOptional()
  @IsIn(['firstName', 'lastName', 'createdAt'])
  sortBy?: 'firstName' | 'lastName' | 'createdAt'

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc'

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
