import { Role } from '@glossops/database'

import { InMemoryInvitationStore } from './in-memory-invitation.store'

const payload = { orgId: 'org-1', email: 'a@b.com', role: Role.TECHNICIAN }

describe('InMemoryInvitationStore', () => {
  let store: InMemoryInvitationStore

  beforeEach(() => {
    store = new InMemoryInvitationStore()
  })

  it('returns payload after saving a token', async () => {
    await store.save('tok-1', payload, 7)
    expect(await store.get('tok-1')).toEqual(payload)
  })

  it('returns null for unknown token', async () => {
    expect(await store.get('unknown')).toBeNull()
  })

  it('returns null after deleting a token', async () => {
    await store.save('tok-1', payload, 7)
    await store.delete('tok-1')
    expect(await store.get('tok-1')).toBeNull()
  })

  it('returns null when TTL has expired', async () => {
    await store.save('tok-1', payload, -1) // negative days = already expired
    expect(await store.get('tok-1')).toBeNull()
  })
})
