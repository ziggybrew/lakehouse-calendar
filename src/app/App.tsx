import { Navigate, Route, Routes } from 'react-router-dom'
import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import Login from '../pages/Login'
import UserProfile from '../pages/UserProfile'
import Calendar from '../pages/Calendar'
import Admin from '../pages/Admin'
import PendingApproval from '../pages/PendingApproval'
import ProtectedRoute from '../components/ProtectedRoute'
import AppShell from '../components/AppShell'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [profileReady, setProfileReady] = useState(false)
  const [isActive, setIsActive] = useState<boolean | null>(null)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null)
      setAuthReady(true)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })

    return () => {
      data.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!session) {
      setProfileReady(true)
      setIsActive(null)
      setIsAdmin(null)
      return
    }

    let cancelled = false
    setProfileReady(false)

    ;(async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_active, role')
        .eq('id', session.user.id)
        .maybeSingle()

      if (cancelled) return

      if (error || !data) {
        // Default to inactive/non-admin until the profile exists and is approved.
        setIsActive(false)
        setIsAdmin(false)
        setProfileReady(true)
        return
      }

      setIsActive(!!data.is_active)
      setIsAdmin(data.role === 'admin')
      setProfileReady(true)
    })()

    return () => {
      cancelled = true
    }
  }, [session])

  const isAuthed = !!session

  if (!authReady) return null
  if (isAuthed && !profileReady) return null

  return (
    <Routes>
      <Route path="/" element={<Navigate to={isAuthed ? '/calendar' : '/login'} replace />} />
      <Route path="/login" element={<Login />} />

      <Route
        path="/pending-approval"
        element={
          <ProtectedRoute isAuthed={isAuthed}>
            <PendingApproval />
          </ProtectedRoute>
        }
      />

      <Route
        element={
          <ProtectedRoute isAuthed={isAuthed} isActive={isActive ?? false}>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/profile" element={<UserProfile />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute
              isAuthed={isAuthed}
              isActive={isActive ?? false}
              requireAdmin
              isAdmin={isAdmin ?? false}
            >
              <Admin />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to={isAuthed ? '/calendar' : '/login'} replace />} />
    </Routes>
  )
}