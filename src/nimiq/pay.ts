import type { NimiqProvider } from '@nimiq/mini-app-sdk'

export const LUNA_PER_NIM = 100_000

/** Price of one scan, in NIM. Cheap on purpose: the point is the micro-payment, not the revenue. */
export const SCAN_PRICE_NIM = 1

/**
 * Where scan payments go. Set VITE_SCAN_RECIPIENT in .env.local to your own
 * NIM address (NQ.. format). When unset the app runs every scan for free in
 * demo mode, so the repo works out of the box. The value "self" pays the
 * connected wallet's own first account, for testing the payment flow without
 * moving money anywhere.
 */
export const SCAN_RECIPIENT: string | undefined = import.meta.env.VITE_SCAN_RECIPIENT

/**
 * Ask the wallet to send SCAN_PRICE_NIM to SCAN_RECIPIENT. Nimiq Pay shows a
 * native confirmation dialog; the user can cancel, which rejects here.
 * Returns the transaction hash on success.
 */
export async function payForScan(provider: NimiqProvider, memo: string): Promise<string> {
  if (!SCAN_RECIPIENT) throw new Error('No scan recipient configured')
  const recipient = SCAN_RECIPIENT === 'self' ? await ownAddress(provider) : SCAN_RECIPIENT
  const result = await provider.sendBasicTransactionWithData({
    recipient,
    value: SCAN_PRICE_NIM * LUNA_PER_NIM,
    data: memo,
  })
  if (typeof result !== 'string') {
    // Rejections come back as an ErrorResponse, not a thrown error.
    const detail = result && typeof result === 'object' && 'error' in result ? `: ${result.error.message} (${result.error.type})` : `: ${JSON.stringify(result)}`
    throw new Error(`Payment was not completed${detail}`)
  }
  return result
}

/**
 * The wallet bridge has no timeout of its own, so a dialog that closes without
 * answering would leave the scan stuck forever. Give up after `ms`.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`No answer from the wallet after ${ms / 1000}s`)), ms)
    promise.then(
      (v) => {
        clearTimeout(timer)
        resolve(v)
      },
      (e: unknown) => {
        clearTimeout(timer)
        reject(e)
      },
    )
  })
}

async function ownAddress(provider: NimiqProvider): Promise<string> {
  const accounts = await provider.listAccounts()
  if (!Array.isArray(accounts) || !accounts[0]) throw new Error('No wallet account to pay')
  return accounts[0]
}

/**
 * Nimiq Pay rejects with plain objects (not Error instances), which String()
 * turns into "[object Object]". Pull out a readable message; unknown shapes
 * keep their raw JSON so they can be diagnosed from the phone.
 */
export function describeError(e: unknown): string {
  if (e instanceof Error) return e.message
  if (e && typeof e === 'object') {
    const o = e as { code?: unknown; message?: unknown; error?: { message?: unknown } }
    // Seen on a real phone: {"code":4001,"message":"user rejected the request","type":"PERMISSION_DENIED"}
    // (4001 is the standard EIP-1193 "user rejected" code).
    if (o.code === 4001) return 'You cancelled the payment. No NIM was sent.'
    const msg = typeof o.message === 'string' ? o.message : typeof o.error?.message === 'string' ? o.error.message : null
    let raw: string
    try {
      raw = JSON.stringify(e)
    } catch {
      raw = Object.prototype.toString.call(e)
    }
    return msg ? `${msg} (${raw})` : raw
  }
  return String(e)
}
