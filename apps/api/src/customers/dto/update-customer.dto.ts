import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class UpdateCustomerDto {
  @ApiPropertyOptional({ example: 'John', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName?: string

  @ApiPropertyOptional({ example: 'Doe', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName?: string

  @ApiPropertyOptional({ example: 'john@example.com', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(254)
  email?: string | null

  @ApiPropertyOptional({ example: '+52 55 1234 5678', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string | null

  @ApiPropertyOptional({ example: 'Av. Insurgentes 100', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string | null

  @ApiPropertyOptional({ example: 'XAXX010101000', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  taxId?: string | null

  @ApiPropertyOptional({ example: '601', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  fiscalRegime?: string | null

  @ApiPropertyOptional({ example: '06600', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  zipCode?: string | null

  @ApiPropertyOptional({ example: 'Referido', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  source?: string | null

  @ApiPropertyOptional({ example: 'Cliente VIP', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string | null
}
