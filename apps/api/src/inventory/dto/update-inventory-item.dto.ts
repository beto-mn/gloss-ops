import { ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator'

export class UpdateInventoryItemDto {
  @ApiPropertyOptional()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string

  @ApiPropertyOptional({ nullable: true })
  @IsUUID()
  @IsOptional()
  supplierId?: string | null

  @ApiPropertyOptional({ nullable: true })
  @IsUUID()
  @IsOptional()
  brandId?: string | null

  @ApiPropertyOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  unitCost?: number

  @ApiPropertyOptional({ nullable: true })
  @IsString()
  @IsOptional()
  sku?: string | null

  @ApiPropertyOptional({ nullable: true })
  @IsString()
  @IsOptional()
  description?: string | null

  @ApiPropertyOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @IsOptional()
  stock?: number

  @ApiPropertyOptional()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  unit?: string

  @ApiPropertyOptional({ nullable: true })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @IsOptional()
  lowStockAlert?: number | null
}
