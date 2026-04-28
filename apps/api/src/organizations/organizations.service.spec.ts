import { Test } from '@nestjs/testing'
import * as bcrypt from 'bcrypt'
import {
  UnprocessableEntityException,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common'

import { Role } from '@glossops/database'

import { InMemoryOrganizationRepository } from './infrastructure/in-memory-organization.repository'
import { InMemoryAccountRepository } from '../auth/infrastructure/in-memory-account.repository'
import { InMemoryInvitationStore } from './infrastructure/in-memory-invitation.store'
import { OrganizationService } from './organizations.service'
import { ACCOUNT_REPOSITORY } from '../auth/auth.tokens'
import {
  ORGANIZATION_REPOSITORY,
  INVITATION_STORE,
} from './organizations.tokens'

jest.mock('@config', () => ({
  envs: {
    invitation: { expiresInDays: 7 },
    app: { frontendUrl: 'http://localhost:3001' },
  },
}))

jest.mock('bcrypt')

describe('OrganizationService', () => {
  let service: OrganizationService
  let organizations: InMemoryOrganizationRepository
  let invitationStore: InMemoryInvitationStore
  let accounts: InMemoryAccountRepository

  beforeEach(async () => {
    jest.clearAllMocks()
    organizations = new InMemoryOrganizationRepository()
    invitationStore = new InMemoryInvitationStore()
    accounts = new InMemoryAccountRepository()

    const module = await Test.createTestingModule({
      providers: [
        OrganizationService,
        { provide: ORGANIZATION_REPOSITORY, useValue: organizations },
        { provide: INVITATION_STORE, useValue: invitationStore },
        { provide: ACCOUNT_REPOSITORY, useValue: accounts },
      ],
    }).compile()

    service = module.get(OrganizationService)
  })

  describe('getMyOrganization', () => {
    it('returns the org when found', async () => {
      const { organization } = await organizations.createWithBranch(
        { name: 'T', slug: 't' },
        'acc-1'
      )
      const result = await service.getMyOrganization(organization.id)
      expect(result.id).toBe(organization.id)
    })

    it('throws NotFoundException when org does not exist', async () => {
      await expect(service.getMyOrganization('unknown')).rejects.toThrow(
        NotFoundException
      )
    })
  })

  describe('listMyOrganizations', () => {
    it('returns all orgs the account belongs to', async () => {
      await organizations.createWithBranch({ name: 'A', slug: 'a' }, 'acc-1')
      await organizations.createWithBranch({ name: 'B', slug: 'b' }, 'acc-1')
      const result = await service.listMyOrganizations('acc-1')
      expect(result).toHaveLength(2)
    })
  })

  describe('updateOrganization', () => {
    it('updates and returns the org', async () => {
      const { organization } = await organizations.createWithBranch(
        { name: 'Old', slug: 's' },
        'acc-1'
      )
      const result = await service.updateOrganization(organization.id, {
        name: 'New',
      })
      expect(result.name).toBe('New')
    })
  })

  describe('listMembers', () => {
    it('returns members for the org', async () => {
      const { organization } = await organizations.createWithBranch(
        { name: 'T', slug: 't' },
        'acc-1'
      )
      organizations.seedAccounts([
        {
          id: 'acc-1',
          email: 'a@b.com',
          firstName: 'A',
          lastName: 'B',
          avatarUrl: null,
        },
      ])
      const result = await service.listMembers(organization.id)
      expect(result).toHaveLength(1)
    })
  })

  describe('createInvitation', () => {
    it('returns an invitationUrl containing the token', async () => {
      const { invitationUrl } = await service.createInvitation(
        'org-1',
        'a@b.com',
        Role.TECHNICIAN
      )
      expect(invitationUrl).toContain('http://localhost:3001')
      expect(invitationUrl).toContain('token=')
    })

    it('saves the token in the invitation store', async () => {
      const { invitationUrl } = await service.createInvitation(
        'org-1',
        'a@b.com',
        Role.TECHNICIAN
      )
      const token = new URL(invitationUrl).searchParams.get('token')!
      const payload = await invitationStore.get(token)
      expect(payload).toEqual({
        orgId: 'org-1',
        email: 'a@b.com',
        role: Role.TECHNICIAN,
      })
    })
  })

  describe('acceptInvitation', () => {
    let orgId: string

    beforeEach(async () => {
      const { organization } = await organizations.createWithBranch(
        { name: 'T', slug: 't' },
        'owner-acc'
      )
      orgId = organization.id
    })

    it('throws BadRequestException for invalid or expired token', async () => {
      await expect(
        service.acceptInvitation({ token: 'bad-token' })
      ).rejects.toThrow(BadRequestException)
    })

    it('adds existing account as member and deletes the token', async () => {
      const existing = await accounts.create({
        email: 'a@b.com',
        passwordHash: 'h',
        firstName: 'A',
        lastName: 'B',
      })
      await invitationStore.save(
        'tok-1',
        { orgId, email: 'a@b.com', role: Role.TECHNICIAN },
        7
      )

      const result = await service.acceptInvitation({ token: 'tok-1' })

      expect(result.id).toBe(existing.id)
      expect(await invitationStore.get('tok-1')).toBeNull()
      const member = await organizations.findMember(existing.id, orgId)
      expect(member?.role).toBe(Role.TECHNICIAN)
    })

    it('creates new account + membership when email has no account and deletes token', async () => {
      jest.mocked(bcrypt.hash).mockResolvedValue('hashed' as never)
      await invitationStore.save(
        'tok-2',
        { orgId, email: 'new@b.com', role: Role.FRONT_DESK },
        7
      )

      const result = await service.acceptInvitation({
        token: 'tok-2',
        firstName: 'New',
        lastName: 'User',
        password: 'password123',
      })

      expect(result.email).toBe('new@b.com')
      expect(await invitationStore.get('tok-2')).toBeNull()
    })

    it('throws BadRequestException when new account fields missing', async () => {
      await invitationStore.save(
        'tok-3',
        { orgId, email: 'new@b.com', role: Role.FRONT_DESK },
        7
      )
      await expect(
        service.acceptInvitation({ token: 'tok-3' })
      ).rejects.toThrow(BadRequestException)
    })

    it('throws ConflictException when account is already a member', async () => {
      const existing = await accounts.create({
        email: 'a@b.com',
        passwordHash: 'h',
        firstName: 'A',
        lastName: 'B',
      })
      await organizations.addMember(orgId, existing.id, Role.TECHNICIAN)
      await invitationStore.save(
        'tok-4',
        { orgId, email: 'a@b.com', role: Role.TECHNICIAN },
        7
      )

      await expect(
        service.acceptInvitation({ token: 'tok-4' })
      ).rejects.toThrow(ConflictException)
    })

    it('throws UnprocessableEntityException when org cap of 5 is reached', async () => {
      const existing = await accounts.create({
        email: 'capped@b.com',
        passwordHash: 'h',
        firstName: 'C',
        lastName: 'D',
      })
      for (let i = 0; i < 5; i++) {
        await organizations.createWithBranch(
          { name: `O${i}`, slug: `o${i}` },
          existing.id
        )
      }
      await invitationStore.save(
        'tok-5',
        { orgId, email: 'capped@b.com', role: Role.FRONT_DESK },
        7
      )

      await expect(
        service.acceptInvitation({ token: 'tok-5' })
      ).rejects.toThrow(UnprocessableEntityException)
    })

    it('does not delete token when accept fails (retry safe)', async () => {
      const existing = await accounts.create({
        email: 'a@b.com',
        passwordHash: 'h',
        firstName: 'A',
        lastName: 'B',
      })
      await organizations.addMember(orgId, existing.id, Role.TECHNICIAN)
      await invitationStore.save(
        'tok-6',
        { orgId, email: 'a@b.com', role: Role.TECHNICIAN },
        7
      )

      await expect(
        service.acceptInvitation({ token: 'tok-6' })
      ).rejects.toThrow(ConflictException)
      expect(await invitationStore.get('tok-6')).not.toBeNull()
    })
  })

  describe('removeOrganization', () => {
    it('soft-deletes an ACTIVE organization', async () => {
      const { organization } = await organizations.createWithBranch(
        { name: 'T', slug: 't' },
        'acc-1'
      )
      await service.removeOrganization(organization.id, false)
      await expect(service.getMyOrganization(organization.id)).rejects.toThrow(
        NotFoundException
      )
    })

    it('throws NotFoundException when soft-deleting a DELETED organization', async () => {
      const { organization } = await organizations.createWithBranch(
        { name: 'T', slug: 't' },
        'acc-1'
      )
      await organizations.softDelete(organization.id)
      await expect(
        service.removeOrganization(organization.id, false)
      ).rejects.toThrow(NotFoundException)
    })

    it('throws NotFoundException when soft-deleting a non-existent organization', async () => {
      await expect(
        service.removeOrganization('unknown', false)
      ).rejects.toThrow(NotFoundException)
    })

    it('permanently deletes an ACTIVE organization', async () => {
      const { organization } = await organizations.createWithBranch(
        { name: 'T', slug: 't' },
        'acc-1'
      )
      await service.removeOrganization(organization.id, true)
      await expect(service.getMyOrganization(organization.id)).rejects.toThrow(
        NotFoundException
      )
    })

    it('permanently deletes a DELETED organization (Owner cleaning up)', async () => {
      const { organization } = await organizations.createWithBranch(
        { name: 'T', slug: 't' },
        'acc-1'
      )
      await organizations.softDelete(organization.id)
      await expect(
        service.removeOrganization(organization.id, true)
      ).resolves.toBeUndefined()
    })

    it('throws NotFoundException when permanently deleting a non-existent organization', async () => {
      await expect(service.removeOrganization('unknown', true)).rejects.toThrow(
        NotFoundException
      )
    })
  })
})
