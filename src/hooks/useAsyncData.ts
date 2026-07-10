import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react'

interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
  setData: React.Dispatch<React.SetStateAction<T | null>>
}

/**
 * Minimal data-fetching hook for the IPC bridge: tracks loading/error, exposes a
 * refetch, and ignores results from stale calls so rapid refetches never race.
 */
export function useAsyncData<T>(fn: () => Promise<T>, deps: DependencyList = []): AsyncState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fnRef = useRef(fn)
  fnRef.current = fn
  const callId = useRef(0)

  const refetch = useCallback(async () => {
    const id = ++callId.current
    setLoading(true)
    setError(null)
    try {
      const result = await fnRef.current()
      if (id === callId.current) setData(result)
    } catch (err) {
      if (id === callId.current) setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      if (id === callId.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refetch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { data, loading, error, refetch, setData }
}
