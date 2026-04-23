export interface TokenStoreInterface {
  save(accountId: string, tokenId: string, ttlDays: number): Promise<void>
  exists(accountId: string, tokenId: string): Promise<boolean>
  delete(accountId: string, tokenId: string): Promise<void>
}
