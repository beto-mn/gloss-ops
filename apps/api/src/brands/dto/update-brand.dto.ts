import {
  IsString,
  IsOptional,
  IsUrl,
  Matches,
  MinLength,
  MaxLength,
} from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class UpdateBrandDto {
  @ApiPropertyOptional({ example: 'Avery Dennison', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string

  @ApiPropertyOptional({ example: 'avery-dennison', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug?: string

  @ApiPropertyOptional({ example: 'vinyl', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  category?: string

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/avery.png',
    maxLength: 500,
    nullable: true,
  })
  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  logoUrl?: string | null
}
