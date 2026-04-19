import { Test, TestingModule } from '@nestjs/testing'

import { RedisTokenStore } from './redis-token.store'

jest.mock('@config', () => ({
  envs: { redis: { url: 'redis://localhost:6379' } },
}))

const mockRedis = {
  set: jest.fn().mockResolvedValue('OK'),
  exists: jest.fn().mockResolvedValue(0),
  del: jest.fn().mockResolvedValue(1),
  quit: jest.fn().mockResolvedValue(undefined),
}

jest.mock('ioredis', () => jest.fn().mockImplementation(() => mockRedis))

describe('RedisTokenStore', () => {
  let store: RedisTokenStore

  beforeEach(async () => {
    jest.clearAllMocks()
    const module: TestingModule = await Test.createTestingModule({
      providers: [RedisTokenStore],
    }).compile()
    store = module.get(RedisTokenStore)
  })

  describe('save', () => {
    it('calls SET with correct key and TTL in seconds', async () => {
      await store.save('acc-1', 'tok-1', 30)
      expect(mockRedis.set).toHaveBeenCalledWith(
        'refresh:acc-1:tok-1',
        '1',
        'EX',
        30 * 24 * 60 * 60
      )
    })
  })

  describe('exists', () => {
    it('returns true when key exists in Redis', async () => {
      mockRedis.exists.mockResolvedValueOnce(1)
      expect(await store.exists('acc-1', 'tok-1')).toBe(true)
    })

    it('returns false when key does not exist', async () => {
      mockRedis.exists.mockResolvedValueOnce(0)
      expect(await store.exists('acc-1', 'missing')).toBe(false)
    })
  })

  describe('delete', () => {
    it('calls DEL with correct key', async () => {
      await store.delete('acc-1', 'tok-1')
      expect(mockRedis.del).toHaveBeenCalledWith('refresh:acc-1:tok-1')
    })
  })
})
