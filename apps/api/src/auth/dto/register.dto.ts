import { ApiProperty } from '@nestjs/swagger'
import {
  MinLength,
  MaxLength,
  IsString,
  Matches,
  IsEmail,
} from 'class-validator'

export class RegisterDto {
  @ApiProperty({ example: 'owner@glossops.com' })
  @IsEmail()
  email: string

  @ApiProperty({ example: 'supersecret123', minLength: 8, maxLength: 72 })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string

  @ApiProperty({ example: 'John', maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName: string

  @ApiProperty({ example: 'Doe', maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName: string

  @ApiProperty({ example: 'GlossOps Taller', maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  organizationName: string

  @ApiProperty({ example: 'glossops-taller', maxLength: 63 })
  @IsString()
  @MinLength(1)
  @MaxLength(63)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'slug must be lowercase alphanumeric with hyphens',
  })
  organizationSlug: string
}
