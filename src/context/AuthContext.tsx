import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api } from '../services/api'
import { supabase, supabaseEnabled } from '../integrations/supabase/client'
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

async function userFromSupabaseSession(sessionUser: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null): Promise<User | null> {
  if (!supabase || !sessionUser) return null
  const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', sessionUser.id).maybeSingle()
  if (error) throw error
  if (!profile) throw new Error('Your account profile is missing. Please contact support.')
  if (!profile.is_active) throw new Error('This account has been deactivated. Please contact support.')
  return {
    id: sessionUser.id,
    email: sessionUser.email || '',
    ...profile,
    firstName: String(profile.first_name || sessionUser.user_metadata?.first_name || ''),
    lastName: String(profile.last_name || sessionUser.user_metadata?.last_name || ''),
    role: profile.role as Role,
    phone: profile.phone || '',
    studentNumber: profile.student_number || '',
    universityId: profile.university_id || '',
    campusId: profile.campus_id || '',
    businessName: profile.business_name || '',
    registrationNumber: profile.registration_number || '',
    verificationStatus: profile.verification_status || 'PENDING',
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const refresh = useCallback(async () => {
    if (supabaseEnabled && supabase) {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        localStorage.removeItem('sl_token')
        setUser(null)
        setLoading(false)
        return
      }
      localStorage.setItem('sl_token', data.session.access_token)
      try {
        setUser(await userFromSupabaseSession(data.session.user))
      } catch {
        await supabase.auth.signOut()
        localStorage.removeItem('sl_token')
        setUser(null)
      } finally {
        setLoading(false)
      }
      return
    }

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
  useEffect(() => {
    void refresh()
    if (!supabaseEnabled || !supabase) return
    const client = supabase
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        localStorage.removeItem('sl_token')
        setUser(null)
        setLoading(false)
        return
      }
      localStorage.setItem('sl_token', session.access_token)
      void userFromSupabaseSession(session.user).then(setUser).catch(() => {
        void client.auth.signOut()
        localStorage.removeItem('sl_token')
        setUser(null)
      }).finally(() => setLoading(false))
    })
    return () => data.subscription.unsubscribe()
  }, [refresh])
  async function login(email: string, password: string) {
    if (supabaseEnabled && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      if (!data.session) throw new Error('Sign-in did not create an active session.')
      localStorage.setItem('sl_token', data.session.access_token)
      setUser(await userFromSupabaseSession(data.user))
      return
    }
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
    if (supabaseEnabled && supabase) {
      const email = String(form.email || '')
      const password = String(form.password || '')
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: {
          first_name: form.firstName,
          last_name: form.lastName,
          phone: form.phone,
          student_number: form.studentNumber,
          university_id: form.universityId,
          business_name: form.businessName,
          registration_number: form.registrationNumber,
          role: kind === 'provider' ? 'PROVIDER' : 'STUDENT',
        } },
      })
      if (error) throw error
      if (!data.user) throw new Error('Account created, but email confirmation may be required.')
      if (!data.session) throw new Error('Account created. Check your email to confirm it, then sign in.')
      localStorage.setItem('sl_token', data.session.access_token)
      setUser(await userFromSupabaseSession(data.user))
      return
    }
    const { data } = await api.post(`/auth/register/${kind}`, form)
    if (data.token) localStorage.setItem('sl_token', data.token)
    setUser(data.user)
  }
  function logout() {
    if (supabaseEnabled && supabase) void supabase.auth.signOut()
    localStorage.removeItem('sl_token')
    setUser(null)
  }
  const value = useMemo(() => ({ user, loading, login, loginDemo, register, refresh, logout }), [user, loading, refresh])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
