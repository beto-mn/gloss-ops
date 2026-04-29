import { IsEmail, IsEnum, IsUUID } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

import { Role } from '@glossops/database'

export class CreateInvitationDto {
  @ApiProperty({ example: 'technician@glossops.com' })
  @IsEmail()
  email: string

  @ApiProperty({ enum: Role, example: Role.TECHNICIAN })
  @IsEnum(Role)
  role: Role

  @ApiProperty({ example: 'd3f5a1b2-0000-0000-0000-000000000000' })
  @IsUUID()
  branchId: string
}
