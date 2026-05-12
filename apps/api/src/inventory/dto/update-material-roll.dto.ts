import { ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator'

export class UpdateMaterialRollDto {
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

  @ApiPropertyOptional()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  series?: string

  @ApiPropertyOptional()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  finish?: string

  @ApiPropertyOptional()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  color?: string

  @ApiPropertyOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  @IsOptional()
  width?: number

  @ApiPropertyOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @IsOptional()
  remainingLength?: number

  @ApiPropertyOptional({ nullable: true })
  @IsString()
  @IsOptional()
  lotNumber?: string | null
}
