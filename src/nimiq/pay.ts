import type { NimiqProvider } from '@nimiq/mini-app-sdk'

export const LUNA_PER_NIM = 100_000

/** Price of one scan, in NIM. Cheap on purpose: the point is the micro-payment, not the revenue. */
export const SCAN_PRICE_NIM = 1

/**
 * Where scan payments go. Set VITE_SCAN_RECIPIENT in .env.local to your own
 * NIM address (NQ.. format). When unset the app runs every scan for free in
 * demo mode, so the repo works out of the box.
 */
export const SCAN_RECIPIENT: string | undefined = import.meta.env.VITE_SCAN_RECIPIENT

/**
 * Ask the wallet to send SCAN_PRICE_NIM to SCAN_RECIPIENT. Nimiq Pay shows a
 * native confirmation dialog; the user can cancel, which rejects here.
 * Returns the transaction hash on success.
 */
export async function payForScan(provider: NimiqProvider, memo: string): Promise<string> {
  if (!SCAN_RECIPIENT) throw new Error('No scan recipient configured')
  const result = await provider.sendBasicTransactionWithData({
    recipient: SCAN_RECIPIENT,
    value: SCAN_PRICE_NIM * LUNA_PER_NIM,
    data: memo,
  })
  if (typeof result !== 'string') {
    throw new Error('Payment was not completed')
  }
  return result
}
