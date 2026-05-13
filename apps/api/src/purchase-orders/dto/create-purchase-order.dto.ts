import { Type } from 'class-transformer'
import {
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator'

export class CreatePurchaseOrderItemDto {
  @IsUUID()
  inventoryId: string

  @IsNumber()
  @Min(0.001)
  quantity: number

  @IsNumber()
  @Min(0)
  unitCost: number

  @IsOptional()
  @IsString()
  note?: string
}

export class CreatePurchaseOrderDto {
  @IsUUID()
  supplierId: string

  @IsOptional()
  @IsDateString()
  expectedAt?: string

  @IsOptional()
  @IsString()
  note?: string

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseOrderItemDto)
  items: CreatePurchaseOrderItemDto[]
}
