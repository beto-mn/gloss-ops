import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common'
import { Role } from '@glossops/database'

import type { AuthContext } from '@auth/interfaces'
import { CurrentAccount, Roles } from '@auth/decorators'

import { UpdateAssetCheckpointDto } from './dto/update-asset-checkpoint.dto'
import { CreateAssetCheckpointDto } from './dto/create-asset-checkpoint.dto'
import { AssetCheckpointsService } from './asset-checkpoints.service'

@Controller('work-orders/:workOrderId/checkpoints')
export class AssetCheckpointsController {
  constructor(private readonly service: AssetCheckpointsService) {}

  @Post()
  create(
    @Param('workOrderId') workOrderId: string,
    @Body() dto: CreateAssetCheckpointDto,
    @CurrentAccount() account: AuthContext
  ) {
    return this.service.create(
      workOrderId,
      dto,
      account.sub,
      account.organizationId!
    )
  }

  @Get()
  findAll(
    @Param('workOrderId') workOrderId: string,
    @CurrentAccount() account: AuthContext
  ) {
    return this.service.findAll(workOrderId, account.organizationId!)
  }

  @Get(':id')
  findOne(
    @Param('workOrderId') workOrderId: string,
    @Param('id') id: string,
    @CurrentAccount() account: AuthContext
  ) {
    return this.service.findOne(workOrderId, id, account.organizationId!)
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  update(
    @Param('workOrderId') workOrderId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAssetCheckpointDto,
    @CurrentAccount() account: AuthContext
  ) {
    return this.service.update(workOrderId, id, dto, account.organizationId!)
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles(Role.OWNER, Role.MANAGER)
  remove(
    @Param('workOrderId') workOrderId: string,
    @Param('id') id: string,
    @CurrentAccount() account: AuthContext
  ) {
    return this.service.remove(workOrderId, id, account.organizationId!)
  }
}
