import {
  IsEnum,
  IsString,
  IsOptional,
  IsUrl,
  Matches,
  MinLength,
  MaxLength,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

import { AssetType } from '@glossops/database'

export class CreateBrandDto {
  @ApiProperty({ example: 'Toyota', maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string

  @ApiProperty({ example: 'toyota', maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug: string

  @ApiProperty({ enum: AssetType, example: AssetType.VEHICLE })
  @IsEnum(AssetType)
  category: AssetType

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/avery.png',
    maxLength: 500,
  })
  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  logoUrl?: string
}
