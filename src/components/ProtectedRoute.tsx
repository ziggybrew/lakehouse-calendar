import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

type Props = {
  isAuthed: boolean
  isActive?: boolean
  isAdmin?: boolean
  requireAdmin?: boolean
  children: ReactNode
}

export default function ProtectedRoute({
  isAuthed,
  isActive,
  isAdmin,
  requireAdmin,
  children,
}: Props) {
  const location = useLocation()

  if (!isAuthed) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  // Signed in, but not approved/activated yet
  if (isActive === false) {
    return <Navigate to="/pending-approval" replace state={{ from: location.pathname }} />
  }

  // Optional admin-only gate
  if (requireAdmin && isAdmin === false) {
    return <Navigate to="/calendar" replace />
  }

  return <>{children}</>
}