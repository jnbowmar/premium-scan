import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { bandTag, daysBetween, parseOcc, round, scanChain, type CboeChain } from './screener'

const FIX = join(import.meta.dirname, '__fixtures__')
const DATA = join(import.meta.dirname, '..', '..', 'public', 'data')

describe('helpers', () => {
  it('parses OCC symbols', () => {
    expect(parseOcc('MARA260911C00004000')).toEqual({
      root: 'MARA',
      exp: new Date(Date.UTC(2026, 8, 11)),
      cp: 'C',
      strike: 4,
    })
    expect(parseOcc('garbage')).toBeNull()
  })
  it('counts calendar days', () => {
    expect(daysBetween(new Date(Date.UTC(2026, 8, 11)), new Date(Date.UTC(2026, 9, 16)))).toBe(35)
  })
  it('rounds like the Python', () => {
    expect(round(0.12345, 4)).toBe(0.1235)
    expect(round(1.0049, 3)).toBe(1.005)
  })
  it('tags bands', () => {
    expect(bandTag(2.5)).toBe('LOTTO')
    expect(bandTag(1.0)).toBe('TARGET')
    expect(bandTag(1.5)).toBe('high')
    expect(bandTag(0.7)).toBe('near')
  })
})

describe('parity with yield_hunter.py', () => {
  const fixtures = readdirSync(FIX).filter((f) => f.endsWith('.expected.json'))
  it('has fixtures (run: python3 scripts/parity.py)', () => {
    expect(fixtures.length).toBeGreaterThan(0)
  })
  for (const file of fixtures) {
    const expected = JSON.parse(readFileSync(join(FIX, file), 'utf8'))
    it(`${expected.symbol} matches rules v${expected.rules_version}`, () => {
      const chain: CboeChain = JSON.parse(readFileSync(join(DATA, `${expected.symbol}.json`), 'utf8'))
      const got = scanChain(chain, new Date(`${expected.as_of}T00:00:00Z`))
      if (expected.result === null) {
        expect(got).toBeNull()
        return
      }
      expect(got).not.toBeNull()
      expect(got!.spot).toBe(expected.result.spot)
      expect(got!.iv30).toBeCloseTo(expected.result.iv30, 6)
      expect(got!.rows.length).toBe(expected.result.rows.length)
      got!.rows.forEach((row, i) => {
        const want = expected.result.rows[i]
        expect(row.side).toBe(want.side)
        expect(row.exp).toBe(want.exp)
        expect(row.dte).toBe(want.dte)
        expect(row.k).toBe(want.k)
        expect(row.oi).toBe(want.oi)
        for (const f of ['mid', 'cycle', 'ann', 'delta', 'bid', 'ask'] as const) expect(row[f]).toBeCloseTo(want[f], 4)
        if (want.side === 'csp') expect(row.cushion).toBeCloseTo(want.cushion, 4)
        else expect(row.if_called).toBeCloseTo(want.if_called, 4)
      })
    })
  }
})
