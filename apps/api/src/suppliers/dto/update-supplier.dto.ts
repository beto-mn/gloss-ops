import {
  IsString,
  IsOptional,
  IsEmail,
  MinLength,
  MaxLength,
} from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class UpdateSupplierDto {
  @ApiPropertyOptional({ example: 'Avery Dennison MX', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string

  @ApiPropertyOptional({
    example: 'Carlos Ríos',
    maxLength: 200,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  contactName?: string | null

  @ApiPropertyOptional({
    example: '+52 55 1234 5678',
    maxLength: 30,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string | null

  @ApiPropertyOptional({
    example: 'ventas@avery.com.mx',
    maxLength: 200,
    nullable: true,
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(200)
  email?: string | null

  @ApiPropertyOptional({
    example: 'Distribuidor regional zona norte',
    maxLength: 1000,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string | null
}
