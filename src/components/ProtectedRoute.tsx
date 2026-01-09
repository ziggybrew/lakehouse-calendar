import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

type Props = {
  isAuthed: boolean
  children: ReactNode
}

export default function ProtectedRoute({ isAuthed, children }: Props) {
  const location = useLocation()

  if (!isAuthed) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}