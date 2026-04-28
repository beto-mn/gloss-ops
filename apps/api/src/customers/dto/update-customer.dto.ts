import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

export class UpdateCustomerDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName?: string

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName?: string

  @IsOptional()
  @IsString()
  @MaxLength(254)
  email?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(20)
  taxId?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(10)
  fiscalRegime?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(10)
  zipCode?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(100)
  source?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string | null
}
