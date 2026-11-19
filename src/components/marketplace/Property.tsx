import { useState } from 'react'
import { BedDouble, GitCompareArrows, Heart, MapPin, ShieldCheck, Star, Video } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Property } from '../../types'
import { fmtMoney } from '../../utils/format'

function imageUrl(property: Property) {
  const first = property.images?.[0]
  return typeof first === 'string' ? first : first?.url
}
export function PropertyCard({ property, favourite, onFavourite, comparing, onCompare, detailsPath }: { property: Property; favourite?: boolean; onFavourite?: () => void; comparing?: boolean; onCompare?: () => void; detailsPath?: string }) {
  const [failed, setFailed] = useState(false)
  const image = imageUrl(property)
  const place = [property.suburb, property.city].filter(Boolean).join(', ') || property.address || ''
  const tourUrl = typeof property.virtualTourUrl === 'string' && /^https:\/\//i.test(property.virtualTourUrl) ? property.virtualTourUrl : ''
  return <article className="card group overflow-hidden p-0">
    <div className="relative h-52 bg-slate-100">
      {image && !failed ? <img src={image} alt={`${property.name} accommodation`} className="h-full w-full object-cover transition group-hover:scale-[1.02]" onError={() => setFailed(true)} /> : <div className="grid h-full place-items-center bg-gradient-to-br from-navy to-slate-700 text-white"><BedDouble size={48} aria-hidden="true" /><span className="sr-only">No property photo available</span></div>}
      {onFavourite && <button className="icon-btn absolute right-3 top-3 bg-white" aria-label={favourite ? 'Remove from favourites' : 'Add to favourites'} aria-pressed={favourite} onClick={onFavourite}><Heart className={favourite ? 'fill-red-500 text-red-500' : ''} /></button>}
      {tourUrl && <a className="absolute bottom-3 left-3 inline-flex min-h-10 items-center gap-2 rounded-full bg-white px-4 text-xs font-bold text-navy shadow" href={tourUrl} target="_blank" rel="noopener noreferrer"><Video size={16} /> Virtual tour</a>}
    </div>
    <div className="p-5">
      <div className="flex items-start justify-between gap-3"><h3 className="text-lg font-extrabold text-navy">{property.name}</h3><span className="flex items-center gap-1 text-sm font-bold"><Star size={16} className="fill-gold text-gold" />{Number(property.avgRating || 0).toFixed(1)}</span></div>
      <p className="mt-2 flex items-center gap-1 text-sm text-slate-500"><MapPin size={16} />{place || 'Location available on request'}</p>
      <div className="mt-4 flex flex-wrap gap-2">{property.verificationStatus !== 'REJECTED' && <span className="chip"><ShieldCheck size={14} /> Verified</span>}{property.furnished && <span className="chip">Furnished</span>}{property.roomTypes?.slice(0, 2).map((type) => <span className="chip" key={type}>{type}</span>)}</div>
      {(property.capacity ?? property.maxCapacity) != null && <p className="mt-3 text-sm font-semibold text-slate-600">Capacity: {String(property.capacity ?? property.maxCapacity)} students</p>}
      <div className="mt-5 flex items-end justify-between gap-3 border-t pt-4"><div><p className="text-xs text-slate-500">From</p><p className="font-extrabold text-navy">{fmtMoney(property.minPrice)}<span className="text-xs font-normal text-slate-500"> /mo</span></p></div><Link className="font-bold text-navy underline decoration-gold decoration-2 underline-offset-4" to={detailsPath || `/properties/${property.id}`}>View details</Link></div>
      {onCompare && <button type="button" aria-pressed={comparing} onClick={onCompare} className={`mt-4 inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-xs font-bold transition ${comparing ? 'border-navy bg-navy text-white' : 'border-slate-200 text-navy hover:border-gold'}`}><GitCompareArrows size={16} />{comparing ? 'Added to compare' : 'Compare'}</button>}
      {property.distanceToCampusKm != null && <p className="mt-3 text-xs text-slate-500">{String(property.distanceToCampusKm)} km to campus{property.walkingMinutes != null ? ` · ${String(property.walkingMinutes)} min walk` : ''}</p>}
    </div>
  </article>
}
