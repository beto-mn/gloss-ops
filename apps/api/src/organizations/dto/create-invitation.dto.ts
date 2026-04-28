import { IsEmail, IsEnum } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

import { Role } from '@glossops/database'

export class CreateInvitationDto {
  @ApiProperty({ example: 'technician@glossops.com' })
  @IsEmail()
  email: string

  @ApiProperty({ enum: Role, example: Role.TECHNICIAN })
  @IsEnum(Role)
  role: Role
}
