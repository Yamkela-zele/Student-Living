import { useCallback, useEffect, useMemo, useState } from 'react'
import { api, errorMessage } from '../services/api'

export function useFetch<T>(url: string | null, params?: Record<string, unknown>) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(Boolean(url))
  const [error, setError] = useState('')
  const key = useMemo(() => JSON.stringify(params || {}), [params])
  const reload = useCallback(async () => {
    if (!url) return
    setLoading(true)
    setError('')
    try {
      const response = await api.get<T>(url, { params })
      setData(response.data)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
    // params are intentionally represented by a stable serialized key
  }, [url, key])
  useEffect(() => void reload(), [reload])
  return { data, loading, error, reload }
}
