import { AxiosHeaders, type AxiosAdapter, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { supabase } from '../integrations/supabase/client'

function response(data: unknown, config: InternalAxiosRequestConfig): AxiosResponse {
  return { data, status: 200, statusText: 'OK', headers: new AxiosHeaders(), config }
}

function objectData(config: InternalAxiosRequestConfig): Record<string, unknown> {
  if (typeof config.data === 'string') return JSON.parse(config.data || '{}') as Record<string, unknown>
  if (config.data instanceof FormData) return Object.fromEntries(config.data.entries())
  return (config.data || {}) as Record<string, unknown>
}

function mapProperty(property: Record<string, any>): Record<string, any> {
  const rooms = property.rooms || []
  const media = property.media || []
  return {
    ...property,
    campusId: property.campus_id,
    campusName: property.campus?.name,
    universityName: property.university?.name,
    verificationStatus: property.status,
    rejectionReason: property.rejection_reason,
    lastVerifiedAt: property.last_inspection_at,
    reverificationDueAt: property.reverification_due_at,
    virtualTourUrl: property.virtual_tour_url,
    nsfasAccredited: property.nsfas_accredited,
    accreditationExpiresAt: property.accreditation_expires_at,
    isPublished: property.is_published,
    createdAt: property.created_at,
    updatedAt: property.updated_at,
    avgRating: property.reviews?.length
      ? property.reviews.reduce((total: number, review: { rating: number }) => total + Number(review.rating), 0) / property.reviews.length
      : 0,
    availableRooms: rooms.filter((room: { status: string }) => room.status === 'AVAILABLE').length,
    minPrice: rooms.length ? Math.min(...rooms.map((room: { price: number }) => Number(room.price))) : property.price,
    images: media.filter((item: { media_type: string }) => item.media_type === 'PHOTO')
      .map((item: { storage_path: string }) => supabase!.storage.from('property-media').getPublicUrl(item.storage_path).data.publicUrl),
    videos: media.filter((item: { media_type: string }) => item.media_type === 'VIDEO')
      .map((item: { storage_path: string; duration_seconds?: number }) => ({
        url: supabase!.storage.from('property-media').getPublicUrl(item.storage_path).data.publicUrl,
        durationSeconds: item.duration_seconds,
      })),
    reviews: (property.reviews || []).map((review: Record<string, any>) => ({
      ...review,
      createdAt: review.created_at,
      providerResponse: review.provider_response,
    })),
    rooms,
  }
}

function relationOne<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] || null : value
}

async function getCurrentUserId() {
  if (!supabase) throw new Error('Supabase is not configured')
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  if (!data.user) throw new Error('Please sign in again.')
  return data.user.id
}

function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    const objectUrl = URL.createObjectURL(file)
    const cleanup = () => {
      URL.revokeObjectURL(objectUrl)
      video.removeAttribute('src')
      video.load()
    }
    video.onloadedmetadata = () => {
      const duration = video.duration
      cleanup()
      if (!Number.isFinite(duration)) reject(new Error('Could not read the video duration.'))
      else resolve(duration)
    }
    video.onerror = () => {
      cleanup()
      reject(new Error('Could not read the video duration.'))
    }
    video.src = objectUrl
  })
}

export const supabaseAdapter: AxiosAdapter = async (config) => {
  if (!supabase) throw new Error('Supabase is not configured')
  const method = (config.method || 'get').toLowerCase()
  const path = new URL(config.url || '/', 'http://supabase.local').pathname

  if (method === 'get' && path === '/universities') {
    const { data, error } = await supabase.from('universities').select('*, campuses(*)').order('name')
    if (error) throw error
    return response({ universities: data || [] }, config)
  }

  if (method === 'get' && path === '/properties') {
    const params = config.params as Record<string, unknown> | undefined
    let query = supabase.from('properties').select('*, campus:campuses(*), rooms(*), media:property_media(*)').eq('status', 'APPROVED')
    if (params?.campus) query = query.eq('campus_id', String(params.campus))
    if (params?.universityId) query = query.eq('university_id', String(params.universityId))
    if (params?.maxPrice) query = query.lte('price', Number(params.maxPrice))
    if (params?.search) query = query.or(`name.ilike.%${String(params.search).replace(/[,()%]/g, '')}%,city.ilike.%${String(params.search).replace(/[,()%]/g, '')}%,suburb.ilike.%${String(params.search).replace(/[,()%]/g, '')}%`)
    if (params?.limit) query = query.limit(Number(params.limit) || 100)
    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) throw error
    let properties = (data || []).map((property) => mapProperty(property))
    if (params?.available) properties = properties.filter((property) => property.availableRooms > 0)
    if (params?.type) properties = properties.filter((property) => property.rooms.some((room: { type: string }) => room.type === params.type))
    if (params?.furnished) properties = properties.filter((property) => property.furnished === (params.furnished === true || params.furnished === 'true'))
    return response({ properties }, config)
  }

  if (method === 'get' && /^(\/properties|\/provider\/properties|\/admin\/properties)\/[^/]+$/.test(path)) {
    const id = path.split('/').pop()
    const { data, error } = await supabase.from('properties').select('*, campus:campuses(*), university:universities(*), rooms(*), media:property_media(*), reviews(*)').eq('id', id).maybeSingle()
    if (error) throw error
    if (!data) return response({ property: null }, config)
    const { data: documents, error: documentError } = await supabase.from('property_documents').select('id,document_type,file_name,storage_path').eq('property_id', id)
    if (documentError) throw documentError
    return response({ property: { ...mapProperty(data), documents: (documents || []).map((document) => ({ ...document, name: document.file_name })) } }, config)
  }

  if (method === 'get' && path === '/auth/me') {
    const { data: sessionData } = await supabase.auth.getSession()
    if (!sessionData.session) throw new Error('Please sign in again.')
    const { data, error } = await supabase.from('profiles').select('*, university:universities(*), campus:campuses(*)').eq('id', sessionData.session.user.id).maybeSingle()
    if (error) throw error
    if (!data || !data.is_active) throw new Error('This account is unavailable. Please contact support.')
    return response({ user: { id: sessionData.session.user.id, email: sessionData.session.user.email, ...data } }, config)
  }

  if (method === 'get' && path === '/favourites') {
    const userId = await getCurrentUserId()
    const { data, error } = await supabase.from('favourites').select('property:properties(*, campus:campuses(*), rooms(*), media:property_media(*))').eq('student_id', userId)
    if (error) throw error
    return response({ properties: (data || []).flatMap((row) => row.property ? [mapProperty(row.property)] : []) }, config)
  }

  if (method === 'get' && path === '/notifications') {
    const userId = await getCurrentUserId()
    const { data, error } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(100)
    if (error) throw error
    return response({ notifications: (data || []).map((item) => ({ ...item, read: item.status === 'READ', readAt: item.status === 'READ' ? item.created_at : null })) }, config)
  }

  if (method === 'get' && path === '/saved-searches') {
    const userId = await getCurrentUserId()
    const { data, error } = await supabase.from('saved_searches').select('*').eq('student_id', userId).order('created_at', { ascending: false })
    if (error) throw error
    return response({ savedSearches: data || [] }, config)
  }

  if (method === 'get' && ['/applications/mine', '/provider/applications', '/admin/applications'].includes(path)) {
    let query = supabase.from('applications').select('*, property:properties(*,campus:campuses(*)), student:profiles!applications_student_id_fkey(*)').order('created_at', { ascending: false })
    if (path === '/applications/mine') query = query.eq('student_id', await getCurrentUserId())
    const { data, error } = await query
    if (error) throw error
    let applications = data || []
    if (path === '/provider/applications') {
      const userId = await getCurrentUserId()
      applications = applications.filter((application) => application.property?.provider_id === userId)
    }
    const applicationIds = applications.map((application) => application.id)
    const documentResult = applicationIds.length
      ? await supabase.from('application_documents').select('id,application_id,file_name,storage_path').in('application_id', applicationIds)
      : { data: [], error: null }
    if (documentResult.error) throw documentResult.error
    const documentsByApplication = new Map<string, Array<{ id: string; name: string; storage_path: string }>>()
    for (const document of documentResult.data || []) {
      const current = documentsByApplication.get(document.application_id) || []
      current.push({ id: document.id, name: document.file_name, storage_path: document.storage_path })
      documentsByApplication.set(document.application_id, current)
    }
    const mapped = applications.map((application) => ({
      ...application,
      studentName: [application.student?.first_name, application.student?.last_name].filter(Boolean).join(' '),
      studentNumber: application.student?.student_number,
      propertyName: application.property?.name,
      createdAt: application.created_at,
      rejectionReason: application.rejection_reason,
      documents: documentsByApplication.get(application.id) || [],
    }))
    return response({ applications: mapped }, config)
  }

  if (method === 'get' && ['/bookings/mine', '/provider/bookings'].includes(path)) {
    let query = supabase.from('bookings').select('*, property:properties(*,campus:campuses(*)), student:profiles!bookings_student_id_fkey(*)').order('created_at', { ascending: false })
    if (path === '/bookings/mine') query = query.eq('student_id', await getCurrentUserId())
    const { data, error } = await query
    if (error) throw error
    let bookings = data || []
    if (path === '/provider/bookings') {
      const currentParam = new URL(config.url || '/', 'http://supabase.local').searchParams.get('current')
      const userId = await getCurrentUserId()
      bookings = bookings.filter((booking) => booking.property?.provider_id === userId)
      if (currentParam === 'true') bookings = bookings.filter((booking) => ['CONFIRMED', 'ACTIVE'].includes(booking.status))
    }
    return response({ bookings: bookings.map((booking) => ({
      ...booking,
      studentName: [booking.student?.first_name, booking.student?.last_name].filter(Boolean).join(' '),
      studentNumber: booking.student?.student_number,
      propertyName: booking.property?.name,
    })) }, config)
  }

  if (method === 'get' && path === '/reviews/mine') {
    const userId = await getCurrentUserId()
    const { data, error } = await supabase.from('reviews').select('*, property:properties(name)').eq('student_id', userId).order('created_at', { ascending: false })
    if (error) throw error
    return response({ reviews: data || [] }, config)
  }

  if (method === 'get' && ['/provider/properties', '/admin/properties', '/admin/reverification-due'].includes(path)) {
    let query = supabase.from('properties').select('*, campus:campuses(*), university:universities(*), rooms(*), media:property_media(*), property_documents(*)').order('created_at', { ascending: false })
    if (path === '/admin/reverification-due') query = query.not('reverification_due_at', 'is', null).lte('reverification_due_at', new Date().toISOString().slice(0, 10))
    const { data, error } = await query
    if (error) throw error
    let properties: Array<Record<string, any>> = (data || []).map((property) => ({
      ...mapProperty(property),
      roomsCount: property.rooms?.length || 0,
      documents: (property.property_documents || []).map((document: Record<string, any>) => ({ ...document, name: document.file_name })),
    }))
    if (path === '/provider/properties') {
      const userId = await getCurrentUserId()
      properties = properties.filter((property) => property.provider_id === userId)
    }
    return response({ properties }, config)
  }

  if (method === 'get' && ['/admin/students', '/admin/providers', '/system/users'].includes(path)) {
    let query = supabase.from('profiles').select('*, university:universities(*), campus:campuses(*)').order('created_at', { ascending: false })
    if (path === '/admin/students') query = query.eq('role', 'STUDENT')
    if (path === '/admin/providers') query = query.eq('role', 'PROVIDER')
    const { data, error } = await query
    if (error) throw error
    const profiles = (data || []).map((profile) => ({
      ...profile,
      firstName: profile.first_name,
      lastName: profile.last_name,
      studentNumber: profile.student_number,
      isActive: profile.is_active,
      verificationStatus: profile.verification_status,
      providerName: profile.business_name || [profile.first_name, profile.last_name].filter(Boolean).join(' '),
    }))
    return response({ [path === '/admin/students' ? 'students' : path === '/admin/providers' ? 'providers' : 'users']: profiles }, config)
  }

  if (method === 'get' && path === '/admin/complaints') {
    const { data, error } = await supabase.from('complaints').select('*, property:properties(name), student:profiles!complaints_student_id_fkey(first_name,last_name,email)').order('created_at', { ascending: false })
    if (error) throw error
    return response({ complaints: (data || []).map((item) => ({
      ...item,
      studentName: [item.student?.first_name, item.student?.last_name].filter(Boolean).join(' '),
      propertyName: item.property?.name,
      message: item.description,
    })) }, config)
  }

  if (method === 'get' && path === '/admin/review-flags') {
    const { data, error } = await supabase.from('review_flags').select('*, review:reviews(*,property:properties(name))').order('created_at', { ascending: false })
    if (error) throw error
    return response({ flags: data || [] }, config)
  }

  if (method === 'get' && path === '/provider/reviews') {
    const userId = await getCurrentUserId()
    const { data, error } = await supabase.from('reviews').select('*, property:properties!inner(id,name,provider_id), student:profiles!reviews_student_id_fkey(first_name,last_name)').eq('property.provider_id', userId).order('created_at', { ascending: false })
    if (error) throw error
    return response({ reviews: (data || []).map((review) => ({
      ...review,
      providerResponse: review.provider_response,
      studentName: [review.student?.first_name, review.student?.last_name].filter(Boolean).join(' '),
    })) }, config)
  }

  if (method === 'get' && path === '/dashboard/stats') {
    const userId = await getCurrentUserId()
    const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', userId).single()
    if (profileError) throw profileError
    const [properties, applications, bookings, complaints] = await Promise.all([
      supabase.from('properties').select('id,status,provider_id'),
      supabase.from('applications').select('id,status,student_id,property:properties(provider_id)'),
      supabase.from('bookings').select('id,status,student_id,property:properties(provider_id)'),
      supabase.from('complaints').select('id,status,student_id,property:properties(provider_id)'),
    ])
    for (const result of [properties, applications, bookings, complaints]) if (result.error) throw result.error
    const role = profile.role
    const ownProperties = (properties.data || []).filter((item) => item.provider_id === userId)
    const ownApplications = (applications.data || []).filter((item) => role === 'STUDENT' ? item.student_id === userId : relationOne(item.property)?.provider_id === userId)
    const ownBookings = (bookings.data || []).filter((item) => role === 'STUDENT' ? item.student_id === userId : relationOne(item.property)?.provider_id === userId)
    const ownComplaints = (complaints.data || []).filter((item) => role === 'STUDENT' ? item.student_id === userId : relationOne(item.property)?.provider_id === userId)
    const counts = role === 'PROVIDER'
      ? [['My properties', ownProperties.length], ['Pending applications', ownApplications.filter((item) => ['SUBMITTED', 'UNDER_REVIEW'].includes(item.status)).length], ['Current tenants', ownBookings.filter((item) => ['CONFIRMED', 'ACTIVE'].includes(item.status)).length], ['Open issues', ownComplaints.filter((item) => item.status === 'OPEN').length]]
      : role === 'STUDENT'
        ? [['My applications', ownApplications.length], ['Approved applications', ownApplications.filter((item) => item.status === 'APPROVED').length], ['My bookings', ownBookings.length], ['Open issues', ownComplaints.filter((item) => item.status === 'OPEN').length]]
        : [['Properties', properties.data?.length || 0], ['Applications', applications.data?.length || 0], ['Bookings', bookings.data?.length || 0], ['Open complaints', complaints.data?.filter((item) => item.status === 'OPEN').length || 0]]
    const recent = [...ownApplications, ...ownBookings].sort((a, b) => String(b.id).localeCompare(String(a.id))).slice(0, 5)
    return response({ stats: counts.map(([label, value]) => ({ label, value })), recent: recent.map((item) => ({ id: item.id, text: `${item.status} update`, at: 'created_at' in item ? item.created_at : undefined })) }, config)
  }

  if (method === 'get' && path === '/admin/reports') {
    const [properties, students, providers, applications, bookings, complaints] = await Promise.all([
      supabase.from('properties').select('id,status'),
      supabase.from('profiles').select('id').eq('role', 'STUDENT'),
      supabase.from('profiles').select('id').eq('role', 'PROVIDER'),
      supabase.from('applications').select('id,status'),
      supabase.from('bookings').select('id,status'),
      supabase.from('complaints').select('id,status'),
    ])
    for (const result of [properties, students, providers, applications, bookings, complaints]) if (result.error) throw result.error
    const report = {
      properties: properties.data?.length || 0,
      approvedProperties: properties.data?.filter((item) => item.status === 'APPROVED').length || 0,
      students: students.data?.length || 0,
      providers: providers.data?.length || 0,
      applications: applications.data?.length || 0,
      pendingApplications: applications.data?.filter((item) => ['SUBMITTED', 'UNDER_REVIEW'].includes(item.status)).length || 0,
      bookings: bookings.data?.length || 0,
      openComplaints: complaints.data?.filter((item) => item.status === 'OPEN').length || 0,
    }
    return response({ report }, config)
  }

  if (method === 'get' && path === '/system/audit-logs') {
    const { data, error } = await supabase.from('audit_logs').select('*, actor:profiles!audit_logs_actor_id_fkey(email,first_name,last_name)').order('created_at', { ascending: false }).limit(500)
    if (error) throw error
    return response({ logs: data || [] }, config)
  }

  if (method === 'get' && path === '/system/settings') {
    const { data, error } = await supabase.from('system_settings').select('*').order('key')
    if (error) throw error
    return response({ settings: data || [] }, config)
  }

  if (method === 'get' && /^\/documents\/[^/]+$/.test(path)) {
    const documentId = decodeURIComponent(path.split('/').pop() || '')
    const lookups = await Promise.all([
      supabase.from('provider_documents').select('storage_path,file_name').eq('id', documentId).maybeSingle(),
      supabase.from('property_documents').select('storage_path,file_name').eq('id', documentId).maybeSingle(),
      supabase.from('application_documents').select('storage_path,file_name').eq('id', documentId).maybeSingle(),
    ])
    for (const lookup of lookups) if (lookup.error) throw lookup.error
    const document = lookups.map((lookup) => lookup.data).find(Boolean)
    if (!document) throw new Error('Document not found or you do not have permission to access it.')
    const { data, error } = await supabase.storage.from('verification-documents').createSignedUrl(document.storage_path, 60)
    if (error) throw error
    const file = await fetch(data.signedUrl)
    if (!file.ok) throw new Error('The requested document could not be downloaded.')
    return response(await file.blob(), config)
  }

  const propertyDocumentTypes = new Set([
    'zoningCertificate','proofOfOwnership','approvedBuildingPlans','occupancyCertificate','fireComplianceCertificate','electricalComplianceCertificate','propertyBankConfirmation','securityManagementPlan','pestControlCertificate','wasteManagementPlan','psiraCertificates','healthSafetyEmergencyPlan','cleaningContracts',
  ])
  const providerDocumentTypes = new Set([
    'identityDocuments','proxyLetters','proofOfAddress','companyRegistration','bbbeeCertificate','sarsTaxDocuments','businessBankConfirmation',
  ])

  if (method === 'post' && path === '/favourites') {
    const userId = await getCurrentUserId()
    const { error } = await supabase.from('favourites').insert({ student_id: userId, property_id: String(objectData(config).propertyId || '') })
    if (error) throw error
    return response({ success: true }, config)
  }

  if (method === 'post' && path === '/saved-searches') {
    const userId = await getCurrentUserId()
    const body = objectData(config)
    const { data, error } = await supabase.from('saved_searches').insert({
      student_id: userId,
      name: String(body.name || '').trim(),
      filters: body.filters || {},
    }).select('*').single()
    if (error) throw error
    return response({ savedSearch: data }, config)
  }

  if (method === 'post' && path === '/applications') {
    const userId = await getCurrentUserId()
    if (!(config.data instanceof FormData)) throw new Error('An application document is required.')
    const form = config.data
    const roomId = String(form.get('roomId') || '')
    const note = String(form.get('note') || '')
    const file = form.get('documents')
    if (!(file instanceof File) || file.size === 0) throw new Error('An application document is required.')
    const { data: room, error: roomError } = await supabase.from('rooms').select('id,property_id,status').eq('id', roomId).single()
    if (roomError) throw roomError
    if (room.status !== 'AVAILABLE') throw new Error('This room is no longer available.')
    const { data: application, error } = await supabase.from('applications').insert({
      student_id: userId, property_id: room.property_id, room_id: room.id, note, status: 'SUBMITTED',
    }).select('*').single()
    if (error) throw error
    const storagePath = `${userId}/${application.id}/documents/${crypto.randomUUID()}-${file.name}`
    const { error: uploadError } = await supabase.storage.from('verification-documents').upload(storagePath, file, { contentType: file.type })
    if (uploadError) throw uploadError
    const { error: documentError } = await supabase.from('application_documents').insert({
      application_id: application.id, student_id: userId, storage_path: storagePath, file_name: file.name, mime_type: file.type,
    })
    if (documentError) throw documentError
    return response({ application }, config)
  }

  if (method === 'post' && path === '/reviews') {
    const userId = await getCurrentUserId()
    const body = objectData(config)
    const { data: booking, error: bookingError } = await supabase.from('bookings').select('id,property_id').eq('id', String(body.bookingId || '')).single()
    if (bookingError) throw bookingError
    const { data, error } = await supabase.from('reviews').insert({
      student_id: userId,
      booking_id: booking.id,
      property_id: booking.property_id,
      rating: Number(body.rating),
      comment: String(body.comment || ''),
    }).select('*').single()
    if (error) throw error
    return response({ review: data }, config)
  }

  if (method === 'post' && path === '/complaints') {
    const body = objectData(config)
    const { data, error } = await supabase.rpc('create_booking_complaint', {
      booking_uuid: String(body.bookingId || ''),
      complaint_message: String(body.message || ''),
    })
    if (error) throw error
    return response({ complaint: data }, config)
  }

  if (method === 'post' && path === '/contact') {
    const body = objectData(config)
    const { data, error } = await supabase.from('contact_messages').insert({
      name: String(body.name || '').trim(),
      email: String(body.email || '').trim(),
      message: String(body.message || '').trim(),
    }).select('id').single()
    if (error) throw error
    return response({ success: true, id: data.id }, config)
  }

  if (method === 'post' && /^\/reviews\/[^/]+\/flags$/.test(path)) {
    const userId = await getCurrentUserId()
    const reviewId = decodeURIComponent(path.split('/')[2])
    const body = objectData(config)
    const { data, error } = await supabase.from('review_flags').insert({
      review_id: reviewId,
      reporter_id: userId,
      reason: String(body.reason || body.message || 'Reported by student'),
    }).select('*').single()
    if (error) throw error
    return response({ flag: data }, config)
  }

  if (method === 'post' && /^\/provider\/properties\/[^/]+\/rooms$/.test(path)) {
    const propertyId = decodeURIComponent(path.split('/')[3])
    const body = objectData(config)
    const { data, error } = await supabase.from('rooms').insert({
      property_id: propertyId,
      number: String(body.number || body.roomNumber || '').trim(),
      type: String(body.type || body.roomType || 'SINGLE').toUpperCase(),
      price: Number(body.price || 0),
      status: String(body.status || body.availability || 'AVAILABLE').toUpperCase(),
      occupancy_limit: Number(body.occupancyLimit || 1),
    }).select('*').single()
    if (error) throw error
    return response({ room: data }, config)
  }

  if (method === 'post' && path === '/system/universities') {
    const body = objectData(config)
    const { data, error } = await supabase.from('universities').insert({
      name: String(body.name || '').trim(),
      city: String(body.city || '').trim() || null,
      province: String(body.province || '').trim() || null,
    }).select('*, campuses(*)').single()
    if (error) throw error
    return response({ university: data }, config)
  }

  if (method === 'post' && /^\/system\/universities\/[^/]+\/campuses$/.test(path)) {
    const universityId = decodeURIComponent(path.split('/')[3])
    const body = objectData(config)
    const { data, error } = await supabase.from('campuses').insert({
      university_id: universityId,
      name: String(body.name || '').trim(),
      city: String(body.city || '').trim() || null,
      province: String(body.province || '').trim() || null,
    }).select('*').single()
    if (error) throw error
    return response({ campus: data }, config)
  }

  if (method === 'post' && /^\/applications\/[^/]+\/book$/.test(path)) {
    const applicationId = decodeURIComponent(path.split('/')[2])
    const body = objectData(config)
    const { data, error } = await supabase.rpc('create_booking_from_application', {
      application_uuid: applicationId,
      booking_start: String(body.startDate || ''),
      booking_end: String(body.endDate || ''),
    })
    if (error) throw error
    return response({ booking: data }, config)
  }

  if (method === 'post' && /^\/admin\/properties\/[^/]+\/reverification$/.test(path)) {
    const propertyId = decodeURIComponent(path.split('/')[3])
    const nextDueDate = new Date()
    nextDueDate.setFullYear(nextDueDate.getFullYear() + 1)
    const { data, error } = await supabase.from('properties').update({
      last_inspection_at: new Date().toISOString().slice(0, 10),
      reverification_due_at: nextDueDate.toISOString().slice(0, 10),
    }).eq('id', propertyId).eq('status', 'APPROVED').select('*').single()
    if (error) throw error
    return response({ property: data }, config)
  }

  if (method === 'post' && /^\/properties\/[^/]+\/reviews\/[^/]+\/responses$/.test(path)) {
    const propertyId = decodeURIComponent(path.split('/')[2])
    const reviewId = decodeURIComponent(path.split('/')[4])
    const body = objectData(config)
    const { data, error } = await supabase.from('reviews').update({ provider_response: String(body.response || '').trim() })
      .eq('id', reviewId).eq('property_id', propertyId).select('*').single()
    if (error) throw error
    return response({ review: data }, config)
  }

  if (method === 'put' && path === '/profile') {
    const { data: sessionData } = await supabase.auth.getSession()
    if (!sessionData.session) throw new Error('Please sign in again.')
    const formValues = config.data instanceof FormData ? config.data : new FormData()
    if (!(config.data instanceof FormData)) {
      for (const [key, value] of Object.entries((typeof config.data === 'string' ? JSON.parse(config.data || '{}') : config.data || {}) as Record<string, unknown>)) formValues.append(key, String(value ?? ''))
    }
    const updates: Record<string, unknown> = {}
    for (const [key, column] of Object.entries({ firstName: 'first_name', lastName: 'last_name', phone: 'phone', course: 'course', yearOfStudy: 'year_of_study', campusId: 'campus_id', businessName: 'business_name', registrationNumber: 'registration_number' })) {
      const value = formValues.get(key)
      if (value !== null) updates[column] = value
    }
    const { data, error } = await supabase.from('profiles').update(updates).eq('id', sessionData.session.user.id).select('*').maybeSingle()
    if (error) throw error

    for (const documentType of providerDocumentTypes) {
      for (const file of formValues.getAll(documentType)) {
        if (!(file instanceof File) || file.size === 0) continue
        const pathName = `${sessionData.session.user.id}/company/${documentType}/${crypto.randomUUID()}-${file.name}`
        const { error: uploadError } = await supabase.storage.from('verification-documents').upload(pathName, file, { contentType: file.type, upsert: false })
        if (uploadError) throw uploadError
        const { error: documentError } = await supabase.from('provider_documents').insert({ provider_id: sessionData.session.user.id, document_type: documentType, storage_path: pathName, file_name: file.name, mime_type: file.type })
        if (documentError) throw documentError
      }
    }
    return response({ user: data }, config)
  }

  if ((method === 'post' && (path === '/provider/properties' || path === '/admin/properties')) || (method === 'put' && /^\/.*\/properties\/[^/]+$/.test(path))) {
    const { data: sessionData } = await supabase.auth.getSession()
    if (!sessionData.session) throw new Error('Please sign in again.')
    const formValues = config.data instanceof FormData ? config.data : new FormData()
    if (!(config.data instanceof FormData)) {
      for (const [key, value] of Object.entries((typeof config.data === 'string' ? JSON.parse(config.data || '{}') : config.data || {}) as Record<string, unknown>)) formValues.append(key, String(value ?? ''))
    }
    const value = (key: string) => String(formValues.get(key) || '')

    const campusId = value('campusId') || null
    let universityId: string | null = null
    if (campusId) {
      const { data: campus, error: campusError } = await supabase.from('campuses').select('university_id').eq('id', campusId).single()
      if (campusError) throw campusError
      universityId = campus.university_id
    }
    const existingId = method === 'put' ? path.split('/').at(-1) : null
    let propertyOwnerId = sessionData.session.user.id
    if (existingId) {
      const { data: existingProperty, error: existingPropertyError } = await supabase.from('properties').select('provider_id').eq('id', existingId).single()
      if (existingPropertyError) throw existingPropertyError
      propertyOwnerId = existingProperty.provider_id
    }

    const propertyValues = {
      provider_id: propertyOwnerId,
      university_id: universityId,
      campus_id: campusId,
      name: value('name'),
      address: value('address'),
      suburb: value('suburb'),
      city: value('city'),
      contact_email: value('contactEmail') || null,
      contact_phone: value('contactPhone') || null,
      description: value('description'),
      facilities: value('facilities').split(',').map((item) => item.trim()).filter(Boolean),
      furnished: formValues.get('furnished') === 'true',
      capacity: Number(value('capacity') || 0),
      price: Number(value('price') || 0),
      virtual_tour_url: value('virtualTourUrl') || null,
      nsfas_accredited: formValues.get('nsfasAccredited') === 'true',
      accreditation_expires_at: value('accreditationExpiresAt') || null,
      reverification_due_at: value('reverificationDueAt') || null,
      last_inspection_at: value('lastInspectionAt') || null,
      ...(!existingId ? { status: 'PENDING' } : {}),
    }

    let property
    if (existingId) {
      const { data, error } = await supabase.from('properties').update(propertyValues).eq('id', existingId).select('*').maybeSingle()
      if (error) throw error
      property = data
    } else {
      const { data, error } = await supabase.from('properties').insert(propertyValues).select('*').maybeSingle()
      if (error) throw error
      property = data
    }
    if (!property) throw new Error('Property could not be saved.')

    for (const file of formValues.getAll('photos')) {
      if (!(file instanceof File) || file.size === 0) continue
      const storagePath = `${sessionData.session.user.id}/${property.id}/photos/${crypto.randomUUID()}-${file.name}`
      const { error: uploadError } = await supabase.storage.from('property-media').upload(storagePath, file, { contentType: file.type, upsert: false })
      if (uploadError) throw uploadError
      const { error: mediaError } = await supabase.from('property_media').insert({ property_id: property.id, media_type: 'PHOTO', storage_path: storagePath, file_name: file.name, mime_type: file.type })
      if (mediaError) throw mediaError
    }

    const video = formValues.get('videos')
    if (video instanceof File && video.size > 0) {
      const durationSeconds = await getVideoDuration(video)
      if (durationSeconds < 300) throw new Error('The property video must be at least 5 minutes long.')
      const storagePath = `${sessionData.session.user.id}/${property.id}/videos/${crypto.randomUUID()}-${video.name}`
      const { error: uploadError } = await supabase.storage.from('property-media').upload(storagePath, video, { contentType: video.type, upsert: false })
      if (uploadError) throw uploadError
      const { error: mediaError } = await supabase.from('property_media').insert({
        property_id: property.id, media_type: 'VIDEO', storage_path: storagePath, file_name: video.name,
        mime_type: video.type, duration_seconds: Math.floor(durationSeconds),
      })
      if (mediaError) throw mediaError
    }

    for (const documentType of propertyDocumentTypes) {
      for (const file of formValues.getAll(documentType)) {
        if (!(file instanceof File) || file.size === 0) continue
        const storagePath = `${sessionData.session.user.id}/${property.id}/documents/${documentType}/${crypto.randomUUID()}-${file.name}`
        const { error: uploadError } = await supabase.storage.from('verification-documents').upload(storagePath, file, { contentType: file.type, upsert: false })
        if (uploadError) throw uploadError
        const { error: documentError } = await supabase.from('property_documents').insert({ property_id: property.id, provider_id: sessionData.session.user.id, document_type: documentType, storage_path: storagePath, file_name: file.name, mime_type: file.type })
        if (documentError) throw documentError
      }
    }

    return response({ property, success: true, message: 'Property saved.' }, config)
  }

  if (method === 'post' && path === '/auth/forgot-password') {
    const body = objectData(config)
    const { error } = await supabase.auth.resetPasswordForEmail(String(body.email || ''), {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) throw error
    return response({ success: true }, config)
  }

  if (method === 'post' && path === '/auth/reset-password') {
    const body = objectData(config)
    const { error } = await supabase.auth.updateUser({ password: String(body.password || '') })
    if (error) throw error
    return response({ success: true }, config)
  }

  if (method === 'post' && path === '/system/users') {
    const body = objectData(config)
    const { data, error } = await supabase.functions.invoke('manage-user', {
      body: {
        action: 'invite',
        email: body.email,
        role: body.role,
        universityId: body.universityId,
        firstName: body.firstName,
        lastName: body.lastName,
        phone: body.phone,
      },
    })
    if (error) throw error
    return response(data, config)
  }

  if (method === 'patch' && /^\/applications\/[^/]+\/cancel$/.test(path)) {
    const applicationId = decodeURIComponent(path.split('/')[2])
    const { data, error } = await supabase.from('applications').update({ status: 'CANCELLED' })
      .eq('id', applicationId).select('*').single()
    if (error) throw error
    return response({ application: data }, config)
  }

  if (method === 'patch' && /^\/provider\/applications\/[^/]+$/.test(path)) {
    const applicationId = decodeURIComponent(path.split('/').pop() || '')
    const body = objectData(config)
    const { data, error } = await supabase.from('applications').update({
      status: String(body.status || ''),
      rejection_reason: body.reason ? String(body.reason) : null,
    }).eq('id', applicationId).select('*').single()
    if (error) throw error
    return response({ application: data }, config)
  }

  if (method === 'patch' && /^\/admin\/providers\/[^/]+$/.test(path)) {
    const profileId = decodeURIComponent(path.split('/').pop() || '')
    const body = objectData(config)
    const status = String(body.status || '')
    const updates: Record<string, unknown> = {
      verification_status: status,
      rejection_reason: body.reason ? String(body.reason) : null,
    }
    if (status === 'SUSPENDED') updates.is_active = false
    if (status === 'APPROVED') updates.is_active = true
    const { data, error } = await supabase.from('profiles').update(updates).eq('id', profileId).eq('role', 'PROVIDER').select('*').single()
    if (error) throw error
    return response({ provider: data }, config)
  }

  if (method === 'patch' && /^\/admin\/properties\/[^/]+$/.test(path)) {
    const propertyId = decodeURIComponent(path.split('/').pop() || '')
    const body = objectData(config)
    const status = String(body.status || '')
    const { data, error } = await supabase.from('properties').update({
      status,
      rejection_reason: body.reason ? String(body.reason) : null,
      is_published: status === 'APPROVED',
    }).eq('id', propertyId).select('*').single()
    if (error) throw error
    return response({ property: data }, config)
  }

  if (method === 'patch' && /^\/admin\/complaints\/[^/]+$/.test(path)) {
    const complaintId = decodeURIComponent(path.split('/').pop() || '')
    const body = objectData(config)
    const { data, error } = await supabase.from('complaints').update({
      status: String(body.status || 'RESOLVED'),
      resolution: body.reason ? String(body.reason) : null,
    }).eq('id', complaintId).select('*').single()
    if (error) throw error
    return response({ complaint: data }, config)
  }

  if (method === 'patch' && /^\/system\/users\/[^/]+$/.test(path)) {
    const userId = decodeURIComponent(path.split('/').pop() || '')
    const body = objectData(config)
    const { data, error } = await supabase.functions.invoke('manage-user', {
      body: { action: 'update', userId, role: body.role, isActive: body.isActive },
    })
    if (error) throw error
    return response(data, config)
  }

  if (method === 'patch' && /^\/provider\/rooms\/[^/]+$/.test(path)) {
    const roomId = decodeURIComponent(path.split('/').pop() || '')
    const body = objectData(config)
    const { data, error } = await supabase.from('rooms').update({ status: String(body.availability || body.status || '') })
      .eq('id', roomId).select('*').single()
    if (error) throw error
    return response({ room: data }, config)
  }

  if (method === 'patch' && /^\/notifications\/[^/]+\/read$/.test(path)) {
    const notificationId = decodeURIComponent(path.split('/')[2])
    const { data, error } = await supabase.from('notifications').update({ status: 'READ' }).eq('id', notificationId).select('*').single()
    if (error) throw error
    return response({ notification: data }, config)
  }

  if (method === 'patch' && path === '/notifications/read-all') {
    const userId = await getCurrentUserId()
    const { error } = await supabase.from('notifications').update({ status: 'READ' }).eq('user_id', userId).eq('status', 'UNREAD')
    if (error) throw error
    return response({ success: true }, config)
  }

  if (method === 'patch' && /^\/admin\/review-flags\/[^/]+$/.test(path)) {
    const flagId = decodeURIComponent(path.split('/').pop() || '')
    const body = objectData(config)
    const status = String(body.status || 'RESOLVED')
    const { data, error } = await supabase.from('review_flags').update({
      status,
      resolution: body.resolution ? String(body.resolution) : null,
      resolved_by: await getCurrentUserId(),
    }).eq('id', flagId).select('*').single()
    if (error) throw error
    return response({ flag: data }, config)
  }

  if (method === 'patch' && /^\/admin\/review-flags\/[^/]+\/hide-review$/.test(path)) {
    const flagId = decodeURIComponent(path.split('/')[3])
    const { data: flag, error: flagError } = await supabase.from('review_flags').select('review_id').eq('id', flagId).single()
    if (flagError) throw flagError
    const { error: reviewError } = await supabase.from('reviews').update({ status: 'HIDDEN' }).eq('id', flag.review_id)
    if (reviewError) throw reviewError
    const { data, error } = await supabase.from('review_flags').update({
      status: 'REVIEW_HIDDEN',
      resolved_by: await getCurrentUserId(),
    }).eq('id', flagId).select('*').single()
    if (error) throw error
    return response({ flag: data }, config)
  }

  if (method === 'post' && /^\/system\/settings\/[^/]+$/.test(path)) {
    const settingKey = decodeURIComponent(path.split('/').pop() || '')
    const body = objectData(config)
    const { error } = await supabase.from('system_settings').upsert({
      key: settingKey,
      value: body.value,
      updated_by: await getCurrentUserId(),
      updated_at: new Date().toISOString(),
    })
    if (error) throw error
    return response({ success: true }, config)
  }

  if (method === 'put' && /^\/system\/settings\/[^/]+$/.test(path)) {
    const settingKey = decodeURIComponent(path.split('/').pop() || '')
    const body = objectData(config)
    const { error } = await supabase.from('system_settings').upsert({
      key: settingKey,
      value: body.value,
      updated_by: await getCurrentUserId(),
      updated_at: new Date().toISOString(),
    })
    if (error) throw error
    return response({ success: true }, config)
  }

  if (method === 'delete' && /^\/favourites\/[^/]+$/.test(path)) {
    const propertyId = decodeURIComponent(path.split('/').pop() || '')
    const { error } = await supabase.from('favourites').delete().eq('student_id', await getCurrentUserId()).eq('property_id', propertyId)
    if (error) throw error
    return response({ success: true }, config)
  }

  if (method === 'delete' && /^\/saved-searches\/[^/]+$/.test(path)) {
    const searchId = decodeURIComponent(path.split('/').pop() || '')
    const { error } = await supabase.from('saved_searches').delete().eq('id', searchId).eq('student_id', await getCurrentUserId())
    if (error) throw error
    return response({ success: true }, config)
  }

  if (method === 'delete' && /^\/reviews\/[^/]+$/.test(path)) {
    const reviewId = decodeURIComponent(path.split('/').pop() || '')
    const { error } = await supabase.from('reviews').delete().eq('id', reviewId)
    if (error) throw error
    return response({ success: true }, config)
  }

  throw new Error(`Supabase adapter has no implementation for ${method.toUpperCase()} ${path}`)
}
