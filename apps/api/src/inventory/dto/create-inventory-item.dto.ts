import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator'

export class CreateInventoryItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  supplierId?: string

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  brandId?: string

  @ApiPropertyOptional({ default: 0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  unitCost?: number

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  sku?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string

  @ApiPropertyOptional({ default: 0 })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @IsOptional()
  stock?: number

  @ApiProperty({ example: 'pza' })
  @IsString()
  @IsNotEmpty()
  unit: string

  @ApiPropertyOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @IsOptional()
  lowStockAlert?: number
}
