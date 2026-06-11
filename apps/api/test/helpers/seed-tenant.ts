import { randomUUID } from 'crypto'
import type TestAgent from 'supertest/lib/agent'

export interface SeededTenant {
  accessToken: string
  refreshToken: string
  accountId: string
  organizationId: string
  branchId: string
  userId: string
  email: string
  password: string
  authHeaders: Record<string, string>
}

interface TokenPairBody {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

interface OrganizationListItem {
  id: string
  name: string
  slug: string
  role: string
}

interface MemberWithAccount {
  id: string
  branchId: string
  accountId: string
  role: string
}

function rand(): string {
  return randomUUID().slice(0, 8)
}

export async function seedTenant(http: TestAgent): Promise<SeededTenant> {
  const tag = rand()
  const email = `e2e-${tag}@e2e.test`
  const password = 'TestPass123!'
  const name = `E2E User ${tag}`
  const orgName = `E2E Org ${tag}`

  const registerRes = await http
    .post('/auth/register')
    .send({ email, password, name, orgName })

  if (registerRes.status !== 201) {
    throw new Error(
      `seedTenant: /auth/register failed with ${registerRes.status}: ${JSON.stringify(
        registerRes.body
      )}`
    )
  }

  const tokens = registerRes.body as TokenPairBody
  const accountId = tokens.refreshToken.split(':')[0]

  // Fetch organization for this account
  const orgsRes = await http
    .get('/organizations')
    .set('Authorization', `Bearer ${tokens.accessToken}`)

  if (orgsRes.status !== 200) {
    throw new Error(
      `seedTenant: GET /organizations failed with ${orgsRes.status}: ${JSON.stringify(
        orgsRes.body
      )}`
    )
  }
  const orgs = orgsRes.body as OrganizationListItem[]
  if (!Array.isArray(orgs) || orgs.length === 0) {
    throw new Error('seedTenant: no organizations returned after register')
  }
  const organizationId = orgs[0].id

  // Fetch organization members to determine branchId + userId
  const membersRes = await http
    .get('/organizations/me/members')
    .set('Authorization', `Bearer ${tokens.accessToken}`)
    .set('X-Organization-Id', organizationId)

  if (membersRes.status !== 200) {
    throw new Error(
      `seedTenant: GET /organizations/me/members failed with ${membersRes.status}: ${JSON.stringify(
        membersRes.body
      )}`
    )
  }
  const members = membersRes.body as MemberWithAccount[]
  const ownerMember = members.find(m => m.accountId === accountId)
  if (!ownerMember) {
    throw new Error('seedTenant: owner member not found after register')
  }

  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    accountId,
    userId: accountId,
    organizationId,
    branchId: ownerMember.branchId,
    email,
    password,
    authHeaders: {
      Authorization: `Bearer ${tokens.accessToken}`,
      'X-Organization-Id': organizationId,
    },
  }
}
