import { describe, expect, it } from 'vitest'
import { describeError } from './pay'

describe('describeError', () => {
  it('maps the wallet rejection seen on a real phone', () => {
    const rejected = { code: 4001, message: 'user rejected the request', type: 'PERMISSION_DENIED' }
    expect(describeError(rejected)).toBe('You cancelled the payment. No NIM was sent.')
  })

  it('keeps raw JSON for unknown object errors', () => {
    expect(describeError({ code: 1, message: 'boom' })).toBe('boom ({"code":1,"message":"boom"})')
  })

  it('passes Error messages through', () => {
    expect(describeError(new Error('No answer'))).toBe('No answer')
  })
})
