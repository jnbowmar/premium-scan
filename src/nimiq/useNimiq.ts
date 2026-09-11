import { init, type NimiqProvider } from '@nimiq/mini-app-sdk'
import { useEffect, useState } from 'react'

export type NimiqStatus = 'connecting' | 'ready' | 'unavailable'

/**
 * Connect to the Nimiq provider that Nimiq Pay injects into the WebView.
 * Outside Nimiq Pay (plain browser) init() times out and we report
 * 'unavailable' so the rest of the app keeps working in demo mode.
 */
export function useNimiq(timeout = 10_000) {
  const [status, setStatus] = useState<NimiqStatus>('connecting')
  const [provider, setProvider] = useState<NimiqProvider | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    init({ timeout })
      .then((p) => {
        if (cancelled) return
        setProvider(p)
        setStatus('ready')
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : String(e))
        setStatus('unavailable')
      })
    return () => {
      cancelled = true
    }
  }, [timeout])

  return { status, provider, error }
}
