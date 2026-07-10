import { ListActivityLogsQuerySchema } from '@glossops/shared'

const validUuid = 'd3f5a1b2-0000-4000-8000-000000000000'

describe('Activity log request schemas', () => {
  it('coerces page/limit and accepts entity/action filters', () => {
    const parsed = ListActivityLogsQuerySchema.parse({
      page: '1',
      limit: '20',
      entity: 'WorkOrder',
      entityId: validUuid,
      action: 'STATUS_CHANGED',
    })
    expect(parsed.page).toBe(1)
    expect(parsed.limit).toBe(20)
    expect(parsed.action).toBe('STATUS_CHANGED')
  })

  it('allows an uncapped limit (former DTO had no @Max)', () => {
    expect(ListActivityLogsQuerySchema.parse({ limit: '500' }).limit).toBe(500)
  })

  it('rejects an invalid action enum value', () => {
    expect(() =>
      ListActivityLogsQuerySchema.parse({ action: 'BOGUS' })
    ).toThrow()
  })
})
