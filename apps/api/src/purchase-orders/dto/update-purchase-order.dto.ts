import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator'

export class UpdatePurchaseOrderDto {
  @IsOptional()
  @IsUUID()
  supplierId?: string

  @IsOptional()
  @IsDateString()
  expectedAt?: string | null

  @IsOptional()
  @IsString()
  note?: string | null
}
