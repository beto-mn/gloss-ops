import {
  IsString,
  IsOptional,
  IsUrl,
  Matches,
  MinLength,
  MaxLength,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateBrandDto {
  @ApiProperty({ example: 'Avery Dennison', maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string

  @ApiProperty({ example: 'avery-dennison', maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug: string

  @ApiProperty({ example: 'vinyl', maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  category: string

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/avery.png',
    maxLength: 500,
  })
  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  logoUrl?: string
}
