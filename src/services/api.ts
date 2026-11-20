import axios, { AxiosError } from 'axios'
import { demoAdapter, demoMode } from './demoApi'
import { supabaseAdapter } from './supabaseAdapter'
import { supabaseEnabled } from '../integrations/supabase/client'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  ...(demoMode ? { adapter: demoAdapter } : supabaseEnabled ? { adapter: supabaseAdapter } : {}),
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sl_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && localStorage.getItem('sl_token')) {
      localStorage.removeItem('sl_token')
      if (window.location.pathname !== '/login') window.location.assign('/login')
    }
    return Promise.reject(error)
  },
)

export function errorMessage(error: unknown) {
  if (!navigator.onLine) return 'You appear to be offline. Check your connection and try again.'
  if (axios.isAxiosError(error)) {
    if (!error.response) return 'Cannot reach the server. Please try again shortly.'
    const message = String(error.response.data?.message || 'The request could not be completed.')
    if (/rate limit|too many/i.test(message)) return 'Too many requests. Please wait a few minutes before trying again.'
    return message
  }
  if (error instanceof Error) {
    if (/rate limit|too many/i.test(error.message)) return 'Too many requests. Please wait a few minutes before trying again.'
    return error.message
  }
  return 'Something went wrong.'
}

export async function runAction<T>(fn: () => Promise<T>, after?: (value: T) => void) {
  try {
    const value = await fn()
    after?.(value)
    return { value, error: '' }
  } catch (error) {
    return { error: errorMessage(error) }
  }
}

export async function openDocument(id: string) {
  const response = await api.get(`/documents/${id}`, { responseType: 'blob' })
  const url = URL.createObjectURL(response.data)
  window.open(url, '_blank', 'noopener,noreferrer')
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
