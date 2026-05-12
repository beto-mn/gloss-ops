import { ApiProperty } from '@nestjs/swagger'
import { IsNumber, Min } from 'class-validator'

export class UpdateInventoryUsageDto {
  @ApiProperty({ description: 'Quantity used, must be > 0' })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantityUsed: number
}
