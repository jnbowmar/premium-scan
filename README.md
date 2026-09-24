# Premium Scan

[![test](https://github.com/jnbowmar/premium-scan/actions/workflows/test.yml/badge.svg)](https://github.com/jnbowmar/premium-scan/actions/workflows/test.yml)

A [Nimiq Pay](https://nimiq.com) Mini App that answers one question for options premium sellers: **which cash-secured puts and covered calls on a ticker pay 60%+ annualized right now, and what is the market charging for?**

Each scan costs a few cents in NIM. That is the point of the app, not the revenue: a working example of a pay-per-use tool that runs inside a wallet, with no account, no API key, and no app store commission.

Built for the [Nimiq Mini Apps Competition](https://miniappscompetition.com), Cycle III (October 2026). Open source under MIT.

## What it shows

For a ticker, every expiry 5 to 49 days out:

- **CSP rows**: out-of-the-money puts. Cycle yield = mid / strike, annualized by 365 / DTE. Cushion = how far spot can fall before the strike.
- **CC rows**: out-of-the-money calls priced as a buy-write at spot. Static cycle yield = mid / spot, plus the if-called return.
- Liquidity floors: bid > 0, open interest >= 100, bid-ask spread <= 25% of mid.
- Only rows at 60%+ annualized print. 80 to 120% is the **TARGET** band. Above 200% is **LOTTO**, where the tape is screaming event risk.

Every row shows delta next to the yield. Yield like this is the price of real risk, not free money. TARGET-band delta is usually 0.25 to 0.45, so assignment is the plan, not the tail. A hit is a candidate for your own fundamental and earnings check. Nothing here is advice.

## Stack

- Vite + TypeScript + React, mobile-first, no backend.
- `@nimiq/mini-app-sdk` for the wallet: `init()` connects to the provider Nimiq Pay injects, `sendBasicTransactionWithData` takes the scan fee.
- `src/lib/screener.ts` is a pure-function port of a Python screen. `scripts/parity.py` runs the Python original against the same data and writes fixtures; `npm test` asserts the TypeScript port matches row for row.

## Run it

```bash
npm install
npm run dev -- --host
```

Open **Nimiq Pay** on a phone on the same Wi-Fi, go to **Mini Apps**, and enter the Network URL the terminal prints (`http://<lan-ip>:5173`, not localhost). In a normal browser the app still works in free demo mode and says so.

To charge for scans, put your own NIM address in `.env.local`:

```
VITE_SCAN_RECIPIENT=NQ..
```

Test payments on testnet first: long-press the settings button in Nimiq Pay for 10 seconds to reveal the network switch, and use "Get free NIM".

## Data

The browser cannot call Cboe's delayed-quote CDN directly (no CORS header), so the app scans snapshots vendored under `public/data/`:

```bash
npm run fetch-chain -- MARA IONQ SOFI   # refresh snapshots
npm run parity                          # regenerate test fixtures from the Python original
npm test
```

These are free delayed quotes captured for a demo. They are not a live feed and not licensed for commercial redistribution. A production version would sit behind a licensed chain provider.

## Roadmap

- [x] Scaffold, screener port, parity tests, demo mode
- [ ] Verify the provider connection on a phone (`isConsensusEstablished`, `listAccounts`)
- [ ] Pay-per-scan on testnet, then mainnet with a real recipient
- [ ] Handle user-cancelled payments and provider errors cleanly
- [ ] Ticker search over a larger vendored universe
- [ ] Pre-ship checklist from the Nimiq skill (`.agents/skills/mini-apps/references/checklist.md`)
- [ ] Deploy as a static site and register for Cycle III

## License

MIT. See [LICENSE](LICENSE).
