import type { Role } from '@glossops/database'

export interface InvitationPayload {
  orgId: string
  email: string
  role: Role
  branchId: string
}

export interface InvitationStoreInterface {
  save(
    token: string,
    payload: InvitationPayload,
    ttlDays: number
  ): Promise<void>
  get(token: string): Promise<InvitationPayload | null>
  delete(token: string): Promise<void>
}
