import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from 'class-validator'

import { AssetCondition, CheckpointType, FuelLevel } from '@glossops/database'

export class CreateAssetCheckpointDto {
  @IsEnum(CheckpointType)
  type: CheckpointType

  @IsOptional()
  @IsInt()
  @Min(0)
  mileage?: number

  @IsOptional()
  @IsEnum(FuelLevel)
  fuelLevel?: FuelLevel

  @IsEnum(AssetCondition)
  generalCondition: AssetCondition

  @IsOptional()
  @IsString()
  note?: string

  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  photo?: string[]

  @IsOptional()
  @IsUrl()
  customerSignatureUrl?: string
}
