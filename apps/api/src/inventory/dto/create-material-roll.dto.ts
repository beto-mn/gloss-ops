import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator'

export class CreateMaterialRollDto {
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

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  series: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  finish: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  color: string

  @ApiProperty({ description: 'Width in meters, > 0' })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  width: number

  @ApiProperty({ description: 'Remaining length in meters, >= 0' })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  remainingLength: number

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  lotNumber?: string
}
