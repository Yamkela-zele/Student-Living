import { AxiosHeaders, type AxiosAdapter, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import type { Entity, Role, User } from '../types'

export const demoMode = import.meta.env.VITE_DEMO_MODE === 'true'
type DemoProperty = Entity & {
  name: string
  campus: { id: string; name: string }
  campusId: string
  university: { id: string; name: string }
  minPrice: number
  availableRooms: number
  rooms: Entity[]
  status: string
  verificationStatus: string
  safetyCertificates: Array<{ type: string; status?: string; issuer?: string; expiresAt?: string }>
  inspectionReports: Array<{ title: string; inspectedAt?: string; status?: string }>
  accreditation: { name: string; status?: string; expiresAt?: string }
  lastVerifiedAt: string
  reverificationDueAt: string
}

const campuses = [
  { id: 'tut-pretoria', name: 'Pretoria Campus (Pretoria West)' },
  { id: 'tut-arcadia', name: 'Arcadia Campus (Pretoria)' },
  { id: 'tut-arts', name: 'Arts Campus (Pretoria)' },
  { id: 'tut-garankuwa', name: 'Ga-Rankuwa Campus' },
  { id: 'tut-sosh-north', name: 'Soshanguve North Campus' },
  { id: 'tut-sosh-south', name: 'Soshanguve South Campus' },
  { id: 'tut-emalahleni', name: 'eMalahleni Campus' },
  { id: 'tut-mbombela', name: 'Mbombela Campus' },
  { id: 'tut-polokwane', name: 'Polokwane Campus' },
  { id: 'tut-giyani', name: 'Giyani Campus' },
]

const sampleProperties: DemoProperty[] = [
  {
    id: 'demo-property-1', name: 'The Acacia House', suburb: 'Arcadia', city: 'Pretoria', address: '12 Example Street, Arcadia',
    campus: campuses[1], campusId: campuses[1].id, university: { id: 'tut', name: 'Tshwane University of Technology' },
    description: 'A bright, secure student home with study spaces, reliable Wi-Fi and easy access to campus.',
    images: ['https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80'],
    facilities: ['Wi-Fi', 'Laundry', 'Study area', '24-hour security'], furnished: true, minPrice: 3850, availableRooms: 3, capacity: 24, avgRating: 4.8,
    verificationStatus: 'APPROVED', status: 'APPROVED', isPublished: true,
    safetyCertificates: [{ type: 'Fire compliance', issuer: 'Demo Safety Inspection', expiresAt: '2027-08-30', status: 'VALID' }, { type: 'Electrical certificate', issuer: 'Demo Electrical Services', expiresAt: '2027-05-15', status: 'VALID' }],
    inspectionReports: [{ title: 'Annual property inspection', inspectedAt: '2026-08-30', status: 'PASSED' }],
    accreditation: { name: 'NSFAS accommodation', status: 'ACCREDITED', expiresAt: '2027-12-31' },
    lastVerifiedAt: '2026-08-30', reverificationDueAt: '2027-08-30', virtualTourUrl: 'https://example.test/tours/acacia',
    reviews: [{ id: 'demo-review-1', studentName: 'Lerato Mokoena', rating: 5, comment: 'A comfortable place to study, with helpful management.', createdAt: '2026-10-08T10:00:00Z' }],
    rooms: [
      { id: 'demo-room-1', number: 'A12', type: 'SINGLE', price: 3850, status: 'AVAILABLE' },
      { id: 'demo-room-2', number: 'A14', type: 'SHARED', price: 2950, status: 'AVAILABLE' },
      { id: 'demo-room-3', number: 'B02', type: 'SINGLE', price: 4200, status: 'OCCUPIED' },
    ],
  },
  {
    id: 'demo-property-2', name: 'West Campus Studios', suburb: 'Pretoria West', city: 'Pretoria', address: '8 Sample Avenue, Pretoria West',
    campus: campuses[0], campusId: campuses[0].id, university: { id: 'tut', name: 'Tshwane University of Technology' },
    description: 'Independent furnished rooms in a friendly student community, a short walk from the Pretoria campus.',
    images: ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80'],
    facilities: ['Furnished', 'Wi-Fi', 'Communal kitchen', 'Secure access'], furnished: true, minPrice: 3400, availableRooms: 5, capacity: 18, avgRating: 4.6,
    verificationStatus: 'APPROVED', status: 'APPROVED', isPublished: true,
    safetyCertificates: [{ type: 'Fire compliance', issuer: 'Demo Safety Inspection', expiresAt: '2027-02-20', status: 'VALID' }],
    inspectionReports: [{ title: 'Annual property inspection', inspectedAt: '2026-02-20', status: 'PASSED' }],
    accreditation: { name: 'NSFAS accommodation', status: 'ACCREDITED', expiresAt: '2027-10-31' },
    lastVerifiedAt: '2026-02-20', reverificationDueAt: '2027-02-20',
    rooms: [{ id: 'demo-room-4', number: 'W03', type: 'SINGLE', price: 3400, status: 'AVAILABLE' }, { id: 'demo-room-5', number: 'W05', type: 'SHARED', price: 2600, status: 'AVAILABLE' }],
  },
  {
    id: 'demo-property-3', name: 'Soshanguve Student Lodge', suburb: 'Soshanguve', city: 'Pretoria', address: '21 Demo Road, Soshanguve',
    campus: campuses[4], campusId: campuses[4].id, university: { id: 'tut', name: 'Tshwane University of Technology' },
    description: 'Comfortable student accommodation with transport links, shared kitchens and quiet study areas.',
    images: ['https://images.unsplash.com/photo-1560185008-b033106af5c3?auto=format&fit=crop&w=1200&q=80'],
    facilities: ['Study area', 'Transport nearby', 'Laundry', 'Wi-Fi'], furnished: false, minPrice: 2750, availableRooms: 2, capacity: 32, avgRating: 4.5,
    verificationStatus: 'APPROVED', status: 'APPROVED', isPublished: true,
    safetyCertificates: [{ type: 'Electrical certificate', issuer: 'Demo Electrical Services', expiresAt: '2027-11-02', status: 'VALID' }],
    inspectionReports: [{ title: 'Campus safety inspection', inspectedAt: '2026-11-02', status: 'PASSED' }],
    accreditation: { name: 'NSFAS accommodation', status: 'ACCREDITED', expiresAt: '2027-11-02' },
    lastVerifiedAt: '2026-11-02', reverificationDueAt: '2027-11-02',
    rooms: [{ id: 'demo-room-6', number: 'S08', type: 'SINGLE', price: 2750, status: 'AVAILABLE' }, { id: 'demo-room-7', number: 'S09', type: 'SHARED', price: 2200, status: 'AVAILABLE' }],
  },
  {
    id: 'demo-property-4', name: 'Mbombela Green Living', suburb: 'Mbombela', city: 'Mbombela', address: '5 Fictional Crescent, Mbombela',
    campus: campuses[7], campusId: campuses[7].id, university: { id: 'tut', name: 'Tshwane University of Technology' },
    description: 'A calm, well-connected place to live while studying in Mbombela.',
    images: ['https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80'],
    facilities: ['Garden', 'Wi-Fi', 'Laundry'], furnished: true, minPrice: 3200, availableRooms: 2, capacity: 16, avgRating: 4.7,
    verificationStatus: 'APPROVED', status: 'APPROVED', isPublished: true,
    safetyCertificates: [], inspectionReports: [], accreditation: { name: 'NSFAS accommodation', status: 'PENDING' },
    lastVerifiedAt: '2026-01-03', reverificationDueAt: '2027-01-03',
    rooms: [{ id: 'demo-room-8', number: 'M01', type: 'SINGLE', price: 3200, status: 'AVAILABLE' }],
  },
]

const campusLocations: Record<string, { suburb: string; city: string }> = {
  'tut-pretoria': { suburb: 'Pretoria West', city: 'Pretoria' },
  'tut-arcadia': { suburb: 'Arcadia', city: 'Pretoria' },
  'tut-arts': { suburb: 'Pretoria Central', city: 'Pretoria' },
  'tut-garankuwa': { suburb: 'Ga-Rankuwa', city: 'Pretoria' },
  'tut-sosh-north': { suburb: 'Soshanguve', city: 'Pretoria' },
  'tut-sosh-south': { suburb: 'Soshanguve', city: 'Pretoria' },
  'tut-emalahleni': { suburb: 'eMalahleni', city: 'eMalahleni' },
  'tut-mbombela': { suburb: 'Mbombela', city: 'Mbombela' },
  'tut-polokwane': { suburb: 'Polokwane', city: 'Polokwane' },
  'tut-giyani': { suburb: 'Giyani', city: 'Giyani' },
}
const demoPropertyNames = ['Student Haven', 'Campus View Lodge', 'Maple House', 'Scholar Court', 'Cedar Residence']
const demoPropertyImages = [
  'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1560185008-b033106af5c3?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80',
]
for (const campus of campuses) {
  const existingCount = sampleProperties.filter((property) => property.campusId === campus.id).length
  const location = campusLocations[campus.id]
  for (let index = existingCount; index < 5; index += 1) {
    const price = 2400 + ((campuses.indexOf(campus) * 317 + index * 229) % 1800)
    sampleProperties.push({
      id: `demo-property-${campus.id}-${index + 1}`,
      name: `${campus.name.replace(' Campus', '')} ${demoPropertyNames[index]}`,
      suburb: location.suburb,
      city: location.city,
      address: `${10 + index * 7} Sample Road, ${location.suburb}`,
      campus,
      campusId: campus.id,
      university: { id: 'tut', name: 'Tshwane University of Technology' },
      description: `Fictional demo accommodation near ${campus.name}, with student-friendly rooms and shared study facilities.`,
      images: [demoPropertyImages[index % demoPropertyImages.length]],
      facilities: ['Wi-Fi', 'Study area', index % 2 ? 'Laundry' : 'Communal kitchen', 'Secure access'],
      furnished: index % 2 === 0,
      minPrice: price,
      availableRooms: 2 + index % 4,
      capacity: 12 + index * 4,
      avgRating: Number((4.1 + (index % 9) / 10).toFixed(1)),
      verificationStatus: 'APPROVED',
      status: 'APPROVED',
      isPublished: true,
      safetyCertificates: [{ type: 'Fire compliance', issuer: 'Demo Safety Inspection', expiresAt: '2027-12-31', status: 'VALID' }],
      inspectionReports: [{ title: 'Sample property inspection', inspectedAt: '2026-10-01', status: 'PASSED' }],
      accreditation: { name: 'NSFAS accommodation', status: index % 2 ? 'PENDING' : 'ACCREDITED', expiresAt: '2027-12-31' },
      lastVerifiedAt: '2026-10-01',
      reverificationDueAt: '2027-10-01',
      virtualTourUrl: index === 0 ? 'https://example.test/tours/sample-residence' : '',
      reviews: [],
      rooms: [
        { id: `demo-room-${campus.id}-${index + 1}-a`, number: `D${index + 1}1`, type: 'SINGLE', price, status: 'AVAILABLE' },
        { id: `demo-room-${campus.id}-${index + 1}-b`, number: `D${index + 1}2`, type: 'SHARED', price: Math.max(1800, price - 600), status: 'AVAILABLE' },
      ],
    })
  }
}

const demoUsers: Record<Role, User> = {
  STUDENT: { id: 'demo-student', firstName: 'Sam', lastName: 'Student', email: 'student@studentliving.test', role: 'STUDENT', universityId: 'tut', studentNumber: 'DEMO2026' },
  PROVIDER: { id: 'demo-provider', firstName: 'Palesa', lastName: 'Provider', email: 'provider@studentliving.test', role: 'PROVIDER', businessName: 'Campus Homes Demo', verificationStatus: 'APPROVED' },
  UNIVERSITY_ADMIN: { id: 'demo-university-admin', firstName: 'Thabo', lastName: 'Administrator', email: 'university@studentliving.test', role: 'UNIVERSITY_ADMIN', universityId: 'tut' },
  SYSTEM_ADMIN: { id: 'demo-system-admin', firstName: 'Alex', lastName: 'Administrator', email: 'system@studentliving.test', role: 'SYSTEM_ADMIN' },
}

const applications: Entity[] = [
  { id: 'demo-application-1', reference: 'APP-DEMO-1042', studentName: 'Sam Student', studentNumber: 'DEMO2026', property: sampleProperties[0], room: sampleProperties[0].rooms[0], status: 'APPROVED', createdAt: '2026-10-12T10:00:00Z' },
  { id: 'demo-application-2', reference: 'APP-DEMO-1043', studentName: 'Lerato Mokoena', studentNumber: 'DEMO2025', property: sampleProperties[1], room: sampleProperties[1].rooms[0], status: 'UNDER_REVIEW', createdAt: '2026-10-16T10:00:00Z' },
  { id: 'demo-application-3', reference: 'APP-DEMO-1044', studentName: 'Sipho Dlamini', studentNumber: 'DEMO2024', property: sampleProperties[2], room: sampleProperties[2].rooms[0], status: 'SUBMITTED', createdAt: '2026-10-18T10:00:00Z' },
]

const bookings: Entity[] = [
  { id: 'demo-booking-1', reference: 'BKG-DEMO-201', studentName: 'Sam Student', property: sampleProperties[0], room: sampleProperties[0].rooms[0], status: 'CONFIRMED', startDate: '2027-01-15', endDate: '2027-11-30', createdAt: '2026-10-20T10:00:00Z' },
  { id: 'demo-booking-2', reference: 'BKG-DEMO-202', studentName: 'Lerato Mokoena', property: sampleProperties[1], room: sampleProperties[1].rooms[0], status: 'ACTIVE', startDate: '2026-02-01', endDate: '2026-11-30', createdAt: '2026-01-10T10:00:00Z' },
]

let favourites = ['demo-property-2']
let savedSearches: Entity[] = []
let notifications: Entity[] = [
  { id: 'demo-notification-1', title: 'Application approved', message: 'Your application for The Acacia House has been approved.', read: false },
  { id: 'demo-notification-2', title: 'Welcome to Student Living', message: 'Browse verified homes near your campus.', read: true },
]
const students: Entity[] = [
  { id: 'demo-student', name: 'Sam Student', email: 'student@studentliving.test', studentNumber: 'DEMO2026', status: 'ACTIVE', university: { name: 'Tshwane University of Technology' } },
  { id: 'demo-student-2', name: 'Lerato Mokoena', email: 'lerato@studentliving.test', studentNumber: 'DEMO2025', status: 'ACTIVE' },
]
const providers: Entity[] = [
  { id: 'demo-provider', name: 'Campus Homes Demo', email: 'provider@studentliving.test', status: 'APPROVED', verificationStatus: 'APPROVED' },
  { id: 'demo-provider-2', name: 'Northside Student Rentals', email: 'northside@studentliving.test', status: 'UNDER_REVIEW', verificationStatus: 'UNDER_REVIEW' },
]
const complaints: Entity[] = [{ id: 'demo-complaint-1', name: 'Maintenance request', description: 'A sample report about a leaking tap.', status: 'OPEN', createdAt: '2026-10-19T10:00:00Z' }]
const reviews: Entity[] = [{ id: 'demo-review-1', name: 'A comfortable place to study', comment: 'A comfortable place to study, with helpful management.', studentName: 'Lerato Mokoena', property: sampleProperties[0], rating: 5, status: 'PUBLISHED', providerResponse: '', createdAt: '2026-10-08T10:00:00Z' }]
sampleProperties[0].reviews = reviews.map((review) => ({ ...review, property: undefined }))
const reviewFlags: Entity[] = []
const universities: Entity[] = [{ id: 'tut', name: 'Tshwane University of Technology', campuses }]

function currentUser(): User | null {
  const token = localStorage.getItem('sl_token')
  const role = token?.startsWith('demo-') ? token.slice('demo-'.length) as Role : null
  return role && demoUsers[role] ? demoUsers[role] : null
}

function routeCollection(path: string) {
  if (path.startsWith('/applications')) return { applications }
  if (path.startsWith('/bookings')) return { bookings }
  if (path.startsWith('/favourites')) return { properties: sampleProperties.filter((property) => favourites.includes(property.id)), favourites: sampleProperties.filter((property) => favourites.includes(property.id)) }
  if (path === '/saved-searches') return { savedSearches }
  if (path.startsWith('/reviews')) return { reviews }
  if (path === '/provider/reviews') return { reviews: reviews.filter((review) => review.property?.id === 'demo-property-1') }
  if (path === '/admin/review-flags') return { flags: reviewFlags }
  if (path === '/admin/reverification-due') return { properties: sampleProperties }
  if (path.includes('/students')) return { students }
  if (path.includes('/providers')) return { providers }
  if (path === '/provider/properties') return { properties: sampleProperties.slice(0, 2) }
  if (path.includes('/properties')) return { properties: sampleProperties }
  if (path.includes('/complaints')) return { complaints }
  if (path.includes('/universities')) return { universities }
  if (path.includes('/users')) return { users: Object.values(demoUsers).map((user) => ({ ...user, name: `${user.firstName} ${user.lastName}`, status: 'ACTIVE', isActive: true })) }
  if (path.includes('/audit-logs')) return { logs: [{ id: 'demo-log-1', action: 'Demo data viewed', createdAt: '2026-10-20T10:00:00Z' }] }
  if (path.includes('/settings')) return { settings: [{ id: 'demo-setting-1', key: 'demo_mode', value: 'true' }, { id: 'demo-setting-2', key: 'platform_name', value: 'Student Living' }] }
  return {}
}

function response(data: unknown, config: InternalAxiosRequestConfig): AxiosResponse {
  return { data, status: 200, statusText: 'OK', headers: new AxiosHeaders(), config }
}

function createDemoProperty(values: Record<string, unknown>, id: string): DemoProperty {
  const campus = campuses.find((entry) => entry.id === values.campusId) || campuses[0]
  const safetyCertificates: DemoProperty['safetyCertificates'] = []
  if (values.fireSafetyCompliant) safetyCertificates.push({ type: 'Fire compliance', issuer: 'Provider submitted', expiresAt: String(values.fireCertificateExpiresAt || ''), status: 'SUBMITTED' })
  if (values.electricalSafetyCompliant) safetyCertificates.push({ type: 'Electrical certificate', issuer: 'Provider submitted', expiresAt: String(values.electricalCertificateExpiresAt || ''), status: 'SUBMITTED' })
  return {
    id,
    name: String(values.name || 'New sample property'),
    address: String(values.address || ''),
    suburb: String(values.suburb || ''),
    city: String(values.city || ''),
    campus,
    campusId: campus.id,
    university: { id: 'tut', name: 'Tshwane University of Technology' },
    description: String(values.description || ''),
    images: [],
    facilities: String(values.facilities || '').split(',').map((item) => item.trim()).filter(Boolean),
    furnished: values.furnished === 'true',
    minPrice: Number(values.price || 0),
    availableRooms: 0,
    capacity: Number(values.capacity || 0),
    avgRating: 0,
    verificationStatus: 'PENDING',
    status: 'PENDING',
    isPublished: false,
    virtualTourUrl: String(values.virtualTourUrl || ''),
    safetyCertificates,
    inspectionReports: values.lastInspectionAt ? [{ title: 'Provider-submitted inspection', inspectedAt: String(values.lastInspectionAt), status: 'SUBMITTED' }] : [],
    accreditation: { name: 'NSFAS accommodation', status: values.nsfasAccredited ? 'PENDING_VERIFICATION' : 'NOT_RECORDED', expiresAt: String(values.accreditationExpiresAt || '') },
    lastVerifiedAt: '',
    reverificationDueAt: String(values.reverificationDueAt || ''),
    reviews: [],
    rooms: [],
    contactEmail: String(values.contactEmail || ''),
    contactPhone: String(values.contactPhone || ''),
  }
}

export const demoAdapter: AxiosAdapter = async (config) => {
  const method = (config.method || 'get').toLowerCase()
  const path = new URL(config.url || '/', 'http://demo.local').pathname
  const segments = path.split('/').filter(Boolean)
  const id = decodeURIComponent(segments.at(-1) || '')
  const resourceId = decodeURIComponent(['cancel', 'read'].includes(id) ? segments.at(-2) || '' : id)
  const body = typeof config.data === 'string' ? JSON.parse(config.data || '{}') : config.data || {}
  const formValues = body instanceof FormData ? Object.fromEntries(body.entries()) : body as Record<string, unknown>
  let data: unknown = {}

  if (method === 'post' && path === '/auth/demo-login') {
    const role = (body as { role?: Role }).role
    data = role && demoUsers[role] ? { token: `demo-${role}`, user: demoUsers[role] } : {}
  } else if (path === '/auth/me') {
    data = { user: currentUser() }
  } else if (path === '/properties' && method === 'get') {
    const params = config.params as Record<string, unknown> | undefined
    const filtered = sampleProperties.filter((property) =>
      (!params?.campus || property.campus.name === params.campus || property.campusId === params.campus)
      && (!params?.universityId || params.universityId === 'tut')
      && (!params?.available || property.availableRooms > 0),
    )
    data = { properties: filtered.slice(0, Number(params?.limit) || filtered.length) }
  } else if (path.startsWith('/properties/') && method === 'get') {
    const property = sampleProperties.find((entry) => entry.id === id)
    const propertyReviews = property?.reviews?.map((publicReview: Entity) => {
      const currentReview = reviews.find((review) => review.id === publicReview.id)
      return { ...publicReview, providerResponse: currentReview?.providerResponse || publicReview.providerResponse, status: currentReview?.status || publicReview.status }
    })
    data = { property: property ? { ...property, reviews: propertyReviews } : undefined }
  } else if (path === '/universities') {
    data = { universities }
  } else if (path === '/dashboard/stats') {
    const role = currentUser()?.role
    data = { stats: (role === 'PROVIDER'
      ? [{ label: 'Properties', value: 2 }, { label: 'Available rooms', value: 8 }, { label: 'New applications', value: 2 }, { label: 'Current tenants', value: 4 }]
      : role === 'UNIVERSITY_ADMIN' || role === 'SYSTEM_ADMIN'
        ? [{ label: 'Students', value: 248 }, { label: 'Providers', value: 32 }, { label: 'Verified properties', value: 76 }, { label: 'Open applications', value: 18 }]
        : [{ label: 'Applications', value: 2 }, { label: 'Bookings', value: 1 }, { label: 'Saved homes', value: favourites.length }]),
      recent: [{ id: 'demo-activity-1', text: 'Sample account activity', at: '2026-10-20T10:00:00Z' }] }
  } else if (path === '/notifications' && method === 'get') {
    data = { notifications }
  } else if (path === '/admin/reports') {
    data = { report: { totalStudents: 248, totalProviders: 32, verifiedProperties: 76, activeBookings: 124 } }
  } else if (path === '/system/settings') {
    data = { settings: [{ id: 'demo-setting-1', key: 'demo_mode', value: 'true' }, { id: 'demo-setting-2', key: 'platform_name', value: 'Student Living' }] }
  } else if (method === 'get') {
    data = routeCollection(path)
    if (/\/(provider|admin)\/properties\/[^/]+$/.test(path)) data = { property: sampleProperties.find((property) => property.id === id) }
    if (/\/applications\/(?!mine$)[^/]+$/.test(path)) data = { application: applications.find((application) => application.id === id) }
  } else if (method === 'patch' && path.endsWith('/read-all')) {
    notifications = notifications.map((notification) => ({ ...notification, read: true }))
  } else if (method === 'patch' && path.includes('/notifications/')) {
    notifications = notifications.map((notification) => notification.id === resourceId ? { ...notification, read: true } : notification)
  } else if (method === 'patch' && /^\/admin\/review-flags\/[^/]+\/hide-review$/.test(path)) {
    const flag = reviewFlags.find((entry) => entry.id === decodeURIComponent(segments.at(-2) || ''))
    const review = reviews.find((entry) => entry.id === flag?.reviewId)
    if (review) {
      review.status = 'HIDDEN'
      for (const property of sampleProperties) {
        const publicReview = property.reviews?.find((entry: Entity) => entry.id === review.id)
        if (publicReview) publicReview.status = 'HIDDEN'
      }
    }
    if (flag) flag.status = 'REVIEW_HIDDEN'
    data = { success: true, message: 'Review hidden from public view.' }
  } else if (method === 'post' && path === '/favourites') {
    const propertyId = (body as { propertyId?: string }).propertyId
    if (propertyId && !favourites.includes(propertyId)) favourites = [...favourites, propertyId]
  } else if (method === 'delete' && path.startsWith('/favourites/')) {
    favourites = favourites.filter((propertyId) => propertyId !== id)
  } else if (method === 'post' && path === '/saved-searches') {
    const search = body as { name?: string; filters?: Record<string, unknown> }
    const entry = { id: `demo-search-${Date.now()}`, name: search.name || 'Saved accommodation search', filters: search.filters || {}, createdAt: new Date().toISOString() }
    savedSearches = [entry, ...savedSearches]
    notifications = [{ id: `${entry.id}-alert`, title: 'Search alert enabled', message: `We’ll look for new properties matching “${entry.name}”.`, read: false }, ...notifications]
    data = { savedSearch: entry }
  } else if (method === 'delete' && path.startsWith('/saved-searches/')) {
    savedSearches = savedSearches.filter((search) => search.id !== id)
  } else if (method === 'post' && /^\/reviews\/[^/]+\/flags$/.test(path)) {
    const review = reviews.find((entry) => entry.id === decodeURIComponent(segments.at(-2) || ''))
    reviewFlags.unshift({ id: `demo-review-flag-${Date.now()}`, reviewId: review?.id, review, reason: String(formValues.reason || ''), status: 'OPEN', createdAt: new Date().toISOString() })
    notifications = [{ id: `demo-review-flag-alert-${Date.now()}`, title: 'Review flagged for moderation', message: 'A review has been sent to the moderation queue.', read: false }, ...notifications]
    data = { success: true, message: 'Review flagged for moderation.' }
  } else if (method === 'post' && /^\/properties\/[^/]+\/reviews\/[^/]+\/responses$/.test(path)) {
    const reviewId = decodeURIComponent(segments.at(-2) || '')
    const review = reviews.find((entry) => entry.id === reviewId)
    if (review) {
      review.providerResponse = String(formValues.response || '')
      const propertyReview = sampleProperties.find((entry) => entry.id === segments[1])?.reviews?.find((entry: Entity) => entry.id === reviewId)
      if (propertyReview) propertyReview.providerResponse = review.providerResponse
    }
    data = { success: true, message: 'Provider response published.' }
  } else if (method === 'post' && /^\/admin\/properties\/[^/]+\/reverification$/.test(path)) {
    const property = sampleProperties.find((entry) => entry.id === decodeURIComponent(segments.at(-2) || ''))
    if (property) {
      property.lastVerifiedAt = new Date().toISOString().slice(0, 10)
      property.reverificationDueAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      property.verificationStatus = 'APPROVED'
      property.status = 'APPROVED'
    }
    data = { success: true, message: 'Property re-verified for 12 months.' }
  } else if (method === 'post' && path.startsWith('/auth/register/')) {
    const role: Role = path.endsWith('/student') ? 'STUDENT' : 'PROVIDER'
    data = { token: `demo-${role}`, user: demoUsers[role] }
  } else if (method === 'post' && path === '/auth/login') {
    const email = String((body as { email?: string }).email || '')
    const user = Object.values(demoUsers).find((candidate) => candidate.email === email)
    if (user) data = { token: `demo-${user.role}`, user }
  } else if (method === 'patch') {
    const values = body as Record<string, unknown>
    const entity = [...applications, ...bookings, ...sampleProperties, ...providers, ...complaints, ...reviews, ...reviewFlags].find((item) => item.id === resourceId)
    if (entity) {
      if (path.endsWith('/cancel')) entity.status = 'CANCELLED'
      else if (values && typeof values === 'object') Object.assign(entity, values)
      if (path.includes('/admin/properties/') && values?.status) entity.verificationStatus = values.status as string
    }
    if (path.includes('/provider/rooms/')) {
      for (const property of sampleProperties) {
        const room = property.rooms.find((entry) => entry.id === resourceId)
        if (room && values?.availability) room.status = values.availability as string
      }
    }
    data = { success: true, message: 'Sample data updated for this demo session.' }
  } else if (method === 'post' && path === '/applications') {
    applications.unshift({ id: `demo-application-${Date.now()}`, reference: 'APP-DEMO-NEW', studentName: 'Sam Student', property: sampleProperties[0], room: sampleProperties[0].rooms[0], status: 'SUBMITTED', createdAt: new Date().toISOString() })
    data = { success: true, message: 'Sample application submitted.' }
  } else if (method === 'post' && /^\/applications\/[^/]+\/book$/.test(path)) {
    const application = applications.find((item) => item.id === decodeURIComponent(segments.at(-2) || ''))
    if (application) {
      application.status = 'BOOKED'
      bookings.unshift({ id: `demo-booking-${Date.now()}`, reference: 'BKG-DEMO-NEW', studentName: 'Sam Student', property: application.property, room: application.room, status: 'CONFIRMED', ...(formValues as Record<string, unknown>) })
    }
    data = { success: true, message: 'Sample booking confirmed.' }
  } else if (method === 'post' && path === '/provider/properties') {
    sampleProperties.unshift(createDemoProperty(formValues, `demo-property-${Date.now()}`))
    data = { success: true, message: 'Sample property submitted.' }
  } else if (method === 'post' && path === '/admin/properties') {
    sampleProperties.unshift(createDemoProperty(formValues, `demo-property-${Date.now()}`))
    data = { success: true, message: 'Sample property created.' }
  } else if (method === 'post' && /^\/provider\/properties\/[^/]+\/rooms$/.test(path)) {
    const property = sampleProperties.find((item) => item.id === decodeURIComponent(segments.at(-2) || ''))
    property?.rooms.push({ id: `demo-room-${Date.now()}`, number: 'NEW', type: 'SINGLE', price: 3000, status: 'AVAILABLE', ...(formValues as Record<string, unknown>) })
    if (property) property.availableRooms = property.rooms.filter((room) => room.status === 'AVAILABLE').length
    data = { success: true, message: 'Sample room added.' }
  } else if (method === 'post' && path === '/system/universities') {
    universities.push({ id: `demo-university-${Date.now()}`, name: String(formValues.name || 'Sample university'), campuses: [] })
    data = { success: true, message: 'Sample university added.' }
  } else if (method === 'post' && path === '/reviews') {
    reviews.unshift({ id: `demo-review-${Date.now()}`, name: 'New sample review', comment: String(formValues.comment || ''), status: 'PUBLISHED', createdAt: new Date().toISOString() })
    data = { success: true, message: 'Sample review added.' }
  } else if (method === 'post' && path === '/complaints') {
    complaints.unshift({ id: `demo-complaint-${Date.now()}`, name: 'Sample support request', status: 'OPEN', createdAt: new Date().toISOString() })
    data = { success: true, message: 'Sample support request added.' }
  } else {
    data = { success: true, message: 'Demo action complete; changes are temporary sample data.' }
  }

  return response(data, config)
}
