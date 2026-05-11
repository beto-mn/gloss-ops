import { IsDateString, IsOptional, IsString } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class UpdateWorkOrderDto {
  @ApiPropertyOptional({ example: '2026-05-10T10:00:00Z', nullable: true })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string | null

  @ApiPropertyOptional({ example: 'Updated note', nullable: true })
  @IsOptional()
  @IsString()
  note?: string | null
}
