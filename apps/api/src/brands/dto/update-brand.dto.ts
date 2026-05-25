import {
  IsEnum,
  IsString,
  IsOptional,
  IsUrl,
  Matches,
  MinLength,
  MaxLength,
} from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

import { AssetType } from '@glossops/database'

export class UpdateBrandDto {
  @ApiPropertyOptional({ example: 'Toyota', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string

  @ApiPropertyOptional({ example: 'toyota', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug?: string

  @ApiPropertyOptional({ enum: AssetType })
  @IsOptional()
  @IsEnum(AssetType)
  category?: AssetType

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/avery.png',
    maxLength: 500,
    nullable: true,
  })
  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  logoUrl?: string | null
}
