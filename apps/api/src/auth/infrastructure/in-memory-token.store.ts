import type { TokenStoreInterface } from '@auth/interfaces'

export class InMemoryTokenStore implements TokenStoreInterface {
  private readonly tokens = new Map<string, true>()

  save(accountId: string, tokenId: string, _ttlDays: number): Promise<void> {
    this.tokens.set(`${accountId}:${tokenId}`, true)
    return Promise.resolve()
  }

  exists(accountId: string, tokenId: string): Promise<boolean> {
    return Promise.resolve(this.tokens.has(`${accountId}:${tokenId}`))
  }

  delete(accountId: string, tokenId: string): Promise<void> {
    this.tokens.delete(`${accountId}:${tokenId}`)
    return Promise.resolve()
  }
}
