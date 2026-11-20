import { useEffect, useState, type ReactNode } from 'react'
import { ArrowUpRight, Bell, LogOut, Mail, MapPin, Menu, MoonStar, ShieldCheck, X } from 'lucide-react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useNotifications } from '../../context/NotificationContext'
import type { Role } from '../../types'
import { ConfirmDialog } from '../common/Common'

export function Brand() {
  return <Link to="/" className="flex shrink-0 items-center" aria-label="Student Living home">
    <img
      src="/Student%20Living_%20Study,%20Stay,%20Thrive.png"
      alt="Student Living — Study, Stay, Thrive"
      className="h-20 w-auto object-contain"
    />
  </Link>
}
export function PublicLayout() {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const landing = pathname === '/'
  const [open, setOpen] = useState(false)
  useEffect(() => setOpen(false), [pathname])
  return <div className="min-h-screen bg-white"><header onKeyDown={(event) => event.key === 'Escape' && setOpen(false)} className={landing ? 'absolute inset-x-0 top-4 z-40 bg-transparent' : 'relative z-40 border-b border-slate-200 bg-white'}><div className={`container flex items-center justify-between ${landing ? 'min-h-16 max-w-6xl gap-3 rounded-full border border-white/30 bg-white/95 px-4 shadow-xl backdrop-blur-md md:px-6' : 'h-20'}`}><Brand /><button type="button" className="icon-btn md:hidden" aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open} aria-controls="primary-navigation" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button><nav id="primary-navigation" aria-label="Main navigation" className={`${open ? 'flex' : 'hidden'} ${landing ? 'absolute inset-x-4 top-[4.5rem] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl' : 'absolute inset-x-0 top-20 border-b bg-white p-5'} z-30 flex-col gap-2 md:static md:flex md:flex-row md:items-center md:gap-1 md:border-0 md:bg-transparent md:p-0 md:shadow-none`}><NavLink to="/accommodation">Find accommodation</NavLink><NavLink to="/about">About</NavLink><NavLink to="/contact">Contact</NavLink>{user ? <Link className="btn btn-gold" to="/dashboard">Dashboard</Link> : <><Link className="btn btn-outline" to="/login">Log in</Link><Link className="btn btn-gold" to="/register/student">Get started</Link></>}</nav></div></header><main><Outlet /></main><Footer /></div>
}
export function Footer() {
  return (
    <footer className="bg-canvas px-4 pb-6 pt-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-white/10 bg-navy text-white shadow-[0_24px_70px_rgba(16,31,64,.18)] sm:rounded-[2.5rem]">
        <div className="grid gap-10 px-6 py-10 sm:px-10 sm:py-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:gap-8 lg:px-12">
          <div>
            <p className="max-w-sm leading-7 text-slate-300">A better student home starts with clear choices. Discover accommodation, apply with confidence, and keep your housing journey in one place.</p>
            <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200">
              <MapPin size={15} className="text-gold" /> Supporting students across TUT campuses
            </p>
          </div>
          <div>
            <h2 className="font-bold text-gold">Explore</h2>
            <div className="mt-4 grid gap-3 text-sm text-slate-300">
              <Link className="transition hover:text-white" to="/accommodation">Find accommodation</Link>
              <Link className="transition hover:text-white" to="/about">About Student Living</Link>
              <Link className="transition hover:text-white" to="/contact">How we can help</Link>
            </div>
          </div>
          <div>
            <h2 className="font-bold text-gold">For students</h2>
            <div className="mt-4 grid gap-3 text-sm text-slate-300">
              <Link className="transition hover:text-white" to="/register/student">Create a student account</Link>
              <Link className="transition hover:text-white" to="/login">Sign in to your dashboard</Link>
              <p className="flex items-start gap-2 leading-6"><ShieldCheck size={16} className="mt-1 shrink-0 text-gold" />Compare listings and manage applications in one place.</p>
            </div>
          </div>
          <div>
            <h2 className="font-bold text-gold">For providers</h2>
            <p className="mt-4 text-sm leading-6 text-slate-300">Reach students looking for a place to call home. Manage property listings and applications from your provider dashboard.</p>
            <Link className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-gold px-4 py-2 text-sm font-bold text-navy transition hover:bg-gold-hover" to="/register/provider">
              List a property <ArrowUpRight size={16} />
            </Link>
            <Link className="mt-3 flex items-center gap-2 text-sm text-slate-300 transition hover:text-white" to="/contact"><Mail size={15} /> Contact our team</Link>
          </div>
        </div>
        <div className="mx-6 border-t border-white/10 sm:mx-10 lg:mx-12" />
        <div className="flex flex-col gap-2 px-6 py-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-10 lg:px-12">
          <p>© {new Date().getFullYear()} Student Living. All rights reserved.</p>
          <p>Safe accommodation. Better student living.</p>
        </div>
      </div>
    </footer>
  )
}
const links: Record<Role, Array<[string, string]>> = {
  STUDENT: [['Overview','/dashboard'],['Browse','/dashboard/browse'],['Saved searches','/dashboard/saved-searches'],['My applications','/dashboard/my-applications'],['My bookings','/dashboard/my-bookings'],['Favourites','/dashboard/favourites'],['My reviews','/dashboard/my-reviews'],['Profile','/dashboard/profile']],
  PROVIDER: [['Overview','/dashboard'],['Provider profile','/dashboard/provider-profile'],['Properties','/dashboard/properties'],['Verification','/dashboard/verification'],['Reviews','/dashboard/reviews'],['Rooms','/dashboard/rooms'],['Applications','/dashboard/applications'],['Tenants','/dashboard/tenants'],['Bookings','/dashboard/bookings']],
  UNIVERSITY_ADMIN: [['Overview','/dashboard'],['Students','/dashboard/students'],['Providers','/dashboard/providers'],['Verify properties','/dashboard/verify-properties'],['Re-verification','/dashboard/reverification'],['Review moderation','/dashboard/review-moderation'],['Applications','/dashboard/monitor-applications'],['Complaints','/dashboard/complaints'],['Reports','/dashboard/reports']],
  SYSTEM_ADMIN: [['Overview','/dashboard'],['Users','/dashboard/users'],['Roles','/dashboard/roles'],['Universities','/dashboard/universities'],['All properties','/dashboard/all-properties'],['Re-verification','/dashboard/reverification'],['Review moderation','/dashboard/review-moderation'],['Audit logs','/dashboard/audit-logs'],['Settings','/dashboard/settings']],
}
export function DashboardLayout() {
  const { user, logout } = useAuth()
  const { unread } = useNotifications()
  const [menu, setMenu] = useState(false)
  const [confirm, setConfirm] = useState(false)
  if (!user) return null
  return <div className="min-h-screen bg-mist lg:grid lg:grid-cols-[270px_1fr]"><aside className={`${menu ? 'fixed' : 'hidden'} inset-y-0 left-0 z-40 w-[270px] bg-navy p-6 text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col`}>  <div className="flex items-center justify-between"><Brand /><button className="icon-btn text-white lg:hidden" aria-label="Close menu" onClick={() => setMenu(false)}><X /></button></div><nav className="mt-10 flex flex-1 flex-col gap-1">{links[user.role].map(([name, href]) => <NavLink end={href === '/dashboard'} key={href} to={href} onClick={() => setMenu(false)} className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-active' : ''}`}>{name}</NavLink>)}<NavLink to="/dashboard/notifications" className={({ isActive }) => `sidebar-link flex items-center justify-between ${isActive ? 'sidebar-active' : ''}`}><span>Notifications</span>{unread > 0 && <span className="rounded-full bg-gold px-2 text-xs font-bold text-navy">{unread}</span>}</NavLink></nav><button className="sidebar-link flex items-center gap-3" onClick={() => setConfirm(true)}><LogOut size={19} /> Log out</button></aside><div className="min-w-0"><header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b bg-white px-4 sm:px-8"><button className="icon-btn lg:hidden" aria-label="Open menu" onClick={() => setMenu(true)}><Menu /></button><div className="ml-auto flex items-center gap-2"><Link className="icon-btn relative" aria-label={`${unread} unread notifications`} to="/dashboard/notifications"><Bell />{unread > 0 && <span className="absolute right-1 top-1 size-2 rounded-full bg-red-600" />}</Link><MoonStar className="text-slate-300" aria-hidden="true" /><div className="ml-2"><p className="text-sm font-bold">{user.firstName || user.name || 'Account'}</p><p className="text-xs text-slate-500">{user.role.replace(/_/g, ' ')}</p></div></div></header><main className="p-4 sm:p-8"><Outlet /></main></div><ConfirmDialog open={confirm} title="Log out?" text="You will need to sign in again to access your dashboard." onClose={() => setConfirm(false)} onConfirm={logout} /></div>
}
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-screen bg-canvas lg:grid-cols-[.9fr_1.1fr]">
      <section className="relative hidden min-h-screen overflow-hidden bg-navy p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
        <video className="absolute inset-0 size-full object-cover opacity-45" src="/hero.mp4" autoPlay loop muted playsInline preload="metadata" aria-hidden="true" />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-br from-navy/95 via-navy/75 to-navy/55" />
        <div aria-hidden="true" className="auth-orbit absolute -bottom-28 -left-24 size-[28rem] rounded-full border border-white/15" />
        <div className="relative z-10 animate-auth-enter"><Brand /></div>
        <div className="relative z-10 max-w-xl animate-auth-enter [animation-delay:120ms]">
          <p className="text-sm font-bold uppercase tracking-[.25em] text-gold">Student accommodation, simplified</p>
          <h1 className="mt-5 text-4xl font-black leading-tight text-white xl:text-5xl">A safer way to find your place and feel at home.</h1>
          <p className="mt-5 max-w-lg text-lg text-white/75">Join students and trusted accommodation providers on one connected platform.</p>
          <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/10 px-4 py-3 text-sm text-white/85 backdrop-blur-md">
            <span className="size-2 rounded-full bg-gold shadow-[0_0_16px_rgba(212,175,87,.9)]" />
            Find a place to belong
          </div>
        </div>
        <p className="relative z-10 text-sm text-white/55">Safe Accommodation. Better Student Living.</p>
      </section>
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-canvas via-white to-mist px-4 py-8 sm:px-8 lg:py-12">
        <div aria-hidden="true" className="auth-orbit absolute -right-32 -top-32 size-96 rounded-full border border-gold/20" />
        <div aria-hidden="true" className="auth-orbit auth-orbit-delayed absolute -bottom-40 -left-24 size-[28rem] rounded-full border border-navy/10" />
        <div className="relative z-10 w-full max-w-xl">{children}</div>
      </section>
    </main>
  )
}
