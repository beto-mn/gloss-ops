import { IsNotEmpty, IsString } from 'class-validator'

export class VoidWarrantyDto {
  @IsString()
  @IsNotEmpty()
  reason!: string
}
