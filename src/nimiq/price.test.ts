import { describe, expect, it } from 'vitest'
import { formatUsd } from './price'

describe('formatUsd', () => {
  it('keeps two significant digits below a cent', () => {
    expect(formatUsd(0.00030541)).toBe('~$0.00031')
  })
  it('uses cents at a cent and above', () => {
    expect(formatUsd(0.0512)).toBe('~$0.05')
    expect(formatUsd(3)).toBe('~$3.00')
  })
})
