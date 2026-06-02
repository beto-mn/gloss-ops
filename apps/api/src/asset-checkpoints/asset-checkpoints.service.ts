import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { CheckpointType, WorkOrderStatus } from '@glossops/database'

import type { AssetCheckpointRecord } from '@asset-checkpoints/interfaces'

import type { AssetCheckpointRepositoryInterface } from './interfaces'
import { CreateAssetCheckpointDto } from './dto/create-asset-checkpoint.dto'
import { UpdateAssetCheckpointDto } from './dto/update-asset-checkpoint.dto'
import { ASSET_CHECKPOINT_REPOSITORY } from './asset-checkpoints.tokens'
import { WorkOrdersService } from '../work-orders/work-orders.service'

@Injectable()
export class AssetCheckpointsService {
  constructor(
    @Inject(ASSET_CHECKPOINT_REPOSITORY)
    private readonly repo: AssetCheckpointRepositoryInterface,
    private readonly workOrdersService: WorkOrdersService
  ) {}

  async create(
    workOrderId: string,
    dto: CreateAssetCheckpointDto,
    accountId: string,
    organizationId: string
  ): Promise<AssetCheckpointRecord> {
    const wo = await this.workOrdersService.findOne(workOrderId, organizationId)

    if (wo.status === WorkOrderStatus.CANCELLED) {
      throw new ConflictException({ error: 'work_order_cancelled' })
    }
    if (
      dto.type === CheckpointType.RECEPTION &&
      wo.status === WorkOrderStatus.COMPLETED
    ) {
      throw new ConflictException({ error: 'work_order_completed' })
    }

    if (dto.type !== CheckpointType.PROCESS) {
      const exists = await this.repo.existsByWorkOrderAndType(
        workOrderId,
        dto.type
      )
      if (exists)
        throw new ConflictException({ error: 'checkpoint_already_exists' })
    }

    if (dto.type === CheckpointType.DELIVERY) {
      const receptionExists = await this.repo.existsByWorkOrderAndType(
        workOrderId,
        CheckpointType.RECEPTION
      )
      if (!receptionExists)
        throw new ConflictException({ error: 'delivery_requires_reception' })
    }

    return this.repo.create({
      workOrderId,
      type: dto.type,
      processType: dto.processType,
      mileage: dto.mileage,
      fuelLevel: dto.fuelLevel,
      generalCondition: dto.generalCondition,
      note: dto.note,
      photo: dto.photo,
      customerSignatureUrl: dto.customerSignatureUrl,
      recordedById: accountId,
    })
  }

  async findAll(
    workOrderId: string,
    organizationId: string
  ): Promise<AssetCheckpointRecord[]> {
    await this.workOrdersService.findOne(workOrderId, organizationId)
    return this.repo.findAllByWorkOrder(workOrderId)
  }

  async findOne(
    workOrderId: string,
    id: string,
    organizationId: string
  ): Promise<AssetCheckpointRecord> {
    await this.workOrdersService.findOne(workOrderId, organizationId)
    const checkpoint = await this.repo.findById(id)
    if (!checkpoint || checkpoint.workOrderId !== workOrderId) {
      throw new NotFoundException({ error: 'checkpoint_not_found' })
    }
    return checkpoint
  }

  async update(
    workOrderId: string,
    id: string,
    dto: UpdateAssetCheckpointDto,
    organizationId: string
  ): Promise<AssetCheckpointRecord> {
    await this.workOrdersService.findOne(workOrderId, organizationId)
    const checkpoint = await this.repo.findById(id)
    if (!checkpoint || checkpoint.workOrderId !== workOrderId) {
      throw new NotFoundException({ error: 'checkpoint_not_found' })
    }
    return this.repo.update(id, dto)
  }

  async remove(
    workOrderId: string,
    id: string,
    organizationId: string
  ): Promise<void> {
    await this.workOrdersService.findOne(workOrderId, organizationId)
    const checkpoint = await this.repo.findById(id)
    if (!checkpoint || checkpoint.workOrderId !== workOrderId) {
      throw new NotFoundException({ error: 'checkpoint_not_found' })
    }
    await this.repo.delete(id)
  }
}
