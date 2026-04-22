import type { TokenStoreInterface } from '@auth/interfaces'

export class InMemoryTokenStore implements TokenStoreInterface {
  private readonly tokens = new Map<string, true>()

  async save(accountId: string, tokenId: string, _ttlDays: number): Promise<void> {
    this.tokens.set(`${accountId}:${tokenId}`, true)
  }

  async exists(accountId: string, tokenId: string): Promise<boolean> {
    return this.tokens.has(`${accountId}:${tokenId}`)
  }

  async delete(accountId: string, tokenId: string): Promise<void> {
    this.tokens.delete(`${accountId}:${tokenId}`)
  }
}
