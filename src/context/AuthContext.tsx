import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api } from '../services/api'
import type { Role, User } from '../types'

type AuthValue = {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  loginDemo: (role: Role) => Promise<void>
  register: (kind: 'student' | 'provider', form: Record<string, unknown>) => Promise<void>
  refresh: () => Promise<void>
  logout: () => void
}
export const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const refresh = useCallback(async () => {
    const token = localStorage.getItem('sl_token')
    if (!token) {
      setUser(null)
      setLoading(false)
      return
    }
    try {
      const { data } = await api.get('/auth/me')
      setUser(data.user || data)
    } catch {
      localStorage.removeItem('sl_token')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => void refresh(), [refresh])
  async function login(email: string, password: string) {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('sl_token', data.token)
    setUser(data.user)
  }
  async function loginDemo(role: Role) {
    const { data } = await api.post('/auth/demo-login', { role })
    localStorage.setItem('sl_token', data.token)
    setUser(data.user)
  }
  async function register(kind: 'student' | 'provider', form: Record<string, unknown>) {
    const { data } = await api.post(`/auth/register/${kind}`, form)
    if (data.token) localStorage.setItem('sl_token', data.token)
    setUser(data.user)
  }
  function logout() {
    localStorage.removeItem('sl_token')
    setUser(null)
  }
  const value = useMemo(() => ({ user, loading, login, loginDemo, register, refresh, logout }), [user, loading, refresh])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
