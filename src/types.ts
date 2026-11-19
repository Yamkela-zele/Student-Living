export type Role = 'STUDENT' | 'PROVIDER' | 'UNIVERSITY_ADMIN' | 'SYSTEM_ADMIN'
export type User = {
  id: string
  firstName?: string
  lastName?: string
  name?: string
  email: string
  phone?: string
  role: Role
  [key: string]: unknown
}
export type Entity = { id: string; [key: string]: any }
export type Property = Entity & {
  name: string
  suburb?: string
  city?: string
  furnished?: boolean
  avgRating?: number
  images?: Array<string | { url?: string }>
  roomTypes?: string[]
  minPrice?: number
  availableRooms?: number
  capacity?: number
  description?: string
  address?: string
  facilities?: string[]
  rooms?: Entity[]
  reviews?: Entity[]
  verificationStatus?: string
  safetyCertificates?: Array<{ type: string; status?: string; issuer?: string; expiresAt?: string }>
  inspectionReports?: Array<{ title: string; inspectedAt?: string; status?: string }>
  accreditation?: { name: string; status?: string; expiresAt?: string }
  lastVerifiedAt?: string
  reverificationDueAt?: string
  virtualTourUrl?: string
  distanceToCampusKm?: number
  walkingMinutes?: number
  transportMinutes?: number
}
