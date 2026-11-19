import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, errorMessage } from '../services/api'
import { useAuth } from '../hooks/useAuth'
import type { Entity } from '../types'

type Value = { items: Entity[]; unread: number; loading: boolean; error: string; refresh: () => Promise<void>; markRead: (id: string) => Promise<void>; markAll: () => Promise<void> }
const NotificationContext = createContext<Value | null>(null)
export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [items, setItems] = useState<Entity[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const refresh = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data } = await api.get('/notifications')
      setItems(data.notifications || [])
      setError('')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [user])
  useEffect(() => {
    if (!user) return setItems([])
    void refresh()
    const timer = window.setInterval(refresh, 60_000)
    return () => window.clearInterval(timer)
  }, [user, refresh])
  async function markRead(id: string) {
    try {
      await api.patch(`/notifications/${id}/read`)
      setItems((all) => all.map((item) => (item.id === id ? { ...item, read: true } : item)))
      setError('')
    } catch (err) {
      setError(errorMessage(err))
      throw err
    }
  }
  async function markAll() {
    try {
      await api.patch('/notifications/read-all')
      setItems((all) => all.map((item) => ({ ...item, read: true })))
      setError('')
    } catch (err) {
      setError(errorMessage(err))
      throw err
    }
  }
  const unread = items.filter((item) => !item.read && !item.readAt).length
  const value = useMemo(() => ({ items, unread, loading, error, refresh, markRead, markAll }), [items, unread, loading, error, refresh])
  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}
export function useNotifications() {
  const value = useContext(NotificationContext)
  if (!value) throw new Error('useNotifications must be used in NotificationProvider')
  return value
}
