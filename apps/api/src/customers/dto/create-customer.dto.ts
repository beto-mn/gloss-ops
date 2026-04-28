import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator'
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger'

export class CreateCustomerDto {
  @ApiProperty({ example: 'John', maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName: string

  @ApiProperty({ example: 'Doe', maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName: string

  @ApiPropertyOptional({ example: 'john@example.com', maxLength: 254 })
  @IsOptional()
  @IsString()
  @MaxLength(254)
  email?: string

  @ApiPropertyOptional({ example: '+52 55 1234 5678', maxLength: 30 })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string

  @ApiPropertyOptional({ example: 'Av. Insurgentes 100, CDMX', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string

  @ApiPropertyOptional({ example: 'XAXX010101000', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  taxId?: string

  @ApiPropertyOptional({ example: '601', maxLength: 10 })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  fiscalRegime?: string

  @ApiPropertyOptional({ example: '06600', maxLength: 10 })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  zipCode?: string

  @ApiPropertyOptional({ example: 'Referido', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  source?: string

  @ApiPropertyOptional({ example: 'Cliente VIP', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string
}
