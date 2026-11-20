import { useEffect, useState, type FormEvent } from 'react'
import { ArrowRight, ArrowUpRight, Bookmark, Building, CheckCircle2, FileCheck2, GitCompareArrows, HeartHandshake, HomeIcon, MapPin, Search, ShieldCheck, Sparkles, Users } from 'lucide-react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { PropertyCard } from '../../components/marketplace/Property'
import { Button, EmptyState, ErrorBox, Loader, Modal, StatusBadge } from '../../components/common/Common'
import { useFetch } from '../../hooks/useFetch'
import { api, errorMessage } from '../../services/api'
import { useAuth } from '../../hooks/useAuth'
import type { Entity, Property } from '../../types'
import { fmtMoney, label } from '../../utils/format'

type PropertyResponse = { properties: Property[] }
export function Home() {
  const { data, loading, error, reload } = useFetch<PropertyResponse>('/properties', { limit: 3 })
  return (
    <>
      <section className="relative isolate overflow-hidden bg-navy pb-16 pt-28 sm:pb-20 sm:pt-32 lg:pb-24 lg:pt-36">
        <video
          className="absolute inset-0 -z-20 size-full object-cover"
          src="/hero.mp4"
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          aria-hidden="true"
        />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-navy/90 via-navy/75 to-navy/50" />
        <div aria-hidden="true" className="absolute -left-28 top-36 -z-10 size-72 rounded-full border border-white/15 sm:size-96" />
        <div aria-hidden="true" className="absolute -left-16 top-48 -z-10 size-56 rounded-full border border-gold/25 sm:size-72" />
        <div className="container relative">
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-2 text-xs font-bold uppercase tracking-[.16em] text-white backdrop-blur-md">
              <Sparkles size={15} className="text-gold" /> Student living, made simpler
            </div>
            <h1 className="mt-6 text-[2.8rem] font-black leading-[.98] tracking-[-.06em] text-white sm:text-6xl lg:text-[3.75rem]">
              A place to land.<br />
              <span className="font-serif font-medium italic text-gold">A future to build.</span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-white/85 sm:text-lg">
              Find a home close to campus, apply with confidence, and keep every part of your stay in one place.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link className="btn btn-navy rounded-full px-6" to="/register/student">
                Find your next home <ArrowRight size={18} />
              </Link>
              <Link className="btn rounded-full border border-white/50 bg-white/10 px-6 text-white backdrop-blur-sm hover:bg-white/20" to="/register/provider">
                List a property <ArrowUpRight size={18} />
              </Link>
            </div>
            <div className="mt-9 flex items-center gap-3 text-sm text-white/80">
              <span className="grid size-9 place-items-center rounded-full border border-white/20 bg-white/10 text-gold"><MapPin size={17} /></span>
              <span>Made for students across <strong className="text-white">TUT campuses</strong></span>
            </div>
          </div>
        </div>
        <div className="container relative mt-14 grid grid-cols-3 border-t border-white/25 pt-5 text-center sm:mt-20 sm:pt-7">
          <div>
            <p className="text-lg font-black text-white sm:text-2xl">Find</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[.14em] text-white/65 sm:text-xs">your place</p>
          </div>
          <div className="border-x border-white/25">
            <p className="text-lg font-black text-white sm:text-2xl">Apply</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[.14em] text-white/65 sm:text-xs">with confidence</p>
          </div>
          <div>
            <p className="text-lg font-black text-white sm:text-2xl">Settle</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[.14em] text-white/65 sm:text-xs">into student life</p>
          </div>
        </div>
      </section>
      <section className="section container">
        <div className="section-heading">
          <div><p className="eyebrow text-gold-dark">Verified accommodation</p><h2>Places students can trust</h2></div>
          <Link to="/accommodation" className="text-link">View all <ArrowRight size={18} /></Link>
        </div>
        {loading ? <Loader /> : error ? <ErrorBox message={error} retry={reload} /> : !(data?.properties?.length) ? (
          <EmptyState title="No featured properties yet" text="Approved accommodation will appear here as providers publish it." />
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{data.properties.map((p) => <PropertyCard key={p.id} property={p} />)}</div>
        )}
      </section>
      <section className="bg-mist">
        <div className="section container">
          <div className="mx-auto max-w-2xl text-center"><p className="eyebrow text-gold-dark">How it works</p><h2>From search to settled in four steps</h2></div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[[Search, 'Discover', 'Search verified homes near campus.'], [FileCheck2, 'Apply', 'Upload your documents securely.'], [CheckCircle2, 'Get approved', 'Track every update in real time.'], [HomeIcon, 'Move in', 'Confirm your booking and settle in.']].map(([Icon, title, text], i) => {
              const I = Icon as typeof Search
              return <div className="card" key={String(title)}><span className="step">{i + 1}</span><I className="mt-8 text-gold-dark" size={30} /><h3 className="mt-4 font-extrabold">{String(title)}</h3><p className="mt-2 text-sm text-slate-600">{String(text)}</p></div>
            })}
          </div>
        </div>
      </section>
      <section className="section container grid gap-8 lg:grid-cols-2">
        <Benefit icon={<ShieldCheck />} title="Built for students" items={['Verified properties and clear pricing', 'Secure application document handling', 'Bookings, reviews and support in one place']} />
        <Benefit icon={<Building />} title="Made for providers" items={['Reach students actively looking for homes', 'Manage rooms and applications efficiently', 'Build trust through verified listings']} />
      </section>
      <section className="container pb-20">
        <div className="rounded-3xl bg-navy p-8 text-center text-white sm:p-14">
          <h2 className="text-3xl font-black">Your next chapter starts with the right place.</h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-300">Join Student Living and move forward with confidence.</p>
          <Link className="btn btn-gold mt-7" to="/accommodation">Find accommodation</Link>
        </div>
      </section>
    </>
  )
}
function Benefit({ icon, title, items }: { icon: React.ReactNode; title: string; items: string[] }) { return <div className="card flex gap-5"><div className="grid size-12 shrink-0 place-items-center rounded-xl bg-gold/20 text-gold-dark">{icon}</div><div><h2 className="text-2xl font-black">{title}</h2><ul className="mt-4 space-y-3">{items.map((x) => <li className="flex gap-2 text-slate-600" key={x}><CheckCircle2 className="shrink-0 text-emerald-600" size={20} />{x}</li>)}</ul></div></div> }
export function Accommodation() {
  const [params, setParams] = useSearchParams()
  const { pathname } = useLocation()
  const { user } = useAuth()
  const [favouriteIds, setFavouriteIds] = useState<Set<string>>(new Set())
  const [favouriteError, setFavouriteError] = useState('')
  const [savedSearchName, setSavedSearchName] = useState('')
  const [savedSearchMessage, setSavedSearchMessage] = useState('')
  const [compareProperties, setCompareProperties] = useState<Property[]>([])
  const [compareOpen, setCompareOpen] = useState(false)
  const { data: universityData } = useFetch<{ universities: Array<{ id: string; name: string; campuses?: Array<{ id: string; name: string }> }> }>('/universities')
  const { data: favouritesData, reload: reloadFavourites } = useFetch<{ favourites?: Property[]; properties?: Property[] }>(user?.role === 'STUDENT' ? '/favourites' : null)
  const tut = universityData?.universities?.find((university) => /tshwane|\btut\b/i.test(university.name))
  const tutId = tut?.id
  const tutName = tut?.name
  const campusGroups = [
    ['Gauteng', ['Pretoria Campus (Pretoria West)', 'Arcadia Campus (Pretoria)', 'Arts Campus (Pretoria)', 'Ga-Rankuwa Campus', 'Soshanguve North Campus', 'Soshanguve South Campus']],
    ['Mpumalanga', ['eMalahleni Campus', 'Mbombela Campus']],
    ['Limpopo', ['Polokwane Campus', 'Giyani Campus']],
  ] as const
  const tutCampusNames = campusGroups
  useEffect(() => {
    const saved = favouritesData?.favourites || favouritesData?.properties || []
    setFavouriteIds(new Set(saved.map((property) => property.id)))
  }, [favouritesData])
  const defaultCampus = tutCampusNames[0][1][0]
  const campusOptions = tutCampusNames.flatMap(([, campuses]) => campuses)
  const selectedCampus = campusOptions.find((campus) => campus === params.get('campus')) || defaultCampus
  useEffect(() => {
    const next = new URLSearchParams(params)
    next.delete('search')
    next.delete('maxPrice')
    next.delete('furnished')
    if (next.get('campus') !== selectedCampus) {
      next.set('campus', selectedCampus)
    }
    if (next.toString() !== params.toString()) {
      setParams(next, { replace: true })
    }
  }, [params, selectedCampus, setParams])
  const query = Object.fromEntries(params.entries())
  delete query.search
  delete query.maxPrice
  delete query.furnished
  if (tutId) query.universityId = tutId
  if (selectedCampus) query.campus = selectedCampus
  const { data, loading, error, reload } = useFetch<PropertyResponse>('/properties', query)
  async function favourite(id: string) {
    setFavouriteError('')
    try {
      if (favouriteIds.has(id)) await api.delete(`/favourites/${encodeURIComponent(id)}`)
      else await api.post('/favourites', { propertyId: id })
      setFavouriteIds((saved) => {
        const next = new Set(saved)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
      await reloadFavourites()
    } catch (err) {
      setFavouriteError(errorMessage(err))
    }
  }
  async function saveSearch() {
    if (user?.role !== 'STUDENT') return
    setSavedSearchMessage('')
    try {
      await api.post('/saved-searches', { name: savedSearchName.trim() || `${selectedCampus} accommodation`, filters: query })
      setSavedSearchName('')
      setSavedSearchMessage('Search saved. We’ll alert you when a matching home is listed.')
    } catch (err) {
      setSavedSearchMessage(errorMessage(err))
    }
  }
  function toggleCompare(property: Property) {
    setCompareProperties((selected) => {
      if (selected.some((item) => item.id === property.id)) return selected.filter((item) => item.id !== property.id)
      return selected.length < 3 ? [...selected, property] : selected
    })
  }
  return <div className="bg-mist"><div className="container py-12"><p className="eyebrow text-gold-dark">Find your place</p><h1 className="mt-3 text-4xl font-black">Accommodation marketplace</h1><div className="mt-8 grid items-start gap-7 lg:grid-cols-[280px_1fr]"><aside className="card lg:sticky lg:top-24"><div className="flex items-center justify-between"><h2 className="text-lg font-bold">Filters</h2><button className="text-sm font-bold text-gold-dark" onClick={() => setParams({ campus: defaultCampus })}>Reset</button></div><div className="mt-5 rounded-xl bg-gold/15 p-3"><p className="text-xs font-bold uppercase tracking-wide text-gold-dark">University</p><p className="mt-1 text-sm font-extrabold text-navy">{tutName || 'Tshwane University of Technology'}</p></div><label className="label mt-5">Campus<select className="input mt-2" value={selectedCampus} onChange={(e) => updateParam(params, setParams, 'campus', e.target.value)}>{tutCampusNames.map(([province, campusNames]) => <optgroup key={province} label={province}>{campusNames.map((campus) => <option key={campus} value={campus}>{campus}</option>)}</optgroup>)}</select></label><Filter label="Room type" name="type" params={params} setParams={setParams} select options={['','SINGLE','SHARED']} /><label className="mt-5 flex items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={params.get('available') === 'true'} onChange={(e) => updateParam(params,setParams,'available',e.target.checked ? 'true' : '')} /> Only available rooms</label><a className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-navy underline decoration-gold decoration-2 underline-offset-4" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedCampus)}`} target="_blank" rel="noopener noreferrer"><MapPin size={17} /> Open campus in Google Maps</a>{user?.role === 'STUDENT' && <div className="mt-6 border-t border-slate-200 pt-5"><label className="label">Save this search<input className="input mt-2" value={savedSearchName} onChange={(event) => setSavedSearchName(event.target.value)} placeholder={`${selectedCampus} accommodation`} /></label><Button className="btn-navy mt-3 w-full" onClick={() => void saveSearch()}><Bookmark size={16} /> Save search & alert</Button>{savedSearchMessage && <p className="mt-3 text-xs text-slate-600" role="status">{savedSearchMessage}</p>}</div>}</aside><main>{favouriteError && <ErrorBox message={favouriteError} />}<div className="mb-5 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-slate-600">{data?.properties?.length || 0} places found</p>{compareProperties.length > 0 && <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2"><span className="text-xs font-semibold text-slate-600">{compareProperties.length}/3 selected</span><Button className="btn-gold min-h-9 px-4 py-1 text-xs" disabled={compareProperties.length < 2} onClick={() => setCompareOpen(true)}><GitCompareArrows size={15} /> Compare homes</Button><button className="text-xs font-bold text-slate-500" onClick={() => setCompareProperties([])}>Clear</button></div>}</div>{loading ? <Loader /> : error ? <ErrorBox message={error} retry={reload} /> : !(data?.properties?.length) ? <EmptyState title="No accommodation matches" text="Try broadening your filters." /> : <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">{data.properties.map((p) => <PropertyCard key={p.id} property={p} detailsPath={pathname.startsWith('/dashboard/') ? `/dashboard/property/${p.id}` : undefined} favourite={favouriteIds.has(p.id)} onFavourite={user?.role === 'STUDENT' ? () => void favourite(p.id) : undefined} comparing={compareProperties.some((item) => item.id === p.id)} onCompare={() => toggleCompare(p)} />)}</div>}</main></div></div><Modal open={compareOpen} onClose={() => setCompareOpen(false)} title="Compare accommodation"><div className="mt-5 overflow-x-auto"><table><thead><tr><th>Property</th>{compareProperties.map((property) => <th key={property.id}>{property.name}</th>)}</tr></thead><tbody>{[['Campus', (property: Property) => String(property.campus?.name || property.campusName || '—')], ['Location', (property: Property) => [property.suburb, property.city].filter(Boolean).join(', ') || '—'], ['Monthly rent from', (property: Property) => fmtMoney(property.minPrice)], ['Capacity', (property: Property) => (property.capacity ?? property.maxCapacity) != null ? `${String(property.capacity ?? property.maxCapacity)} students` : 'Not specified'], ['Available rooms', (property: Property) => String(property.availableRooms ?? property.rooms?.filter((room) => room.status === 'AVAILABLE').length ?? '—')], ['Rating', (property: Property) => Number(property.avgRating || 0).toFixed(1)], ['Furnished', (property: Property) => property.furnished ? 'Yes' : 'No'], ['Facilities', (property: Property) => property.facilities?.join(', ') || 'Not specified']].map(([heading, value]) => <tr key={String(heading)}><th>{String(heading)}</th>{compareProperties.map((property) => <td key={property.id}>{(value as (property: Property) => string)(property)}</td>)}</tr>)}</tbody></table></div></Modal></div>
}
function updateParam(params: URLSearchParams, setParams: ReturnType<typeof useSearchParams>[1], name: string, value: string) { const next = new URLSearchParams(params); value ? next.set(name,value) : next.delete(name); setParams(next) }
function Filter({ label, name, type, params, setParams, select, options=[] }: any) { return <label className="label mt-5">{label}{select ? <select className="input mt-2" value={params.get(name)||''} onChange={(e) => updateParam(params,setParams,name,e.target.value)}>{options.map((x:string) => <option key={x} value={x}>{x ? x[0]+x.slice(1).toLowerCase() : 'Any'}</option>)}</select> : <input className="input mt-2" type={type} value={params.get(name)||''} onChange={(e) => updateParam(params,setParams,name,e.target.value)} />}</label> }
export function PropertyDetails() {
  const { id } = useParams()
  const { pathname } = useLocation()
  const inDashboard = pathname.startsWith('/dashboard/')
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data, loading, error, reload } = useFetch<{ property: Property }>(`/properties/${id}`)
  const [room, setRoom] = useState<Entity | null>(null)
  const [note, setNote] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [feedback, setFeedback] = useState('')
  async function apply(e: FormEvent) { e.preventDefault(); if (!file || !room) return setFeedback('Please attach a supporting document.'); const body = new FormData(); body.append('roomId',room.id); body.append('note',note); body.append('documents',file); try { await api.post('/applications',body); navigate('/dashboard/my-applications') } catch (err) { setFeedback(errorMessage(err)) } }
  if (loading) return <div className="container py-16"><Loader /></div>
  if (error || !data?.property) return <div className="container py-16"><ErrorBox message={error || 'Property not found.'} retry={reload} /></div>
  const p = data.property
  const propertyAddress = p.address || [p.suburb,p.city].filter(Boolean).join(', ')
  const tourUrl = typeof p.virtualTourUrl === 'string' && /^https:\/\//i.test(p.virtualTourUrl) ? p.virtualTourUrl : ''
  return <div className={`container py-12 ${inDashboard ? 'max-w-6xl' : ''}`}>{inDashboard && <Link className="mb-6 inline-flex min-h-10 items-center font-bold text-navy underline decoration-gold decoration-2 underline-offset-4" to="/dashboard/browse">Back to dashboard browse</Link>}<div className="grid gap-8 lg:grid-cols-[1.25fr_.75fr]"><div><div className="grid h-80 place-items-center overflow-hidden rounded-3xl bg-navy text-white">{typeof p.images?.[0] === 'string' ? <img src={p.images[0]} alt={p.name} className="h-full w-full object-cover" /> : <HomeIcon size={64} />}</div><div className="mt-8 flex items-center gap-3"><h1 className="text-3xl font-black">{p.name}</h1><StatusBadge status={p.verificationStatus || 'APPROVED'} /></div><p className="mt-3 text-slate-500">{propertyAddress}</p><a className="mt-2 inline-flex min-h-10 items-center gap-2 text-sm font-bold text-navy underline decoration-gold decoration-2 underline-offset-4" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(propertyAddress || p.name)}`} target="_blank" rel="noopener noreferrer"><MapPin size={16} /> View location in Google Maps</a>{tourUrl && <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-bold text-navy">Virtual tour</h2><p className="mt-1 text-sm text-slate-600">Explore this property online before arranging a viewing.</p><a className="btn btn-navy mt-4" href={tourUrl} target="_blank" rel="noopener noreferrer">Open virtual tour <ArrowUpRight size={17} /></a></section>}<p className="mt-6 leading-7 text-slate-600">{p.description || 'The provider has not added a description yet.'}</p><PropertyTrustPanel property={p} signedIn={Boolean(user)} /><h2 className="mt-9 text-xl font-black">Rooms</h2><div className="mt-4 overflow-x-auto rounded-2xl border bg-white"><table><thead><tr><th>Room</th><th>Type</th><th>Monthly rent</th><th>Status</th><th /></tr></thead><tbody>{p.rooms?.map((r) => <tr key={r.id}><td>{r.number}</td><td>{r.type}</td><td>{fmtMoney(r.price)}</td><td><StatusBadge status={r.status} /></td><td>{r.status === 'AVAILABLE' && (user?.role === 'STUDENT' ? <Button className="btn-navy" onClick={() => setRoom(r)}>Apply</Button> : !user ? <Link className="text-link" to="/login">Log in to apply</Link> : null)}</td></tr>)}</tbody></table></div></div><aside className="card h-fit"><h2 className="text-xl font-black">Property details</h2><div className="mt-5 space-y-4"><p><b>Capacity</b><br />{(p.capacity ?? p.maxCapacity) != null ? `${String(p.capacity ?? p.maxCapacity)} students` : 'Not specified'}</p><p><b>Available rooms</b><br />{p.availableRooms ?? p.rooms?.filter((r) => r.status === 'AVAILABLE').length ?? 0}</p><p><b>Facilities</b><br />{p.facilities?.join(' · ') || 'Contact the provider for facility details.'}</p><p><b>Contact</b><br />{String(p.contactEmail || p.contactPhone || 'Available after application')}</p></div></aside></div><Modal open={Boolean(room)} onClose={() => setRoom(null)} title={`Apply for room ${room?.number || ''}`}><form className="mt-5 space-y-4" onSubmit={apply}><label className="label">Optional note<textarea className="input mt-2 min-h-28" value={note} onChange={(e) => setNote(e.target.value)} /></label><label className="label">Supporting document<input required className="input mt-2" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setFile(e.target.files?.[0] || null)} /></label>{feedback && <p role="alert" className="text-sm text-red-700">{feedback}</p>}<Button className="btn-gold w-full">Submit application</Button></form></Modal></div>
}
function PropertyTrustPanel({ property, signedIn }: { property: Property; signedIn: boolean }) {
  const [flagged, setFlagged] = useState('')
  const [flagReview, setFlagReview] = useState('')
  const [error, setError] = useState('')
  async function flag(e: FormEvent<HTMLFormElement>, reviewId: string) {
    e.preventDefault()
    const form = e.currentTarget
    setError('')
    try {
      await api.post(`/reviews/${encodeURIComponent(reviewId)}/flags`, Object.fromEntries(new FormData(form)))
      setFlagged(reviewId)
      setFlagReview('')
    } catch (err) {
      setError(errorMessage(err))
    }
  }
  return <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
    <h2 className="text-xl font-black">Trust & safety</h2>
    <p className="mt-2 text-sm text-slate-600">Verification last completed {property.lastVerifiedAt || 'date not provided'} · re-verification due {property.reverificationDueAt || 'not scheduled'}.</p>
    <div className="mt-4 grid gap-4 sm:grid-cols-2">
      <div><h3 className="font-bold">Safety certificates</h3>{property.safetyCertificates?.length ? <ul className="mt-2 space-y-2 text-sm">{property.safetyCertificates.map((certificate, index) => <li key={`${certificate.type}-${index}`} className="rounded-xl bg-mist p-3"><b>{certificate.type}</b> · {label(certificate.status || 'NOT PROVIDED')}<br /><span className="text-slate-500">Expires {certificate.expiresAt || 'not provided'}{certificate.issuer ? ` · ${certificate.issuer}` : ''}</span></li>)}</ul> : <p className="mt-2 text-sm text-slate-500">No safety certificates have been recorded.</p>}</div>
      <div><h3 className="font-bold">Accreditation</h3><p className="mt-2 rounded-xl bg-mist p-3 text-sm"><b>{property.accreditation?.name || 'Accreditation'}</b><br />{label(property.accreditation?.status || 'NOT PROVIDED')}{property.accreditation?.expiresAt && <span className="text-slate-500"> · Expires {property.accreditation.expiresAt}</span>}</p>{property.inspectionReports?.length ? <><h3 className="mt-4 font-bold">Inspections</h3><ul className="mt-2 space-y-2 text-sm">{property.inspectionReports.map((report, index) => <li className="rounded-xl bg-mist p-3" key={`${report.title}-${index}`}>{report.title} · {label(report.status || 'UNKNOWN')}<br /><span className="text-slate-500">{report.inspectedAt || 'Date not provided'}</span></li>)}</ul></> : <p className="mt-3 text-sm text-slate-500">No inspection reports have been recorded.</p>}</div>
    </div>
    <h3 className="mt-6 border-t pt-5 font-bold">Reviews</h3>
    {property.reviews?.some((review) => review.status !== 'HIDDEN') ? <div className="mt-3 space-y-3">{property.reviews.filter((review) => review.status !== 'HIDDEN').map((review) => <article className="rounded-xl bg-mist p-4" key={review.id}><p className="font-semibold">{String(review.studentName || 'Student')} · {String(review.rating || '—')}/5</p><p className="mt-1 text-sm text-slate-700">{String(review.comment || review.name || '')}</p>{review.providerResponse && <div className="mt-3 border-l-2 border-gold pl-3 text-sm"><b>Provider response</b><p>{String(review.providerResponse)}</p></div>}{signedIn && <>{flagged === review.id ? <p className="mt-2 text-sm text-emerald-700">Flag submitted for moderation.</p> : flagReview === review.id ? <form className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]" onSubmit={(event) => void flag(event, review.id)}><input className="input" name="reason" required minLength={8} placeholder="Why should this review be checked?" /><Button className="btn-outline">Submit flag</Button></form> : <button className="mt-2 text-xs font-bold text-slate-500 underline" onClick={() => setFlagReview(review.id)}>Flag inappropriate review</button>}</>}</article>)}</div> : <p className="mt-2 text-sm text-slate-500">No reviews yet.</p>}
    {error && <p className="mt-3 text-sm text-red-700" role="alert">{error}</p>}
    <p className="mt-4 text-xs text-slate-500">Accreditation and safety details are provider-submitted demo records and should be independently verified before making a decision.</p>
  </section>
}
export function About() { return <Simple title="Better housing creates better student outcomes." text="Student Living connects students with trusted homes and gives providers and institutions the tools to support every step of the accommodation journey."><div className="mt-10 grid gap-5 md:grid-cols-3">{[[ShieldCheck,'Safety first'],[HeartHandshake,'Student centred'],[Users,'Connected community']].map(([I,t]) => { const Icon=I as typeof Users; return <div className="card" key={String(t)}><Icon className="text-gold-dark" /><h2 className="mt-4 text-xl font-bold">{String(t)}</h2><p className="mt-2 text-slate-600">Clear information, accountable partners and support you can rely on.</p></div>})}</div></Simple> }
export function Contact() { const [status,setStatus]=useState(''); async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setStatus('Sending…');const form=new FormData(e.currentTarget);try{await api.post('/contact',Object.fromEntries(form));setStatus('Thanks — your message has been sent.')}catch(err){setStatus(errorMessage(err))}} return <Simple title="We’re here to help." text="Questions about accommodation, applications or your account? Send our team a message."><form className="card mt-10 max-w-2xl space-y-4" onSubmit={submit}><label className="label">Name<input required name="name" className="input mt-2" /></label><label className="label">Email<input required type="email" name="email" className="input mt-2" /></label><label className="label">Message<textarea required name="message" className="input mt-2 min-h-32" /></label>{status && <p role="alert">{status}</p>}<Button className="btn-gold">Send message</Button></form></Simple> }
function Simple({title,text,children}:{title:string;text:string;children:React.ReactNode}){return <div className="container py-16"><p className="eyebrow text-gold-dark">Student Living</p><h1 className="mt-4 max-w-3xl text-4xl font-black sm:text-5xl">{title}</h1><p className="mt-5 max-w-2xl text-lg text-slate-600">{text}</p>{children}</div>}
export function NotFound(){return <Simple title="This page could not be found." text="The link may be outdated or the page may have moved."><Link className="btn btn-gold mt-8" to="/">Return home</Link></Simple>}
