import {
  UnprocessableEntityException,
  ConflictException,
  NotFoundException,
  Injectable,
  Inject,
} from '@nestjs/common'

import type { Prisma } from '@glossops/database'

import type {
  BranchRepositoryInterface,
  CreateBranchData,
  UpdateBranchData,
  BranchPage,
} from '@branches/interfaces'

import { BRANCH_REPOSITORY } from './branches.tokens'
import { ListBranchesDto } from './dto'

@Injectable()
export class BranchesService {
  constructor(
    @Inject(BRANCH_REPOSITORY)
    private readonly branches: BranchRepositoryInterface
  ) {}

  async create(
    organizationId: string,
    data: CreateBranchData
  ): Promise<Prisma.BranchModel> {
    const existing = await this.branches.findByName(data.name, organizationId)
    if (existing) {
      throw new ConflictException({ error: 'branch_name_taken' })
    }
    return this.branches.create(organizationId, data)
  }

  findAll(organizationId: string, dto: ListBranchesDto): Promise<BranchPage> {
    return this.branches.findAll(organizationId, {
      status: dto.status ?? 'ACTIVE',
      search: dto.search,
      page: dto.page ?? 1,
      limit: dto.limit ?? 20,
    })
  }

  async findOne(
    id: string,
    organizationId: string
  ): Promise<Prisma.BranchModel> {
    const branch = await this.branches.findById(id, organizationId)
    if (!branch) throw new NotFoundException({ error: 'branch_not_found' })
    return branch
  }

  async update(
    id: string,
    organizationId: string,
    data: UpdateBranchData
  ): Promise<Prisma.BranchModel> {
    const current = await this.findOne(id, organizationId)

    if (data.name && data.name !== current.name) {
      const collision = await this.branches.findByName(
        data.name,
        organizationId
      )
      if (collision) {
        throw new ConflictException({ error: 'branch_name_taken' })
      }
    }

    return this.branches.update(id, organizationId, data)
  }

  async remove(id: string, organizationId: string): Promise<void> {
    await this.findOne(id, organizationId)
    const activeCount = await this.branches.countActive(organizationId)
    if (activeCount <= 1) {
      throw new UnprocessableEntityException({
        error: 'cannot_delete_last_branch',
      })
    }
    await this.branches.softDelete(id, organizationId)
  }
}
