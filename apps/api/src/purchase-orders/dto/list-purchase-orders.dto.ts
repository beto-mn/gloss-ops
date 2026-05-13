import { Type } from 'class-transformer'
import { IsEnum, IsInt, IsOptional, IsUUID, Min } from 'class-validator'

import { PurchaseOrderStatus } from '@glossops/database'

export class ListPurchaseOrdersDto {
  @IsOptional()
  @IsEnum(PurchaseOrderStatus)
  status?: PurchaseOrderStatus

  @IsOptional()
  @IsUUID()
  supplierId?: string

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number
}
