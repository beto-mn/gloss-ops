import { InMemoryTokenStore } from './in-memory-token.store'

describe('InMemoryTokenStore', () => {
  let store: InMemoryTokenStore

  beforeEach(() => {
    store = new InMemoryTokenStore()
  })

  it('save → exists returns true', async () => {
    await store.save('acc', 'tok', 30)
    expect(await store.exists('acc', 'tok')).toBe(true)
  })

  it('exists returns false for unknown token', async () => {
    expect(await store.exists('acc', 'unknown')).toBe(false)
  })

  it('delete → exists returns false', async () => {
    await store.save('acc', 'tok', 30)
    await store.delete('acc', 'tok')
    expect(await store.exists('acc', 'tok')).toBe(false)
  })

  it('does not cross-contaminate different accounts', async () => {
    await store.save('acc-1', 'tok', 30)
    expect(await store.exists('acc-2', 'tok')).toBe(false)
  })
})
