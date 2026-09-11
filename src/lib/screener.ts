// Premium Scan core: a TypeScript port of ~/Claude/option_analysis/scripts/
// yield_hunter.py (rules v1). Pure functions, no I/O, so the same math runs
// in the browser, in tests, and against the Python original for parity.
//
// The screen finds the cash-secured puts (CSP) and covered calls (CC) that
// pay 60%+ annualized and prints the honest context next to the yield:
// delta (rough assignment odds), downside cushion, and the band tag. Yield
// like that is the price of real risk, not free money. A hit is a
// candidate for a fundamental check, never a trade.

export const RULES_VERSION = 1
export const DTE_LO = 5
export const DTE_HI = 49
export const BAND_LO = 0.6 // floor to print at all
export const TARGET_LO = 0.8 // the newsletter band
export const TARGET_HI = 1.2
export const LOTTO = 2.0 // above this the tape is screaming event risk
export const MIN_OI = 100
export const MAX_SPREAD = 0.25 // of mid
export const MAX_ROWS_PER_SIDE = 2

/** Shape of one contract in Cboe's delayed_quotes JSON (trimmed by scripts/fetch-chain.mjs). */
export interface CboeOption {
  option: string
  bid?: number | null
  ask?: number | null
  open_interest?: number | null
  delta?: number | null
  iv?: number | null
}

export interface CboeChain {
  data: {
    symbol: string
    current_price?: number | null
    close?: number | null
    iv30?: number | null
    last_trade_time?: string
    options?: CboeOption[]
  }
}

export type Side = 'csp' | 'cc'
export type Band = 'LOTTO' | 'TARGET' | 'high' | 'near'

export interface Row {
  side: Side
  exp: string // ISO date
  dte: number
  k: number
  delta: number
  bid: number
  ask: number
  oi: number
  mid: number
  cycle: number
  ann: number
  /** CSP only: (spot - k) / spot */
  cushion?: number
  /** CC only: (mid + k - spot) / spot */
  if_called?: number
}

export interface ScanResult {
  symbol: string
  spot: number
  iv30: number | null
  rows: Row[]
}

const OPT = /^([A-Z]+?)(\d{6})([CP])(\d{8})$/

/** Round half away from zero to n decimals; close enough to Python's round for parity tests. */
export function round(x: number, n: number): number {
  const f = 10 ** n
  return Math.round(x * f) / f
}

/** Whole days from `today` to `exp`, both treated as calendar dates (UTC). */
export function daysBetween(today: Date, exp: Date): number {
  const a = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  const b = Date.UTC(exp.getUTCFullYear(), exp.getUTCMonth(), exp.getUTCDate())
  return Math.round((b - a) / 86_400_000)
}

/** Parse an OCC symbol like MARA260911C00004000 into its parts. */
export function parseOcc(sym: string): { root: string; exp: Date; cp: 'C' | 'P'; strike: number } | null {
  const m = OPT.exec(sym)
  if (!m) return null
  const [, root, ymd, cp, k8] = m
  const exp = new Date(Date.UTC(2000 + Number(ymd.slice(0, 2)), Number(ymd.slice(2, 4)) - 1, Number(ymd.slice(4, 6))))
  return { root, exp, cp: cp as 'C' | 'P', strike: Number(k8) / 1000 }
}

function isLiquid(bid: number, ask: number, oi: number): boolean {
  const mid = (bid + ask) / 2
  return bid > 0 && oi >= MIN_OI && mid > 0 && (ask - bid) / mid <= MAX_SPREAD
}

export function bandTag(ann: number): Band {
  if (ann >= LOTTO) return 'LOTTO'
  if (ann >= TARGET_LO && ann <= TARGET_HI) return 'TARGET'
  return ann > TARGET_HI ? 'high' : 'near'
}

/**
 * Scan one chain. Returns null when the chain has no spot or nothing clears
 * the BAND_LO floor after the liquidity filters (same as the Python).
 */
export function scanChain(chain: CboeChain, today: Date): ScanResult | null {
  const d = chain.data
  const spot = d.current_price || d.close
  if (!spot) return null
  let iv30 = d.iv30 ?? null
  if (iv30 && iv30 > 3) iv30 = iv30 / 100

  const puts: Row[] = []
  const calls: Row[] = []
  for (const o of d.options ?? []) {
    const p = parseOcc(o.option ?? '')
    if (!p || o.delta == null) continue
    const dte = daysBetween(today, p.exp)
    if (dte < DTE_LO || dte > DTE_HI) continue
    const bid = o.bid ?? 0
    const ask = o.ask ?? 0
    const oi = Math.trunc(o.open_interest ?? 0)
    if (!isLiquid(bid, ask, oi)) continue
    const mid = round((bid + ask) / 2, 3)
    const base = { exp: p.exp.toISOString().slice(0, 10), dte, k: p.strike, delta: o.delta, bid, ask, oi, mid }
    if (p.cp === 'P' && p.strike <= spot) {
      const cyc = mid / p.strike
      puts.push({ ...base, side: 'csp', cycle: round(cyc, 4), ann: round((cyc * 365) / dte, 4), cushion: round((spot - p.strike) / spot, 4) })
    } else if (p.cp === 'C' && p.strike >= spot) {
      const cyc = mid / spot
      calls.push({ ...base, side: 'cc', cycle: round(cyc, 4), ann: round((cyc * 365) / dte, 4), if_called: round((mid + p.strike - spot) / spot, 4) })
    }
  }

  const rows: Row[] = []
  for (const pool of [puts, calls]) {
    // Array.prototype.sort is stable, matching Python's sorted() on ties.
    const hits = pool.filter((r) => r.ann >= BAND_LO).sort((a, b) => b.ann - a.ann)
    rows.push(...hits.slice(0, MAX_ROWS_PER_SIDE))
  }
  if (rows.length === 0) return null
  return { symbol: d.symbol, spot, iv30, rows }
}
