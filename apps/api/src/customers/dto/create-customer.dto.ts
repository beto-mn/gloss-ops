import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

export class CreateCustomerDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName: string

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName: string

  @IsOptional()
  @IsString()
  @MaxLength(254)
  email?: string

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string

  @IsOptional()
  @IsString()
  @MaxLength(20)
  taxId?: string

  @IsOptional()
  @IsString()
  @MaxLength(10)
  fiscalRegime?: string

  @IsOptional()
  @IsString()
  @MaxLength(10)
  zipCode?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  source?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string
}
