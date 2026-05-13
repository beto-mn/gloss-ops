import { Type } from 'class-transformer'
import { IsArray, IsNumber, IsUUID, Min, ValidateNested } from 'class-validator'

export class ReceiveItemDto {
  @IsUUID()
  itemId: string

  @IsNumber()
  @Min(0.001)
  receivedQuantity: number
}

export class ReceivePurchaseOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceiveItemDto)
  items: ReceiveItemDto[]
}
