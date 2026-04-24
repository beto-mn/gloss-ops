import type {
  InvitationStoreInterface,
  InvitationPayload,
} from '@organizations/interfaces'

interface Entry {
  payload: InvitationPayload
  expiresAt: number
}

export class InMemoryInvitationStore implements InvitationStoreInterface {
  private readonly store = new Map<string, Entry>()

  save(
    token: string,
    payload: InvitationPayload,
    ttlDays: number
  ): Promise<void> {
    const expiresAt = Date.now() + ttlDays * 24 * 60 * 60 * 1000
    this.store.set(token, { payload, expiresAt })
    return Promise.resolve()
  }

  get(token: string): Promise<InvitationPayload | null> {
    const entry = this.store.get(token)
    if (!entry || Date.now() > entry.expiresAt) return Promise.resolve(null)
    return Promise.resolve(entry.payload)
  }

  delete(token: string): Promise<void> {
    this.store.delete(token)
    return Promise.resolve()
  }
}
