import {
  IsOptional,
  MaxLength,
  MinLength,
  IsString,
  IsEmail,
} from 'class-validator'
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger'

export class CreateBranchDto {
  @ApiProperty({ example: 'Sucursal CDMX', maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string

  @ApiPropertyOptional({ example: 'Av. Insurgentes 100, CDMX', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string

  @ApiPropertyOptional({ example: '+52 55 1234 5678', maxLength: 30 })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string

  @ApiPropertyOptional({ example: 'cdmx@example.com', maxLength: 254 })
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string
}
