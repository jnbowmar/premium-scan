import { useEffect, useState } from 'react'
import { bandTag, scanChain, type CboeChain, type ScanResult } from './lib/screener'
import { payForScan, SCAN_PRICE_NIM, SCAN_RECIPIENT } from './nimiq/pay'
import { useNimiq } from './nimiq/useNimiq'

interface DataIndex {
  fetched_at: string
  symbols: { symbol: string; last_trade_time: string; contracts: number }[]
}

const pct = (x: number, digits = 0) => `${(100 * x).toFixed(digits)}%`

export default function App() {
  const nimiq = useNimiq()
  const [index, setIndex] = useState<DataIndex | null>(null)
  const [symbol, setSymbol] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<ScanResult | null | 'empty'>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    fetch('data/index.json')
      .then((r) => r.json())
      .then((idx: DataIndex) => {
        setIndex(idx)
        if (idx.symbols[0]) setSymbol(idx.symbols[0].symbol)
      })
      .catch(() => setMessage('Could not load the demo data index.'))
  }, [])

  const paid = nimiq.status === 'ready' && Boolean(SCAN_RECIPIENT)

  async function runScan() {
    if (!symbol) return
    setBusy(true)
    setMessage(null)
    setResult(null)
    try {
      if (paid && nimiq.provider) {
        const hash = await payForScan(nimiq.provider, `premium-scan ${symbol}`)
        setMessage(`Paid ${SCAN_PRICE_NIM} NIM. tx ${hash.slice(0, 10)}…`)
      }
      const chain: CboeChain = await fetch(`data/${symbol}.json`).then((r) => r.json())
      // Snapshot date comes from the chain itself so a stale demo file still scans sanely.
      const asOf = chain.data.last_trade_time ? new Date(chain.data.last_trade_time) : new Date()
      setResult(scanChain(chain, asOf) ?? 'empty')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main>
      <header>
        <h1>Premium Scan</h1>
        <p className="sub">Which puts and calls pay 60%+ annualized right now, and what the market is charging for.</p>
      </header>

      <p className={`status ${nimiq.status}`}>
        {nimiq.status === 'connecting' && 'Connecting to Nimiq Pay…'}
        {nimiq.status === 'ready' && (paid ? `Wallet connected. Each scan costs ${SCAN_PRICE_NIM} NIM.` : 'Wallet connected. Free demo mode (no recipient configured).')}
        {nimiq.status === 'unavailable' && 'Not inside Nimiq Pay. Running in free demo mode.'}
      </p>

      <label className="field">
        <span>Ticker</span>
        <select value={symbol} onChange={(e) => setSymbol(e.target.value)} disabled={!index}>
          {index?.symbols.map((s) => (
            <option key={s.symbol} value={s.symbol}>
              {s.symbol}
            </option>
          ))}
        </select>
      </label>

      <button className="primary" onClick={runScan} disabled={busy || !symbol}>
        {busy ? 'Scanning…' : paid ? `Pay ${SCAN_PRICE_NIM} NIM and scan` : 'Scan (free demo)'}
      </button>

      {message && <p className="note">{message}</p>}

      {result === 'empty' && <p className="note">Nothing on {symbol} clears 60% annualized after the liquidity floors.</p>}

      {result && result !== 'empty' && (
        <section className="result">
          <p className="spot">
            {result.symbol} spot {result.spot.toFixed(2)}
            {result.iv30 != null && <> · IV30 {pct(result.iv30)}</>}
          </p>
          <ul className="rows">
            {result.rows.map((r) => (
              <li key={`${r.side}${r.exp}${r.k}`} className={`row band-${bandTag(r.ann)}`}>
                <div className="line1">
                  <strong>{r.side.toUpperCase()}</strong> {r.exp} {r.k.toFixed(2)}
                  {r.side === 'csp' ? 'P' : 'C'} · {r.dte}d
                  <span className="tag">{bandTag(r.ann)}</span>
                </div>
                <div className="line2">
                  ann {pct(r.ann)} · cycle {pct(r.cycle, 1)} · mid {r.mid.toFixed(2)} · Δ {r.delta.toFixed(2)} · OI {r.oi}
                </div>
                <div className="line3">{r.side === 'csp' ? `cushion ${pct(r.cushion ?? 0, 1)}` : `if called ${pct(r.if_called ?? 0, 1)}`}</div>
              </li>
            ))}
          </ul>
          <p className="fine">
            Read the yield as the market's risk estimate. TARGET-band delta is usually 0.25 to 0.45, so assignment is the plan, not the tail. Demo data is a
            delayed snapshot{index ? ` from ${index.fetched_at.slice(0, 10)}` : ''}. Not advice.
          </p>
        </section>
      )}
    </main>
  )
}
