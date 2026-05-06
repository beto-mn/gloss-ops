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
import { ApiPropertyOptional } from '@nestjs/swagger'

export class UpdateServiceDto {
  @ApiPropertyOptional({ example: 'Ceramic Coating Pro', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string

  @ApiPropertyOptional({
    example: 'Full body ceramic coating',
    maxLength: 1000,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null

  @ApiPropertyOptional({ example: 15000.0, minimum: 0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  basePrice?: number

  @ApiPropertyOptional({ example: '78101802', maxLength: 15, nullable: true })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9]+$/)
  @MaxLength(15)
  claveProdServ?: string | null

  @ApiPropertyOptional({ example: 'E48', maxLength: 10, nullable: true })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9]+$/)
  @MaxLength(10)
  claveUnidad?: string | null

  @ApiPropertyOptional({ example: 365, minimum: 0, nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  warrantyDays?: number | null

  @ApiPropertyOptional({
    example: 'Covers delamination',
    maxLength: 1000,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  warrantyDescription?: string | null

  @ApiPropertyOptional({
    example: 'Subject to maintenance',
    maxLength: 1000,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  warrantyTerm?: string | null
}
