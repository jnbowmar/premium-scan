// Vendor a trimmed snapshot of the Cboe delayed option chain for demo mode.
//
// Cboe's CDN sends no Access-Control-Allow-Origin header, so the browser
// cannot call it directly from inside Nimiq Pay's WebView. The contest build
// therefore ships snapshots under public/data/ and scans those. This is the
// same free, delayed source the Python yield_hunter uses; it is a demo feed,
// not a licensed live feed (see README "Data").
//
// Usage: node scripts/fetch-chain.mjs MARA IONQ SOFI
import { mkdir, writeFile } from 'node:fs/promises'

const OUT = new URL('../public/data/', import.meta.url)
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
const syms = process.argv.slice(2).map((s) => s.toUpperCase())
if (syms.length === 0) {
  console.error('usage: node scripts/fetch-chain.mjs SYM [SYM...]')
  process.exit(1)
}

await mkdir(OUT, { recursive: true })
const index = []
for (const sym of syms) {
  const url = `https://cdn-api.cboe.com/api/global/delayed_quotes/options/${sym}.json`
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) {
    console.error(`${sym}: HTTP ${res.status}`)
    continue
  }
  const { data } = await res.json()
  const trimmed = {
    data: {
      symbol: data.symbol,
      current_price: data.current_price,
      close: data.close,
      iv30: data.iv30,
      last_trade_time: data.last_trade_time,
      options: (data.options ?? []).map((o) => ({
        option: o.option,
        bid: o.bid,
        ask: o.ask,
        open_interest: o.open_interest,
        delta: o.delta,
        iv: o.iv,
      })),
    },
  }
  await writeFile(new URL(`${sym}.json`, OUT), JSON.stringify(trimmed))
  index.push({ symbol: sym, last_trade_time: data.last_trade_time, contracts: trimmed.data.options.length })
  console.log(`${sym}: ${trimmed.data.options.length} contracts, last trade ${data.last_trade_time}`)
  await new Promise((r) => setTimeout(r, 1000))
}
await writeFile(new URL('index.json', OUT), JSON.stringify({ fetched_at: new Date().toISOString(), symbols: index }, null, 2))
