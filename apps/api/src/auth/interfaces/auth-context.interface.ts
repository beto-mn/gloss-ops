import { Role } from '@glossops/database'

export interface AuthContext {
  sub: string
  memberId: string | null
  email: string
  branchId: string | null
  organizationId: string | null
  role: Role | null
}
