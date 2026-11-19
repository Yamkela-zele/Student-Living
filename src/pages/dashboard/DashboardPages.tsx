import { useState, type FormEvent, type ReactNode } from 'react'
import { Download, Plus, Printer, Save, Eye, Pencil, BedDouble } from 'lucide-react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button, ConfirmDialog, EmptyState, ErrorBox, Loader, Modal, StatusBadge } from '../../components/common/Common'
import { PropertyCard } from '../../components/marketplace/Property'
import { useNotifications } from '../../context/NotificationContext'
import { useAuth } from '../../hooks/useAuth'
import { useFetch } from '../../hooks/useFetch'
import { api, errorMessage, openDocument } from '../../services/api'
import type { Entity, Property } from '../../types'
import { fmtDate, fmtMoney, label } from '../../utils/format'
import { Accommodation } from '../public/PublicPages'

export function DashboardHome() {
  const { user } = useAuth()
  const { data, loading, error, reload } = useFetch<{ stats: Entity[]; recent: Entity[] }>('/dashboard/stats')
  return <Page title={`Welcome back, ${user?.firstName || 'there'}`} text="Here’s what’s happening across your account.">
    {user?.role === 'PROVIDER' && <div className="mb-5 flex items-center gap-3"><span className="font-semibold">Provider verification</span><StatusBadge status={user.verificationStatus || 'PENDING'} /></div>}
    {loading ? <Loader /> : error ? <ErrorBox message={error} retry={reload} /> : <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{(data?.stats || []).map((s) => <div className="card" key={s.label}><p className="text-sm font-semibold text-slate-500">{String(s.label)}</p><p className="mt-3 text-3xl font-black text-navy">{String(s.value)}</p></div>)}</div>
      <div className="card mt-7"><h2 className="text-xl font-black">Recent activity</h2>{data?.recent?.length ? <div className="mt-4 divide-y">{data.recent.map((x) => <div className="flex justify-between gap-5 py-4" key={x.id}><p>{String(x.text || x.action || 'Activity')}</p><time className="text-sm text-slate-500">{fmtDate(x.at || x.createdAt)}</time></div>)}</div> : <EmptyState title="No recent activity" />}</div>
    </>}
  </Page>
}
export function SavedSearches() {
  const { pathname } = useLocation()
  const { data, loading, error, reload } = useFetch<{ savedSearches?: Entity[] }>('/saved-searches')
  const [message, setMessage] = useState('')
  async function remove(id: string) {
    setMessage('')
    try {
      await api.delete(`/saved-searches/${encodeURIComponent(id)}`)
      setMessage('Saved search removed.')
      await reload()
    } catch (err) {
      setMessage(errorMessage(err))
    }
  }
  const searches = data?.savedSearches || []
  return <Page title="Saved searches" text="Revisit your filters and get notified when new homes match.">
    {message && <p className="mb-4 text-sm text-slate-600" role="status">{message}</p>}
    {loading ? <Loader /> : error ? <ErrorBox message={error} retry={reload} /> : !searches.length ? <EmptyState title="No saved searches yet" text="Save a campus or room-type search from Browse to keep it here." /> : <div className="grid gap-4 md:grid-cols-2">{searches.map((item) => {
      const filters = item.filters && typeof item.filters === 'object' ? item.filters as Record<string, string> : {}
      const query = new URLSearchParams(filters).toString()
      return <article className="card" key={item.id}>
        <h2 className="text-lg font-extrabold">{String(item.name || 'Saved search')}</h2>
        <p className="mt-2 text-sm text-slate-600">{Object.entries(filters).filter(([key]) => key !== 'universityId').map(([key, value]) => `${label(key)}: ${value}`).join(' · ') || 'All matching accommodation'}</p>
        <p className="mt-3 text-xs text-slate-500">Alerts are enabled for new matching properties.</p>
        <div className="mt-4 flex gap-3"><Link className="btn btn-navy" to={`${pathname.startsWith('/dashboard/') ? '/dashboard/browse' : '/accommodation'}${query ? `?${query}` : ''}`}>Run search</Link><Button className="btn-outline" onClick={() => void remove(String(item.id))}>Remove</Button></div>
      </article>
    })}</div>}
  </Page>
}
export function ProviderReviews() {
  const { data, loading, error, reload } = useFetch<{ reviews?: Entity[] }>('/provider/reviews')
  const [responses, setResponses] = useState<Record<string, string>>({})
  const [messages, setMessages] = useState<Record<string, string>>({})
  const reviews = data?.reviews || []
  async function submit(event: FormEvent<HTMLFormElement>, review: Entity) {
    event.preventDefault()
    const response = responses[String(review.id)]?.trim()
    if (!response) return
    setMessages((current) => ({ ...current, [review.id]: 'Saving…' }))
    try {
      await api.post(`/properties/${encodeURIComponent(String(review.property?.id))}/reviews/${encodeURIComponent(String(review.id))}/responses`, { response })
      setMessages((current) => ({ ...current, [review.id]: 'Response published.' }))
      await reload()
    } catch (err) {
      setMessages((current) => ({ ...current, [review.id]: errorMessage(err) }))
    }
  }
  return <Page title="Reviews" text="Respond professionally to student feedback. Responses appear publicly with the review.">
    {loading ? <Loader /> : error ? <ErrorBox message={error} retry={reload} /> : !reviews.length ? <EmptyState title="No reviews to respond to" /> : <div className="grid max-w-3xl gap-4">{reviews.map((review) => <article className="card" key={review.id}><p className="text-sm font-bold text-gold-dark">{String(review.property?.name || 'Property')} · {String(review.rating || '—')}/5</p><p className="mt-2 text-sm text-slate-500">{String(review.studentName || 'Student')}</p><p className="mt-2">{String(review.comment || review.name || '')}</p>{review.providerResponse ? <div className="mt-4 rounded-xl bg-mist p-4"><b>Your response</b><p className="mt-1 text-sm">{String(review.providerResponse)}</p></div> : <form className="mt-4 grid gap-3" onSubmit={(event) => void submit(event, review)}><label className="label">Provider response<textarea className="input mt-2 min-h-24" minLength={5} required value={responses[String(review.id)] || ''} onChange={(event) => setResponses((current) => ({ ...current, [review.id]: event.target.value }))} /></label><Button className="btn-gold sm:w-fit">Publish response</Button></form>}{messages[String(review.id)] && <p className="mt-3 text-sm text-slate-600" role="status">{messages[String(review.id)]}</p>}</article>)}</div>}
  </Page>
}

export function PropertyReverification() {
  const { data, loading, error, reload } = useFetch<{ properties?: Property[] }>('/admin/reverification-due')
  const [messages, setMessages] = useState<Record<string, string>>({})
  const [busyId, setBusyId] = useState('')
  async function reverify(property: Property) {
    setBusyId(property.id)
    setMessages((current) => ({ ...current, [property.id]: '' }))
    try {
      await api.post(`/admin/properties/${encodeURIComponent(property.id)}/reverification`)
      setMessages((current) => ({ ...current, [property.id]: 'Verification recorded; the next review is due in 12 months.' }))
      await reload()
    } catch (err) {
      setMessages((current) => ({ ...current, [property.id]: errorMessage(err) }))
    } finally {
      setBusyId('')
    }
  }
  return <Page title="Property re-verification" text="Review each approved property at least once every 12 months. Confirm current inspection and certificate evidence before recording a review.">
    <p className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">This demo page records a review action only. Production re-verification must verify uploaded evidence and be enforced by the backend.</p>
    {loading ? <Loader /> : error ? <ErrorBox message={error} retry={reload} /> : !data?.properties?.length ? <EmptyState title="No properties to review" /> : <div className="grid gap-4 lg:grid-cols-2">{data.properties.map((property) => <article key={property.id} className="card"><div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-bold">{property.name}</h2><p className="mt-1 text-sm text-slate-600">{property.campus?.name || property.campusName || 'Campus not recorded'}</p></div><StatusBadge status={property.verificationStatus || property.status} /></div><dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-slate-500">Last verified</dt><dd className="font-semibold">{property.lastVerifiedAt || 'Not recorded'}</dd></div><div><dt className="text-slate-500">Review due</dt><dd className="font-semibold">{property.reverificationDueAt || 'Not scheduled'}</dd></div></dl><div className="mt-4 flex flex-wrap gap-2"><Button className="btn-gold" disabled={busyId === property.id} onClick={() => void reverify(property)}>{busyId === property.id ? 'Saving…' : 'Record verification complete'}</Button><Link className="btn btn-outline" to={`/dashboard/properties/${encodeURIComponent(property.id)}`}>Review documents</Link></div>{messages[property.id] && <p role="status" className="mt-3 text-sm text-slate-600">{messages[property.id]}</p>}</article>)}</div>}
  </Page>
}

export function ReviewModerationQueue() {
  const { data, loading, error, reload } = useFetch<{ flags?: Entity[] }>('/admin/review-flags')
  const [message, setMessage] = useState('')
  const [failure, setFailure] = useState('')
  const [busyId, setBusyId] = useState('')
  async function update(flag: Entity, hideReview: boolean) {
    setBusyId(flag.id)
    setFailure('')
    setMessage('')
    try {
      const endpoint = `/admin/review-flags/${encodeURIComponent(String(flag.id))}${hideReview ? '/hide-review' : ''}`
      if (hideReview) await api.patch(endpoint, {})
      else await api.patch(endpoint, { status: 'RESOLVED' })
      setMessage(hideReview ? 'Review hidden from public view.' : 'Flag dismissed.')
      await reload()
    } catch (err) {
      setFailure(errorMessage(err))
    } finally {
      setBusyId('')
    }
  }
  const flags = data?.flags || []
  return <Page title="Review moderation" text="Assess student flags and record a moderation outcome.">
    {message && <p className="mb-4 text-sm text-emerald-700" role="status">{message}</p>}
    {failure && <ErrorBox message={failure} />}
    {loading ? <Loader /> : error ? <ErrorBox message={error} retry={reload} /> : !flags.length ? <EmptyState title="No flagged reviews" /> : <div className="grid gap-4 lg:grid-cols-2">{flags.map((flag) => <article className="card" key={flag.id}><div className="flex items-start justify-between gap-3"><h2 className="font-bold">{String(flag.review?.property?.name || 'Property review')}</h2><StatusBadge status={flag.status} /></div><p className="mt-2 text-sm">{String(flag.review?.comment || flag.review?.name || 'Review unavailable')}</p><p className="mt-3 text-sm text-slate-600"><b>Flag reason:</b> {String(flag.reason || 'Not provided')}</p><p className="mt-1 text-xs text-slate-500">Reported {fmtDate(flag.createdAt)}</p>{flag.status === 'OPEN' && <div className="mt-4 flex flex-wrap gap-2"><Button className="btn-outline" disabled={busyId === flag.id} onClick={() => void update(flag, false)}>Dismiss flag</Button><Button className="bg-red-700 text-white" disabled={busyId === flag.id} onClick={() => void update(flag, true)}>Hide review</Button></div>}</article>)}</div>}
  </Page>
}
export function Profile({ provider = false }: { provider?: boolean }) {
  const { user, refresh } = useAuth()
  const [status, setStatus] = useState('')
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setStatus('Saving…')
    try { await api.put('/profile', Object.fromEntries(new FormData(e.currentTarget))); await refresh(); setStatus('Profile saved.') }
    catch (err) { setStatus(errorMessage(err)) }
  }
  return <Page title="My profile" text="Keep your personal and contact details up to date."><form className="card grid max-w-3xl gap-4 sm:grid-cols-2" onSubmit={submit}>
    {(provider ? ['firstName', 'lastName', 'phone', 'businessName'] : ['firstName', 'lastName', 'phone', 'course', 'yearOfStudy']).map((n) => <label className="label" key={n}>{label(n.replace(/([A-Z])/g, '_$1'))}<input className="input mt-2" name={n} defaultValue={String(user?.[n] || '')} /></label>)}
    <label className="label">Email<input disabled className="input mt-2" value={user?.email || ''} /></label>{status && <p role="status" className="sm:col-span-2">{status}</p>}<Button className="btn-gold sm:col-span-2 sm:w-fit"><Save size={18} /> Save changes</Button>
  </form></Page>
}

export function Notifications() {
  const { items, loading, error, refresh, markRead, markAll } = useNotifications()
  return <Page title="Notifications" text="Updates about applications, bookings and your account." action={<Button className="btn-outline" onClick={() => void markAll().catch(() => undefined)}>Mark all read</Button>}>
    {loading ? <Loader /> : error ? <ErrorBox message={error} retry={refresh} /> : !items.length ? <EmptyState title="You’re all caught up" /> : <div className="card divide-y p-0">{items.map((n) => <button onClick={() => void markRead(n.id).catch(() => undefined)} className={`block min-h-20 w-full p-5 text-left hover:bg-slate-50 ${!n.read && !n.readAt ? 'border-l-4 border-gold bg-amber-50/50' : ''}`} key={n.id}><b>{String(n.title || 'Update')}</b><p className="mt-1 text-sm text-slate-600">{String(n.message || n.text || '')}</p></button>)}</div>}
  </Page>
}

type ResourceConfig = { title: string; text: string; endpoint: string; key: string; add?: string; print?: boolean; kind: string }
const resources: Record<string, ResourceConfig> = {
  '/dashboard/my-applications': { title: 'My applications', text: 'Track your accommodation applications from submission to decision.', endpoint: '/applications/mine', key: 'applications', kind: 'student-applications' },
  '/dashboard/my-bookings': { title: 'My bookings', text: 'Confirmed stays and booking details.', endpoint: '/bookings/mine', key: 'bookings', kind: 'student-bookings' },
  '/dashboard/favourites': { title: 'Favourites', text: 'Places you’ve saved for later.', endpoint: '/favourites', key: 'properties', kind: 'favourites' },
  '/dashboard/my-reviews': { title: 'My reviews', text: 'Your feedback on completed stays.', endpoint: '/reviews/mine', key: 'reviews', kind: 'reviews' },
  '/dashboard/properties': { title: 'My properties', text: 'Manage listings, verification and room inventory.', endpoint: '/provider/properties', key: 'properties', add: '/dashboard/properties/new', kind: 'provider-properties' },
  '/dashboard/verification': { title: 'Property verification', text: 'Review statuses and administrator feedback.', endpoint: '/provider/properties', key: 'properties', kind: 'verification' },
  '/dashboard/reverification': { title: 'Property re-verification', text: 'Review approved properties every 12 months.', endpoint: '/admin/reverification-due', key: 'properties', kind: 'reverification' },
  '/dashboard/rooms': { title: 'Manage rooms', text: 'Add rooms and update availability for each property.', endpoint: '/provider/properties', key: 'properties', kind: 'rooms' },
  '/dashboard/applications': { title: 'Applications', text: 'Review student applications and supporting documents.', endpoint: '/provider/applications', key: 'applications', kind: 'provider-applications' },
  '/dashboard/tenants': { title: 'Current tenants', text: 'Students currently staying in your properties.', endpoint: '/provider/bookings?current=true', key: 'bookings', kind: 'tenants' },
  '/dashboard/bookings': { title: 'Bookings', text: 'Review and manage accommodation bookings.', endpoint: '/provider/bookings', key: 'bookings', kind: 'provider-bookings' },
  '/dashboard/students': { title: 'Registered students', text: 'Students registered with your institution.', endpoint: '/admin/students', key: 'students', kind: 'students' },
  '/dashboard/providers': { title: 'Accommodation providers', text: 'Review registered providers and their verification.', endpoint: '/admin/providers', key: 'providers', kind: 'providers' },
  '/dashboard/verify-properties': { title: 'Verify properties', text: 'Review property listings and supporting documents.', endpoint: '/admin/properties', key: 'properties', kind: 'verify-properties' },
  '/dashboard/monitor-applications': { title: 'Applications overview', text: 'Monitor applications across your institution.', endpoint: '/admin/applications', key: 'applications', kind: 'monitor-applications' },
  '/dashboard/complaints': { title: 'Complaints', text: 'Review and resolve reported accommodation issues.', endpoint: '/admin/complaints', key: 'complaints', kind: 'complaints' },
  '/dashboard/reports': { title: 'Reports', text: 'Live institutional figures from the reporting API.', endpoint: '/admin/reports', key: 'report', print: true, kind: 'reports' },
  '/dashboard/users': { title: 'Manage users', text: 'Review accounts and control platform access.', endpoint: '/system/users', key: 'users', kind: 'users' },
  '/dashboard/roles': { title: 'Roles & permissions', text: 'Manage access levels across the platform.', endpoint: '/system/users', key: 'users', kind: 'roles' },
  '/dashboard/universities': { title: 'Universities & campuses', text: 'Manage participating institutions and campuses.', endpoint: '/universities', key: 'universities', kind: 'universities' },
  '/dashboard/all-properties': { title: 'All properties', text: 'Review every listing across the platform.', endpoint: '/admin/properties', key: 'properties', add: '/dashboard/properties/new', kind: 'all-properties' },
  '/dashboard/audit-logs': { title: 'Audit logs', text: 'Review security and administrative system activity.', endpoint: '/system/audit-logs', key: 'logs', kind: 'audit-logs' },
  '/dashboard/settings': { title: 'System settings', text: 'Manage platform configuration values.', endpoint: '/system/settings', key: 'settings', kind: 'settings' },
}

function collection(data: any, key: string): Entity[] {
  const value = data?.[key] ?? data?.data?.[key] ?? data?.data ?? data
  if (Array.isArray(value)) return value
  if (value && typeof value === 'object' && Array.isArray(value.items)) return value.items
  return []
}
function displayName(item: Entity) { return String(item.name || item.reference || item.title || item.studentName || item.providerName || item.email || item.key || item.id || 'Item') }
function entityStatus(item: Entity) { return item.status || (item.isActive === false ? 'INACTIVE' : item.isActive === true ? 'ACTIVE' : 'UNKNOWN') }

export function ResourcePage() {
  const { pathname } = useLocation()
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const config = resources[pathname] || resources['/dashboard/my-applications']
  const { data, loading, error, reload } = useFetch<any>(config.endpoint)
  const allItems = collection(data, config.key)
  const selectedPropertyId = searchParams.get('propertyId') || ''
  const items = config.kind === 'rooms' && selectedPropertyId
    ? allItems.filter((property) => String(property.id) === selectedPropertyId)
    : allItems
  const [dialog, setDialog] = useState<{ item: Entity; action: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [roomProperty, setRoomProperty] = useState<Entity | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [bookingTarget, setBookingTarget] = useState<Entity | null>(null)
  const [bookingDetails, setBookingDetails] = useState<Entity | null>(null)
  const [bookingAction, setBookingAction] = useState<'issue' | 'review' | null>(null)
  const [bookingBusy, setBookingBusy] = useState(false)
  const navigate = useNavigate()

  async function act(item: Entity, action: string, reason = '') {
    setBusy(true); setActionError(''); setActionMessage('')
    try {
      const id = encodeURIComponent(String(item.id))
      if (action === 'cancel') await api.patch(`/applications/${id}/cancel`)
      else if (action === 'remove-favourite') await api.delete(`/favourites/${id}`)
      else if (action === 'start-review-application') await api.patch(`/provider/applications/${id}`, { status: 'UNDER_REVIEW' })
      else if (action === 'approve-application') await api.patch(`/provider/applications/${id}`, { status: 'APPROVED' })
      else if (action === 'reject-application') await api.patch(`/provider/applications/${id}`, { status: 'REJECTED', reason })
      else if (action === 'review-provider') await api.patch(`/admin/providers/${id}`, { status: 'UNDER_REVIEW' })
      else if (action === 'verify-provider') await api.patch(`/admin/providers/${id}`, { status: 'APPROVED' })
      else if (action === 'reject-provider') await api.patch(`/admin/providers/${id}`, { status: 'REJECTED', reason })
      else if (action === 'suspend-provider') await api.patch(`/admin/providers/${id}`, { status: 'SUSPENDED', reason })
      else if (action === 'suspend-property') await api.patch(`/admin/properties/${id}`, { status: 'SUSPENDED', reason })
      else if (action === 'approve-property') await api.patch(`/admin/properties/${id}`, { status: 'APPROVED' })
      else if (action === 'start-review-property') await api.patch(`/admin/properties/${id}`, { status: 'UNDER_REVIEW' })
      else if (action === 'reject-property') await api.patch(`/admin/properties/${id}`, { status: 'REJECTED', reason })
      else if (action === 'resolve-complaint') await api.patch(`/admin/complaints/${id}`, { status: 'RESOLVED', reason })
      else if (action === 'close-complaint') await api.patch(`/admin/complaints/${id}`, { status: 'RESOLVED', reason })
      else if (action === 'toggle-user') await api.patch(`/system/users/${id}`, { isActive: item.isActive === false })
      else if (action === 'change-role') {
        if (String(item.id) === user?.id) throw new Error('You cannot change your own role.')
        await api.patch(`/system/users/${id}`, { role: reason })
      }
      else if (action === 'delete-review') await api.delete(`/reviews/${id}`)
      setDialog(null); setActionMessage('Changes saved.'); reload()
    } catch (err) { setActionError(errorMessage(err)) }
    finally { setBusy(false) }
  }
  async function updateRoom(room: Entity, status: string) {
    setActionError('')
    try {
      await api.patch(`/provider/rooms/${encodeURIComponent(String(room.id))}`, { availability: status })
      setActionMessage('Room availability updated.')
      reload()
    } catch (err) {
      setActionError(errorMessage(err))
    }
  }
  async function submitBookingAction(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!bookingDetails || !bookingAction) return
    const values = Object.fromEntries(new FormData(e.currentTarget))
    setBookingBusy(true)
    setActionError('')
    try {
      if (bookingAction === 'issue') {
        await api.post('/complaints', { bookingId: bookingDetails.id, message: values.message })
      } else {
        await api.post('/reviews', { bookingId: bookingDetails.id, ...values })
      }
      setBookingAction(null)
      setBookingDetails(null)
      setActionMessage(bookingAction === 'issue' ? 'Issue reported.' : 'Review submitted.')
      reload()
    } catch (err) {
      setActionError(errorMessage(err))
    } finally {
      setBookingBusy(false)
    }
  }
  async function submitForm(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = e.currentTarget; const body = Object.fromEntries(new FormData(form)); setBusy(true); setActionError('')
    try {
      if (config.kind === 'rooms' && roomProperty) {
        await api.post(`/provider/properties/${roomProperty.id}/rooms`, body)
      } else if (config.kind === 'reviews') {
        await api.post('/reviews', body)
      } else if (config.kind === 'universities') {
        await api.post('/system/universities', body)
      } else if (config.kind === 'users') {
        await api.post('/system/users', { ...body, role: 'UNIVERSITY_ADMIN' })
      } else if (config.kind === 'settings') {
        const settings = Object.fromEntries(new FormData(form))
        await Promise.all(Object.entries(settings).map(([key, value]) => api.put(`/system/settings/${encodeURIComponent(key)}`, { value })))
      }
      setFormOpen(false); setRoomProperty(null); setActionMessage('Changes saved.'); reload()
    } catch (err) { setActionError(errorMessage(err)) }
    finally { setBusy(false) }
  }
  const actionTitle = dialog ? ({ cancel: 'Cancel application?', 'remove-favourite': 'Remove favourite?', 'approve-application': 'Approve application?', 'reject-application': 'Reject application?', 'start-review-application': 'Start application review?', 'review-provider': 'Start provider review?', 'verify-provider': 'Approve provider?', 'reject-provider': 'Reject provider?', 'suspend-provider': 'Suspend provider?', 'approve-property': 'Approve property?', 'start-review-property': 'Start property review?', 'reject-property': 'Reject property?', 'suspend-property': 'Suspend property?', 'resolve-complaint': 'Resolve complaint?', 'toggle-user': itemActiveTitle(dialog.item), 'delete-review': 'Delete review?' } as Record<string, string>)[dialog.action] || 'Confirm action' : ''
  const requiresReason = Boolean(dialog && ['reject-application', 'reject-provider', 'suspend-provider', 'suspend-property', 'reject-property', 'resolve-complaint', 'change-role'].includes(dialog.action))

  return <Page title={config.title} text={config.text} action={<div className="flex gap-2">{config.print && <Button className="btn-outline print:hidden" onClick={() => window.print()}><Printer size={18} /> Print / save PDF</Button>}{config.add && <Link className="btn btn-gold" to={config.add}><Plus size={18} /> Add property</Link>}{config.kind === 'universities' && <Button className="btn-gold" onClick={() => setFormOpen(true)}><Plus size={18} /> Add university</Button>}{config.kind === 'users' && <Button className="btn-gold" onClick={() => setFormOpen(true)}><Plus size={18} /> New university admin</Button>}</div>}>
    {config.kind === 'rooms' && !loading && !error && <label className="label mb-5 block max-w-sm">Property<select className="input mt-2" value={selectedPropertyId} onChange={(e) => { const next = new URLSearchParams(searchParams); e.target.value ? next.set('propertyId', e.target.value) : next.delete('propertyId'); setSearchParams(next) }}><option value="">All my properties</option>{allItems.map((property) => <option key={property.id} value={property.id}>{displayName(property)}</option>)}</select></label>}
    {actionError && <ErrorBox message={actionError} />}{actionMessage && <p role="status" className="mb-4 rounded-xl bg-emerald-50 p-3 text-emerald-800">{actionMessage}</p>}
    {loading ? <Loader /> : error ? <ErrorBox message={error} retry={reload} /> : !items.length ? <EmptyState title={config.kind === 'settings' ? 'No settings returned' : undefined} /> : config.kind === 'favourites' ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{(items as Property[]).map((p) => <PropertyCard property={p} key={p.id} detailsPath={`/dashboard/property/${p.id}`} onFavourite={() => setDialog({ item: p, action: 'remove-favourite' })} favourite />)}</div>         : config.kind === 'settings' ? <form className="card grid max-w-3xl gap-4" onSubmit={submitForm}><h2 className="text-xl font-bold">Platform configuration</h2>{items.map((setting) => <label className="label" key={setting.key || setting.id}>{label(String(setting.key || setting.name || setting.id))}<input className="input mt-2" name={String(setting.key || setting.name || setting.id)} defaultValue={String(setting.value ?? '')} /></label>)}<Button className="btn-gold sm:w-fit"><Save size={18} /> Save settings</Button></form> : config.kind === 'reports' ? <ReportData data={data} /> : <ResourceTable config={config} items={items} currentUserId={user?.id} onAction={(item, action) => setDialog({ item, action })} onRooms={(item) => { setRoomProperty(item); setFormOpen(true) }} onEdit={(item) => navigate(`/dashboard/properties/${item.id}/edit`)} onRoomStatus={updateRoom} onConfirmBooking={setBookingTarget} onBookingDetails={setBookingDetails} />}
    <ConfirmDialog open={Boolean(dialog) && !requiresReason} title={actionTitle} text={dialog ? actionText(dialog.action, dialog.item) : ''} busy={busy} onClose={() => setDialog(null)} onConfirm={() => dialog && void act(dialog.item, dialog.action)} />
    <Modal open={Boolean(dialog) && requiresReason} title={actionTitle} onClose={() => setDialog(null)}>{dialog && <ReasonForm label={dialog.action === 'change-role' ? 'New role' : ['resolve-complaint', 'close-complaint'].includes(dialog.action) ? 'Resolution / reason' : 'Reason'} select={dialog.action === 'change-role'} onCancel={() => setDialog(null)} busy={busy} onSubmit={(reason) => void act(dialog.item, dialog.action, reason)} />}</Modal>
    <Modal open={Boolean(bookingTarget)} title="Confirm booking" onClose={() => setBookingTarget(null)}>{bookingTarget && <BookingForm busy={busy} onSubmit={async (dates) => { setBusy(true); setActionError(''); try { await api.post(`/applications/${encodeURIComponent(String(bookingTarget.id))}/book`, dates); setBookingTarget(null); setActionMessage('Booking confirmed.'); reload() } catch (err) { setActionError(errorMessage(err)) } finally { setBusy(false) } }} />}</Modal>
    <Modal open={Boolean(bookingDetails) && !bookingAction} title="Booking details" onClose={() => setBookingDetails(null)}>{bookingDetails && <div className="mt-5 space-y-3"><p><b>Reference:</b> {String(bookingDetails.reference || bookingDetails.id)}</p><p><b>Property:</b> {String(bookingDetails.property?.name || '—')}</p><p><b>Room:</b> {String(bookingDetails.room?.number || '—')}</p><p><b>Period:</b> {fmtDate(bookingDetails.startDate)} – {fmtDate(bookingDetails.endDate)}</p><p><b>Status:</b> {label(bookingDetails.status)}</p><div className="flex flex-wrap gap-2 pt-3"><Button className="btn-outline" onClick={() => setBookingAction('issue')}>Report an issue</Button>{!bookingDetails.review && !bookingDetails.reviewed && !bookingDetails.reviewedAt && <Button className="btn-gold" onClick={() => setBookingAction('review')}>Write review</Button>}</div></div>}</Modal>
    <Modal open={Boolean(bookingDetails) && Boolean(bookingAction)} title={bookingAction === 'issue' ? 'Report an issue' : 'Write a review'} onClose={() => setBookingAction(null)}><form className="mt-5 grid gap-4" onSubmit={submitBookingAction}>{bookingAction === 'issue' ? <Field name="message" required textarea /> : <><Field name="overallRating" required type="number" min="1" max="5" /><Field name="cleanlinessRating" required type="number" min="1" max="5" /><Field name="safetyRating" required type="number" min="1" max="5" /><Field name="facilitiesRating" required type="number" min="1" max="5" /><Field name="managementRating" required type="number" min="1" max="5" /><Field name="comment" textarea /></>}<div className="flex justify-end gap-2"><Button type="button" className="btn-outline" onClick={() => setBookingAction(null)}>Back</Button><Button className="btn-gold" disabled={bookingBusy}>{bookingBusy ? 'Submitting…' : 'Submit'}</Button></div></form></Modal>
    <Modal open={formOpen} title={config.kind === 'rooms' ? `Add room${roomProperty ? ` — ${displayName(roomProperty)}` : ''}` : config.kind === 'users' ? 'Create university admin' : 'Add university'} onClose={() => { setFormOpen(false); setRoomProperty(null) }}><form className="mt-5 grid gap-4" onSubmit={submitForm}>{config.kind === 'rooms' ? <><Field name="number" required /><Field name="type" required select options={['SINGLE', 'SHARED']} /><Field name="price" type="number" required /><Field name="occupancyLimit" type="number" required /></> : config.kind === 'users' ? <><Field name="firstName" required /><Field name="lastName" required /><Field name="email" type="email" required /><Field name="phone" type="tel" required /><Field name="password" type="password" required /></> : <><Field name="name" required /><Field name="code" /><Field name="city" /></>}<div className="flex justify-end gap-3"><Button type="button" className="btn-outline" onClick={() => setFormOpen(false)}>Cancel</Button><Button disabled={busy} className="btn-gold">{busy ? 'Saving…' : 'Save'}</Button></div></form></Modal>
  </Page>
}
function itemActiveTitle(item: Entity) { return item.isActive === false ? 'Activate user?' : 'Deactivate user?' }
function actionText(action: string, item: Entity) { if (action === 'cancel') return 'This application will be withdrawn.'; if (action === 'remove-favourite') return 'This property will be removed from your saved list.'; if (action === 'toggle-user') return item.isActive === false ? 'The user will regain access to the platform.' : 'The user will no longer be able to sign in.'; if (action.startsWith('reject')) return 'The item will be declined. Add a reason so the affected person understands the decision.'; return 'This change will be sent to the server and may affect access or availability.' }

function ResourceTable({ config, items, currentUserId, onAction, onRooms, onEdit, onRoomStatus, onConfirmBooking, onBookingDetails }: { config: ResourceConfig; items: Entity[]; currentUserId?: string; onAction: (item: Entity, action: string) => void; onRooms: (item: Entity) => void; onEdit: (item: Entity) => void; onRoomStatus: (room: Entity, status: string) => void; onConfirmBooking: (application: Entity) => void; onBookingDetails: (booking: Entity) => void }) {
  const kind = config.kind
  function actions(item: Entity) {
    const buttons: Array<[string, string, string?]> = []
    const status = String(item.verificationStatus || item.status || '').toUpperCase()
    if (kind === 'student-applications' && ['SUBMITTED', 'UNDER_REVIEW'].includes(status)) buttons.push(['Cancel', 'cancel'])
    if (kind === 'provider-applications' && ['SUBMITTED', 'PENDING'].includes(status)) buttons.push(['Start review', 'start-review-application'])
    if (kind === 'provider-applications' && ['SUBMITTED', 'PENDING', 'UNDER_REVIEW'].includes(status)) buttons.push(['Approve', 'approve-application'], ['Reject', 'reject-application'])
    if (['verify-properties', 'all-properties'].includes(kind) && status === 'PENDING') buttons.push(['Start review', 'start-review-property'])
    if (['verify-properties', 'all-properties'].includes(kind) && ['PENDING', 'UNDER_REVIEW', 'REJECTED', 'SUSPENDED'].includes(status)) buttons.push([status === 'SUSPENDED' ? 'Reinstate' : 'Approve', 'approve-property'])
    if (['verify-properties', 'all-properties'].includes(kind) && ['PENDING', 'UNDER_REVIEW'].includes(status)) buttons.push(['Reject', 'reject-property'])
    if (['verify-properties', 'all-properties'].includes(kind) && status === 'APPROVED') buttons.push(['Suspend', 'suspend-property'])
    if (kind === 'providers' && status === 'PENDING') buttons.push(['Start review', 'review-provider'])
    if (kind === 'providers' && ['PENDING', 'UNDER_REVIEW', 'REJECTED', 'SUSPENDED'].includes(status)) buttons.push([status === 'SUSPENDED' ? 'Reinstate' : 'Approve', 'verify-provider'])
    if (kind === 'providers' && ['PENDING', 'UNDER_REVIEW'].includes(status)) buttons.push(['Reject', 'reject-provider'])
    if (kind === 'providers' && status === 'APPROVED') buttons.push(['Suspend', 'suspend-provider'])
    if (kind === 'complaints' && !/RESOLVED|CLOSED/.test(status)) buttons.push(['Mark resolved', 'resolve-complaint'])
    if (kind === 'users') buttons.push([item.isActive === false ? 'Activate' : 'Deactivate', 'toggle-user'])
    if (kind === 'roles' && String(item.id) !== currentUserId) buttons.push(['Change role', 'change-role'])
    if (kind === 'reviews') buttons.push(['Delete', 'delete-review'])
    return buttons
  }
  return <div className="overflow-x-auto rounded-2xl border bg-white"><table className="w-full"><thead><tr><th>Name / reference</th><th>Details</th><th>Status</th><th>Updated</th><th>Actions</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}>
    <td className="font-bold">{kind === 'settings' ? label(displayName(item)) : displayName(item)}</td><td>{String(item.property?.name || item.university?.name || item.studentNumber || item.email || item.action || item.description || item.value || item.room?.number || '—')}{['provider-properties', 'all-properties', 'verify-properties'].includes(kind) && <div className="mt-1 space-y-1 text-xs text-slate-500"><p>{item.roomsCount ?? item.roomCount ?? item.rooms?.length ?? 0} rooms · {item.isPublished ? 'Published' : 'Not published'}</p>{(item.capacity ?? item.maxCapacity) != null && <p>Capacity: {String(item.capacity ?? item.maxCapacity)} students</p>}</div>}{item.rejectionReason && <p className="mt-1 text-xs text-red-700">{String(item.rejectionReason)}</p>}{kind === 'rooms' && item.rooms?.map((room: Entity) => <div key={room.id} className="mt-2 flex items-center gap-2"><span className="text-xs">{String(room.number || room.roomNumber)} · {String(room.type || room.roomType)}</span><select aria-label={`Availability for room ${room.number || room.roomNumber}`} className="input min-h-9 w-auto py-1 text-xs" value={String(room.status || room.availability || 'UNAVAILABLE')} onChange={(e) => onRoomStatus(room, e.target.value)}>{['AVAILABLE', 'RESERVED', 'OCCUPIED', 'UNAVAILABLE'].map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></div>)}</td><td><StatusBadge status={['verification', 'provider-properties', 'verify-properties', 'providers', 'all-properties'].includes(kind) ? item.verificationStatus || entityStatus(item) : entityStatus(item)} /></td><td>{fmtDate(item.updatedAt || item.createdAt || item.at)}</td><td><div className="flex flex-wrap gap-2">
      {item.documentId && <button className="text-link" onClick={() => void openDocument(String(item.documentId))}><Download size={16} /> Document</button>}
      {Array.isArray(item.documents) && item.documents.map((document: Entity) => <button key={document.id} className="text-link" onClick={() => void openDocument(String(document.id))}><Download size={16} /> {String(document.name || 'Document')}</button>)}
      {['provider-properties', 'verification', 'rooms', 'all-properties', 'verify-properties'].includes(kind) && <Link className="text-link" to={`/dashboard/properties/${item.id}`}><Eye size={16} /> Details</Link>}
      {['provider-properties', 'rooms'].includes(kind) && <button className="text-link" onClick={() => onEdit(item)}><Pencil size={16} /> Edit</button>}
      {kind === 'rooms' && <button className="text-link" onClick={() => onRooms(item)}><BedDouble size={16} /> Add room</button>}
      {kind === 'universities' && <Link className="text-link" to={`/dashboard/universities/${item.id}`}><Eye size={16} /> Details</Link>}
      {kind === 'student-applications' && <Link className="text-link" to={`/dashboard/applications/${item.id}`}><Eye size={16} /> Details</Link>}
      {kind === 'student-applications' && String(item.status).toUpperCase() === 'APPROVED' && <button className="text-link" onClick={() => onConfirmBooking(item)}>Confirm booking</button>}
      {kind === 'student-bookings' && <button className="text-link" onClick={() => onBookingDetails(item)}><Eye size={16} /> Details</button>}
      {actions(item).map(([text, action]) => <button key={action} className={`text-sm font-bold ${/Reject|Suspend|Delete|Cancel|Deactivate|Close/.test(text) ? 'text-red-700' : 'text-navy'}`} onClick={() => onAction(item, action)}>{text}</button>)}
    </div></td>
  </tr>)}</tbody></table></div>
}
function ReportData({ data }: { data: any }) { const report = data?.report || data?.data || data; if (Array.isArray(report)) return <ResourceTable config={{ title: '', text: '', endpoint: '', key: '', kind: 'reports' }} items={report} onAction={() => undefined} onRooms={() => undefined} onEdit={() => undefined} onRoomStatus={() => undefined} onConfirmBooking={() => undefined} onBookingDetails={() => undefined} />; return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Object.entries(report || {}).map(([key, value]) => <div className="card" key={key}><p className="text-sm font-semibold text-slate-500">{label(key)}</p><p className="mt-3 break-words text-2xl font-black text-navy">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</p></div>)}</div> }
function ReasonForm({ label: fieldLabel, select, busy, onCancel, onSubmit }: { label: string; select?: boolean; busy: boolean; onCancel: () => void; onSubmit: (value: string) => void }) { const [value, setValue] = useState(''); return <form className="mt-5 grid gap-4" onSubmit={(e) => { e.preventDefault(); onSubmit(value) }}><label className="label">{fieldLabel}{select ? <select required className="input mt-2" value={value} onChange={(e) => setValue(e.target.value)}><option value="">Select role</option>{['STUDENT', 'PROVIDER', 'UNIVERSITY_ADMIN', 'SYSTEM_ADMIN'].map((r) => <option key={r}>{r}</option>)}</select> : <textarea required className="input mt-2 min-h-28" value={value} onChange={(e) => setValue(e.target.value)} />}</label><div className="flex justify-end gap-3"><Button type="button" className="btn-outline" onClick={onCancel}>Cancel</Button><Button className="btn-gold" disabled={busy}>{busy ? 'Working…' : 'Submit'}</Button></div></form> }
function BookingForm({ busy, onSubmit }: { busy: boolean; onSubmit: (dates: { startDate: string; endDate: string }) => void }) {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  return <form className="mt-5 grid gap-4" onSubmit={(e) => { e.preventDefault(); onSubmit({ startDate, endDate }) }}>
    <Field name="startDate" type="date" required />
    <Field name="endDate" type="date" required />
    <div className="flex justify-end"><Button className="btn-gold" disabled={busy}>{busy ? 'Confirming…' : 'Confirm booking'}</Button></div>
  </form>
}
function Field({ name, required, type = 'text', select, options, textarea, min, max }: { name: string; required?: boolean; type?: string; select?: boolean; options?: string[]; textarea?: boolean; min?: string; max?: string }) { const title = label(name.replace(/([A-Z])/g, '_$1')); return <label className="label">{title}{select ? <select name={name} required={required} className="input mt-2">{options?.map((option) => <option key={option} value={option}>{label(option)}</option>)}</select> : textarea ? <textarea name={name} required={required} className="input mt-2 min-h-28" /> : <input name={name} type={type} required={required} min={min} max={max} className="input mt-2" />}</label> }

export function PropertyForm() {
  const { id } = useParams()
  const edit = Boolean(id)
  const { user } = useAuth()
  const propertyApi = user?.role === 'SYSTEM_ADMIN' ? '/admin/properties' : '/provider/properties'
  const systemAdmin = user?.role === 'SYSTEM_ADMIN'
  const { data, loading, error, reload } = useFetch<any>(id ? `${propertyApi}/${id}` : null)
  const { data: universityData } = useFetch<{ universities: Array<{ id: string; name: string; campuses?: Array<{ id: string; name: string }> }> }>('/universities')
  const property: Entity | undefined = data?.property || data?.data || data
  const [status, setStatus] = useState('')
  async function submit(e: FormEvent<HTMLFormElement>) { e.preventDefault(); setStatus('Saving…'); try { const form = new FormData(e.currentTarget); if (edit) await api.put(`${propertyApi}/${id}`, form); else await api.post(propertyApi, form); setStatus(edit ? 'Property updated.' : systemAdmin ? 'Property created.' : 'Property submitted for verification. It will remain hidden until approved.') } catch (err) { setStatus(errorMessage(err)) } }
  if (loading) return <Loader />
  if (error) return <ErrorBox message={error} retry={reload} />
  return <Page title={edit ? 'Edit property' : 'Add property'} text={edit ? 'Update listing information and resubmit changes for review when needed.' : systemAdmin ? 'Create a property listing and assign it to a university campus.' : 'New properties stay hidden until a university administrator approves them.'} action={edit && !systemAdmin ? <Link className="btn btn-outline" to={`/dashboard/rooms?propertyId=${encodeURIComponent(String(id))}`}>Manage rooms</Link> : undefined}><form className="card grid gap-4 sm:grid-cols-2" onSubmit={submit}>
    {edit && <div className="sm:col-span-2 flex flex-wrap items-center gap-3"><StatusBadge status={property?.verificationStatus || property?.status} />{property?.rejectionReason && <p className="text-sm text-red-700">Feedback: {String(property.rejectionReason)}</p>}</div>}
    {['name', 'address', 'suburb', 'city', 'contactEmail', 'contactPhone'].map((n) => <label className="label" key={n}>{label(n.replace(/([A-Z])/g, '_$1'))}<input required className="input mt-2" name={n} defaultValue={String(property?.[n] || '')} /></label>)}
    <label className="label">Capacity (students)<input required className="input mt-2" type="number" min="1" step="1" name="capacity" defaultValue={String(property?.capacity ?? property?.maxCapacity ?? '')} /></label>
    <label className="label sm:col-span-2">Virtual tour URL (optional)<input className="input mt-2" type="url" name="virtualTourUrl" placeholder="https://…" defaultValue={String(property?.virtualTourUrl || '')} /></label>
    <label className="label sm:col-span-2">Campus<select required className="input mt-2" name="campusId" defaultValue={String(property?.campusId || property?.campus?.id || '')}><option value="">Select a campus</option>{(universityData?.universities || []).map((university) => <optgroup key={university.id} label={university.name}>{university.campuses?.map((campus) => <option key={campus.id} value={campus.id}>{campus.name}</option>)}</optgroup>)}</select></label>
    <label className="label sm:col-span-2">Description<textarea required className="input mt-2 min-h-28" name="description" defaultValue={String(property?.description || '')} /></label>
    <label className="label sm:col-span-2">Facilities<input className="input mt-2" name="facilities" defaultValue={Array.isArray(property?.facilities) ? property.facilities.join(', ') : String(property?.facilities || '')} placeholder="Separate facilities with commas" /></label>
    <div className="sm:col-span-2 rounded-xl border border-slate-200 p-4"><h2 className="font-bold">Safety, inspections & accreditation</h2><p className="mt-1 text-sm text-slate-500">Enter current evidence details; uploaded documents are still required for production verification.</p><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="label flex items-center gap-3"><input type="checkbox" name="fireSafetyCompliant" value="true" defaultChecked={Boolean(property?.fireSafetyCompliant)} /> Fire safety evidence available</label><label className="label">Fire certificate expires<input className="input mt-2" type="date" name="fireCertificateExpiresAt" defaultValue={String(property?.safetyCertificates?.find((certificate: { type: string; expiresAt?: string }) => certificate.type === 'Fire compliance')?.expiresAt || '')} /></label><label className="label flex items-center gap-3"><input type="checkbox" name="electricalSafetyCompliant" value="true" defaultChecked={Boolean(property?.electricalSafetyCompliant)} /> Electrical certificate available</label><label className="label">Electrical certificate expires<input className="input mt-2" type="date" name="electricalCertificateExpiresAt" defaultValue={String(property?.safetyCertificates?.find((certificate: { type: string; expiresAt?: string }) => certificate.type === 'Electrical certificate')?.expiresAt || '')} /></label><label className="label flex items-center gap-3"><input type="checkbox" name="nsfasAccredited" value="true" defaultChecked={property?.accreditation?.status === 'ACCREDITED' || Boolean(property?.nsfasAccredited)} /> NSFAS accredited</label><label className="label">Accreditation expires<input className="input mt-2" type="date" name="accreditationExpiresAt" defaultValue={String(property?.accreditation?.expiresAt || '')} /></label><label className="label">Last inspection date<input className="input mt-2" type="date" name="lastInspectionAt" defaultValue={String(property?.inspectionReports?.[0]?.inspectedAt || '')} /></label><label className="label">Re-verification due<input className="input mt-2" type="date" name="reverificationDueAt" defaultValue={String(property?.reverificationDueAt || '')} /></label></div></div>
    <label className="label">Monthly price<input className="input mt-2" type="number" min="0" name="price" defaultValue={String(property?.price || '')} /></label>
    <label className="label flex items-center gap-3"><input type="checkbox" name="furnished" value="true" defaultChecked={Boolean(property?.furnished)} /> Furnished</label>
    <label className="label">Photographs<input multiple accept=".jpg,.jpeg,.png" type="file" className="input mt-2" name="photos" /></label><label className="label">Verification documents<input required={!edit && !systemAdmin} multiple accept=".pdf,.jpg,.jpeg,.png" type="file" className="input mt-2" name="documents" /></label>
    {status && <p className="sm:col-span-2" role="status">{status}</p>}<Button className="btn-gold sm:col-span-2 sm:w-fit"><Save size={18} /> {edit && ['REJECTED', 'SUSPENDED'].includes(String(property?.verificationStatus || property?.status).toUpperCase()) ? 'Update & resubmit' : edit ? 'Save changes' : systemAdmin ? 'Create property' : 'Submit for verification'}</Button>
  </form></Page>
}

export function ResourceDetail() {
  const { id } = useParams(); const { pathname } = useLocation(); const { user } = useAuth()
  const [campusStatus, setCampusStatus] = useState('')
  const [verifyAction, setVerifyAction] = useState('')
  const [verifyReason, setVerifyReason] = useState('')
  const [verifyBusy, setVerifyBusy] = useState(false)
  const [verifyError, setVerifyError] = useState('')
  const propertyPath = pathname.includes('properties')
  const universityPath = pathname.includes('universities')
  const applicationPath = pathname.includes('applications')
  const endpoint = propertyPath ? `${user?.role === 'PROVIDER' ? '/provider' : '/admin'}/properties/${id}` : universityPath ? '/universities' : applicationPath && user?.role === 'STUDENT' ? `/applications/${id}` : `${user?.role === 'PROVIDER' ? '/provider' : '/admin'}/applications/${id}`
  const { data, loading, error, reload } = useFetch<any>(endpoint)
  const universityList = universityPath ? collection(data, 'universities') : []
  const entity = universityPath ? universityList.find((university) => String(university.id) === id) : data?.property || data?.application || data?.university || data?.data || data
  const verificationStatus = String(entity?.verificationStatus || entity?.status || '').toUpperCase()
  async function updateVerification(status: string, reason?: string) {
    setVerifyBusy(true)
    setVerifyError('')
    try {
      await api.patch(`/admin/properties/${encodeURIComponent(String(id))}`, { status, ...(reason ? { reason } : {}) })
      setVerifyAction('')
      setVerifyReason('')
      reload()
    } catch (err) {
      setVerifyError(errorMessage(err))
    } finally {
      setVerifyBusy(false)
    }
  }
  async function addCampus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    try {
      await api.post(`/system/universities/${encodeURIComponent(String(id))}/campuses`, Object.fromEntries(new FormData(form)))
      form.reset()
      setCampusStatus('Campus added.')
      reload()
    } catch (err) {
      setCampusStatus(errorMessage(err))
    }
  }
  return <Page title={propertyPath ? String(entity?.name || 'Property details') : universityPath ? String(entity?.name || 'University details') : 'Application review'} text="Review the complete record and its current status.">
    {verifyError && <ErrorBox message={verifyError} />}
    {loading ? <Loader /> : error ? <ErrorBox message={error} retry={reload} /> : !entity ? <EmptyState /> : <div className="card max-w-4xl"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-2xl font-black">{displayName(entity)}</h2><p className="mt-2 text-slate-600">{String(entity.address || entity.email || entity.description || 'Details')}</p></div><StatusBadge status={entity.verificationStatus || entity.status} /></div>
      {propertyPath && entity.images?.length > 0 && <div className="mt-5 grid gap-3 sm:grid-cols-2">{entity.images.map((image: string | { id?: string; url?: string }, index: number) => { const src = typeof image === 'string' ? image : image.url; return src ? <img key={typeof image === 'string' ? `${src}-${index}` : image.id || src} src={src} alt={`${displayName(entity)} photo ${index + 1}`} className="h-52 w-full rounded-xl object-cover" /> : null })}</div>}
      <dl className="mt-6 grid gap-4 border-t pt-5 sm:grid-cols-2">{Object.entries(entity).filter(([key, value]) => !['id', 'images', 'rooms', 'reviews', 'documents'].includes(key) && value !== null && typeof value !== 'object').map(([key, value]) => <div key={key}><dt className="text-sm text-slate-500">{label(key)}</dt><dd className="mt-1 font-semibold">{key.toLowerCase().includes('price') ? fmtMoney(value) : String(value)}</dd></div>)}</dl>
      {Array.isArray(entity.documents) && <section className="mt-6 border-t pt-5"><h3 className="text-lg font-bold">Documents</h3><div className="mt-3 flex flex-wrap gap-3">{entity.documents.map((document: Entity) => <button key={document.id} className="text-link" onClick={() => void openDocument(String(document.id))}><Download size={16} /> {String(document.name || 'Open document')}</button>)}</div></section>}
      {propertyPath && ['UNIVERSITY_ADMIN', 'SYSTEM_ADMIN'].includes(user?.role || '') && <section className="mt-6 border-t pt-5"><h3 className="text-lg font-bold">Verification actions</h3><div className="mt-3 flex flex-wrap gap-2">{verificationStatus === 'PENDING' && <Button className="btn-outline" onClick={() => void updateVerification('UNDER_REVIEW')}>Start review</Button>}{['PENDING', 'UNDER_REVIEW', 'REJECTED', 'SUSPENDED'].includes(verificationStatus) && <Button className="btn-gold" onClick={() => void updateVerification('APPROVED')}>{verificationStatus === 'SUSPENDED' ? 'Reinstate' : 'Approve'}</Button>}{['PENDING', 'UNDER_REVIEW'].includes(verificationStatus) && <Button className="bg-red-700 text-white" onClick={() => { setVerifyReason(''); setVerifyAction('REJECTED') }}>Reject</Button>}{verificationStatus === 'APPROVED' && <Button className="bg-red-700 text-white" onClick={() => { setVerifyReason(''); setVerifyAction('SUSPENDED') }}>Suspend</Button>}</div></section>}
      {propertyPath && user?.role === 'PROVIDER' && <div className="mt-6"><h3 className="text-lg font-bold">Rooms</h3>{entity.rooms?.length ? <ul className="mt-3 divide-y">{entity.rooms.map((room: Entity) => <li className="flex justify-between py-3" key={room.id}><span>{String(room.roomNumber || room.number || room.name || 'Room')} · {String(room.roomType || room.type || '')}</span><StatusBadge status={room.availability || room.status} /></li>)}</ul> : <EmptyState title="No rooms listed" text="Manage room inventory from the Rooms page." />}<Link className="btn btn-gold mt-4" to={`/dashboard/rooms?propertyId=${encodeURIComponent(String(id))}`}>Manage rooms</Link></div>}
      {universityPath && user?.role === 'SYSTEM_ADMIN' && <section className="mt-7 border-t pt-5"><h3 className="text-lg font-bold">Campuses</h3>{entity.campuses?.length ? <ul className="mt-3 list-disc space-y-1 pl-5">{entity.campuses.map((campus: Entity) => <li key={campus.id}>{String(campus.name)}</li>)}</ul> : <EmptyState title="No campuses listed" />}<form className="mt-5 grid max-w-xl gap-3 sm:grid-cols-2" onSubmit={addCampus}><Field name="name" required /><Field name="city" /><Field name="province" /><Button className="btn-gold sm:col-span-2 sm:w-fit">Add campus</Button></form>{campusStatus && <p className="mt-3 text-sm" role="status">{campusStatus}</p>}</section>}
    </div>}
    <Modal open={Boolean(verifyAction)} title={verifyAction === 'REJECTED' ? 'Reject property' : 'Suspend property'} onClose={() => setVerifyAction('')}><form className="mt-5 grid gap-4" onSubmit={(event) => { event.preventDefault(); void updateVerification(verifyAction, verifyReason) }}><label className="label">Reason<textarea required className="input mt-2 min-h-28" value={verifyReason} onChange={(event) => setVerifyReason(event.target.value)} /></label><div className="flex justify-end gap-2"><Button type="button" className="btn-outline" onClick={() => setVerifyAction('')}>Cancel</Button><Button className="btn-gold" disabled={verifyBusy}>{verifyBusy ? 'Saving…' : 'Submit'}</Button></div></form></Modal>
  </Page>
}
export function Browse() { return <div className="-m-4 sm:-m-8"><Accommodation /></div> }
function Page({ title, text, action, children }: { title: string; text: string; action?: ReactNode; children: ReactNode }) { return <><div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-black text-navy">{title}</h1><p className="mt-2 text-slate-600">{text}</p></div>{action}</div>{children}</> }
