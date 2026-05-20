import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from 'class-validator'

import { AssetCondition, FuelLevel } from '@glossops/database'

export class UpdateAssetCheckpointDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  mileage?: number | null

  @IsOptional()
  @IsEnum(FuelLevel)
  fuelLevel?: FuelLevel | null

  @IsOptional()
  @IsEnum(AssetCondition)
  generalCondition?: AssetCondition

  @IsOptional()
  @IsString()
  note?: string | null

  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  photo?: string[]

  @IsOptional()
  @IsUrl()
  customerSignatureUrl?: string | null
}
