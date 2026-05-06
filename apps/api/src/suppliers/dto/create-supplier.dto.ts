import {
  IsString,
  IsOptional,
  IsEmail,
  MinLength,
  MaxLength,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateSupplierDto {
  @ApiProperty({ example: 'Avery Dennison MX', maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string

  @ApiPropertyOptional({ example: 'Carlos Ríos', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  contactName?: string

  @ApiPropertyOptional({ example: '+52 55 1234 5678', maxLength: 30 })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string

  @ApiPropertyOptional({ example: 'ventas@avery.com.mx', maxLength: 200 })
  @IsOptional()
  @IsEmail()
  @MaxLength(200)
  email?: string

  @ApiPropertyOptional({
    example: 'Distribuidor regional zona norte',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string
}
