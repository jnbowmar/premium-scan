import { useEffect, useState } from 'react'

// CoinGecko's free endpoint sends CORS headers, so the WebView can call it directly.
const PRICE_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=nimiq-2&vs_currencies=usd'

/** Live NIM/USD price, or null until loaded (or if the lookup fails, in which case USD is just hidden). */
export function useNimUsd(): number | null {
  const [usd, setUsd] = useState<number | null>(null)
  useEffect(() => {
    let cancelled = false
    fetch(PRICE_URL)
      .then((r) => r.json())
      .then((j: { 'nimiq-2'?: { usd?: number } }) => {
        const p = j['nimiq-2']?.usd
        if (!cancelled && typeof p === 'number' && p > 0) setUsd(p)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])
  return usd
}

/** "~$0.0003" style label: two significant digits, so sub-cent prices stay readable. */
export function formatUsd(amount: number): string {
  if (amount >= 0.01) return `~$${amount.toFixed(2)}`
  return `~$${Number(amount.toPrecision(2))}`
}
