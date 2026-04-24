import { IsEmail, IsEnum } from 'class-validator'

import { Role } from '@glossops/database'

export class CreateInvitationDto {
  @IsEmail()
  email: string

  @IsEnum(Role)
  role: Role
}
