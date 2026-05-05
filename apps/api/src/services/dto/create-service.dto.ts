import {
  IsString,
  IsOptional,
  IsInt,
  IsNumber,
  Min,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateServiceDto {
  @ApiProperty({ example: 'Ceramic Coating Pro', maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string

  @ApiPropertyOptional({
    example: 'Full body ceramic coating',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string

  @ApiPropertyOptional({ example: 15000.0, minimum: 0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  basePrice?: number

  @ApiPropertyOptional({
    example: '78101802',
    description: 'SAT clave — alphanumeric, format validated only',
    maxLength: 15,
  })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9]+$/)
  @MaxLength(15)
  claveProdServ?: string

  @ApiPropertyOptional({
    example: 'E48',
    description: 'SAT clave unidad — alphanumeric, format validated only',
    maxLength: 10,
  })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9]+$/)
  @MaxLength(10)
  claveUnidad?: string

  @ApiPropertyOptional({ example: 365, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  warrantyDays?: number

  @ApiPropertyOptional({
    example: 'Covers delamination and peeling',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  warrantyDescription?: string

  @ApiPropertyOptional({
    example: 'Subject to proper maintenance',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  warrantyTerm?: string
}
