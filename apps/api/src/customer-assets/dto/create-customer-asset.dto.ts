import {
  IsOptional,
  MaxLength,
  MinLength,
  IsString,
  IsObject,
  IsEnum,
  IsUUID,
  IsInt,
  Length,
  Max,
  Min,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

import { AssetType } from '@glossops/database'

export class CreateCustomerAssetDto {
  @ApiProperty({ enum: AssetType, example: AssetType.VEHICLE })
  @IsEnum(AssetType)
  assetType: AssetType

  @ApiPropertyOptional({
    example: 'Drone',
    maxLength: 50,
    description: 'Required when assetType === OTHER',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  customAssetType?: string

  @ApiProperty({ example: 'd3f5...uuid' })
  @IsUUID()
  brandId: string

  @ApiProperty({ example: 'Civic', maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  model: string

  @ApiPropertyOptional({ example: 2023, minimum: 1900, maximum: 2100 })
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  year?: number

  @ApiProperty({ example: '3VWFE21C04M000001', maxLength: 50 })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  identifier: string

  @ApiPropertyOptional({ example: 'MX', minLength: 2, maxLength: 2 })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  country?: string

  @ApiPropertyOptional({ example: 'Black', maxLength: 30 })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  color?: string

  @ApiPropertyOptional({ description: 'Free-form domain-specific fields' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>

  @ApiPropertyOptional({
    example: 'Slight scratch on rear bumper',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string
}
