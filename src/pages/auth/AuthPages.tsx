import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { AuthLayout, Brand } from '../../components/layout/Layout'
import { Button } from '../../components/common/Common'
import { useAuth } from '../../hooks/useAuth'
import { api, errorMessage } from '../../services/api'
import { validateRegistration } from '../../utils/validators'
import { useFetch } from '../../hooks/useFetch'
import type { Entity, Role } from '../../types'
import { demoMode } from '../../services/demoApi'

function Shell({ title, text, children }: { title: string; text: string; children: React.ReactNode }) { return <AuthLayout><div className="mb-8 lg:hidden"><Brand /></div><div className="card p-7 sm:p-9"><h1 className="text-3xl font-black">{title}</h1><p className="mt-2 text-slate-600">{text}</p>{children}</div></AuthLayout> }
export function Login() {
  const { user, login, loginDemo } = useAuth(); const navigate=useNavigate(); const [error,setError]=useState(''); const [busy,setBusy]=useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  if(user) return <Navigate to="/dashboard" replace />
  async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setError('');try{await login(email,password);navigate('/dashboard')}catch(err){setError(errorMessage(err))}finally{setBusy(false)}}
  async function enterDemo(role: Role) {
    setBusy(true)
    setError('')
    try {
      await loginDemo(role)
      navigate('/dashboard')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }
  const demoRoles: Array<{ role: Role; title: string; email: string }> = [
    { role: 'STUDENT', title: 'Student', email: 'student@studentliving.test' },
    { role: 'PROVIDER', title: 'Accommodation provider', email: 'provider@studentliving.test' },
    { role: 'UNIVERSITY_ADMIN', title: 'University admin', email: 'university@studentliving.test' },
    { role: 'SYSTEM_ADMIN', title: 'System admin', email: 'system@studentliving.test' },
  ]
  return <Shell title={demoMode ? 'Explore the demo' : 'Welcome back'} text={demoMode ? 'Choose a sample account to explore the platform.' : 'Sign in to continue to your dashboard.'}>
    {demoMode ? <>
      <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        Demo environment: all accounts and changes use temporary sample data. No real accounts or services are connected.
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {demoRoles.map(({ role, title, email: demoEmail }) => <button key={role} type="button" className="rounded-xl border border-slate-200 p-4 text-left transition hover:border-gold hover:bg-amber-50 disabled:opacity-60" disabled={busy} onClick={() => void enterDemo(role)}>
          <span className="block font-bold text-navy">Continue as {title}</span>
          <span className="mt-1 block text-xs text-slate-500">{demoEmail}</span>
        </button>)}
      </div>
      {error && <p className="error-banner mt-4" role="alert">{error}</p>}
      {busy && <p className="mt-3 text-center text-sm text-slate-500" role="status">Opening sample account…</p>}
    </> : <>
      <form className="mt-7 space-y-4" onSubmit={submit}>
        <label className="label">Email<input required type="email" name="email" autoComplete="email" className="input mt-2" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label className="label">Password<input required type="password" name="password" autoComplete="current-password" className="input mt-2" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        <div className="text-right"><Link className="text-link text-sm" to="/forgot-password">Forgot password?</Link></div>
        {error && <p className="error-banner" role="alert">{error}</p>}
        <Button className="btn-gold w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</Button>
      </form>
      <p className="mt-6 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Demo accounts are provisioned by the connected API. Ask your environment administrator for demo credentials.</p>
      <p className="mt-6 text-center text-sm text-slate-600">New here? <Link className="text-link" to="/register/student">Student registration</Link> or <Link className="text-link" to="/register/provider">provider registration</Link></p>
    </>}
  </Shell>
}
export function Register({ kind }: { kind: 'student'|'provider' }) {
  const { register }=useAuth();const navigate=useNavigate();const [error,setError]=useState('');const [fieldErrors,setFieldErrors]=useState<Record<string,string[]>>({})
  const { data: universities } = useFetch<{ universities: Entity[] }>('/universities')
  async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const values=Object.fromEntries(new FormData(e.currentTarget)) as Record<string,string>;const errors=validateRegistration(values,kind==='student');if(errors)return setFieldErrors(errors);try{await register(kind,values);navigate('/dashboard')}catch(err:any){setError(errorMessage(err));setFieldErrors(err.response?.data?.errors||{})}}
  const field=(name:string,label:string,type='text')=><label className="label">{label}<input required={name!=='registrationNumber'} name={name} type={type} className="input mt-2" />{fieldErrors[name]?.map(x=><span className="field-error" key={x}>{x}</span>)}</label>
  return <Shell title={kind==='student'?'Create your student account':'Grow with Student Living'} text={kind==='student'?'Find verified accommodation and manage your journey.':'List and manage trusted student accommodation.'}><form className="mt-7 grid gap-4 sm:grid-cols-2" onSubmit={submit}>{field('firstName','First name')}{field('lastName','Last name')}{field('email','Email','email')}{field('phone','Phone','tel')}{kind==='student'?<>{field('studentNumber','Student number')}<label className="label sm:col-span-2">University<select required name="universityId" className="input mt-2"><option value="">Select university</option>{(universities?.universities||[]).map((u)=><option key={u.id} value={u.id}>{String(u.name)}</option>)}</select></label></>:<>{field('businessName','Business name')}{field('registrationNumber','Registration number (optional)')}</>}<div className="sm:col-span-2">{field('password','Password','password')}</div>{error&&<p className="error-banner sm:col-span-2" role="alert">{error}</p>}<Button className="btn-gold sm:col-span-2">Create account</Button></form><p className="mt-5 text-center text-sm">Already registered? <Link className="text-link" to="/login">Sign in</Link></p></Shell>
}
export function PasswordPage({ reset=false }:{reset?:boolean}){const [params]=useSearchParams();const [status,setStatus]=useState('');async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const form=Object.fromEntries(new FormData(e.currentTarget));try{await api.post(reset?'/auth/reset-password':'/auth/forgot-password',reset?{...form,token:params.get('token')}:form);setStatus(reset?'Your password has been reset. You can now sign in.':'If an account exists for that email, reset instructions are on their way.')}catch(err){setStatus(errorMessage(err))}}return <Shell title={reset?'Choose a new password':'Reset your password'} text={reset?'Use at least 8 characters, an uppercase letter and a number.':'Enter your email and we’ll send reset instructions.'}><form className="mt-7 space-y-4" onSubmit={submit}><label className="label">{reset?'New password':'Email'}<input required className="input mt-2" name={reset?'password':'email'} type={reset?'password':'email'} /></label>{status&&<p className="rounded-xl bg-slate-100 p-4 text-sm" role="status">{status}</p>}<Button className="btn-gold w-full">{reset?'Reset password':'Send instructions'}</Button></form></Shell>}
