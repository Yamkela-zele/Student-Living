import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { Loader } from '../components/common/Common'
import { DashboardLayout, PublicLayout } from '../components/layout/Layout'
import { useAuth } from '../hooks/useAuth'
import type { Role } from '../types'
import { About, Accommodation, Contact, Home, NotFound, PropertyDetails } from '../pages/public/PublicPages'
import { Login, PasswordPage, Register } from '../pages/auth/AuthPages'
import { Browse, DashboardHome, Notifications, Profile, PropertyForm, PropertyReverification, ProviderReviews, ResourceDetail, ResourcePage, ReviewModerationQueue, SavedSearches } from '../pages/dashboard/DashboardPages'

function ProtectedRoute() {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen grid place-items-center"><Loader label="Loading account" /></div>
  return user ? <Outlet /> : <Navigate to="/login" replace />
}
function RoleRoute({ roles }: { roles: Role[] }) {
  const { user } = useAuth()
  return user && roles.includes(user.role) ? <Outlet /> : <Navigate to="/dashboard" replace />
}

const studentPages = ['my-applications', 'my-bookings', 'favourites', 'my-reviews']
const providerPages = ['properties', 'verification', 'rooms', 'applications', 'tenants', 'bookings']
const universityPages = ['students', 'providers', 'verify-properties', 'monitor-applications', 'complaints', 'reports']
const systemPages = ['users', 'roles', 'universities', 'all-properties', 'audit-logs', 'settings']
function resourceRoutes(paths: string[]) {
  return paths.map((path) => <Route key={path} path={`dashboard/${path}`} element={<ResourcePage />} />)
}

export default function AppRoutes() {
  return <Routes>
    <Route element={<PublicLayout />}><Route index element={<Home />} /><Route path="accommodation" element={<Accommodation />} /><Route path="properties/:id" element={<PropertyDetails />} /><Route path="about" element={<About />} /><Route path="contact" element={<Contact />} /></Route>
    <Route path="login" element={<Login />} /><Route path="register/student" element={<Register kind="student" />} /><Route path="register/provider" element={<Register kind="provider" />} /><Route path="forgot-password" element={<PasswordPage />} /><Route path="reset-password" element={<PasswordPage reset />} />
    <Route element={<ProtectedRoute />}><Route element={<DashboardLayout />}>
      <Route path="dashboard" element={<DashboardHome />} /><Route path="dashboard/profile" element={<Profile />} /><Route path="dashboard/notifications" element={<Notifications />} />
      <Route element={<RoleRoute roles={['PROVIDER']} />}><Route path="dashboard/provider-profile" element={<Profile provider />} /></Route>
      <Route path="dashboard/property/:id" element={<PropertyDetails />} />
      <Route element={<RoleRoute roles={['PROVIDER', 'UNIVERSITY_ADMIN', 'SYSTEM_ADMIN']} />}><Route path="dashboard/properties/:id" element={<ResourceDetail />} /></Route>
      <Route element={<RoleRoute roles={['STUDENT']} />}><Route path="dashboard/applications/:id" element={<ResourceDetail />} /></Route>
      <Route element={<RoleRoute roles={['SYSTEM_ADMIN']} />}><Route path="dashboard/universities/:id" element={<ResourceDetail />} /></Route>
      <Route element={<RoleRoute roles={['STUDENT']} />}><Route path="dashboard/browse" element={<Browse />} /><Route path="dashboard/saved-searches" element={<SavedSearches />} />{resourceRoutes(studentPages)}</Route>
      <Route element={<RoleRoute roles={['PROVIDER']} />}>{resourceRoutes(providerPages)}</Route>
      <Route element={<RoleRoute roles={['PROVIDER']} />}><Route path="dashboard/reviews" element={<ProviderReviews />} /></Route>
      <Route element={<RoleRoute roles={['UNIVERSITY_ADMIN', 'SYSTEM_ADMIN']} />}><Route path="dashboard/reverification" element={<PropertyReverification />} /><Route path="dashboard/review-moderation" element={<ReviewModerationQueue />} /></Route>
      <Route element={<RoleRoute roles={['PROVIDER', 'SYSTEM_ADMIN']} />}><Route path="dashboard/properties/new" element={<PropertyForm />} /><Route path="dashboard/properties/:id/edit" element={<PropertyForm />} /></Route>
      <Route element={<RoleRoute roles={['UNIVERSITY_ADMIN']} />}>{resourceRoutes(universityPages)}</Route>
      <Route element={<RoleRoute roles={['SYSTEM_ADMIN']} />}>{resourceRoutes(systemPages)}</Route>
    </Route></Route>
    <Route path="*" element={<NotFound />} />
  </Routes>
}
