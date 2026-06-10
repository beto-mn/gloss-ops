import { describe, it, expect } from 'vitest'

import { cn } from './utils'

describe('cn()', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar', { baz: true, qux: false })).toBe('foo bar baz')
  })

  it('deduplicates conflicting Tailwind classes — last wins', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })

  it('handles undefined and null inputs', () => {
    expect(cn('foo', undefined, null as unknown as string, 'bar')).toBe(
      'foo bar'
    )
  })

  it('returns empty string when given no truthy classes', () => {
    expect(cn({ foo: false })).toBe('')
  })
})
