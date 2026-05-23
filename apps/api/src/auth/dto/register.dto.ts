import { ApiProperty } from '@nestjs/swagger'
import { MinLength, MaxLength, IsString, IsEmail } from 'class-validator'

export class RegisterDto {
  @ApiProperty({ example: 'owner@glossops.com' })
  @IsEmail()
  email: string

  @ApiProperty({ example: 'supersecret123', minLength: 8, maxLength: 72 })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string

  @ApiProperty({ example: 'John Doe', maxLength: 100 })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string

  @ApiProperty({ example: 'GlossOps Taller', maxLength: 100 })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  orgName: string
}
