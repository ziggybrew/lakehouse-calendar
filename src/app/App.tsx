import { Navigate, Route, Routes } from 'react-router-dom'
import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import Login from '../pages/Login'
import UserProfile from '../pages/UserProfile'
import Calendar from '../pages/Calendar'
import Admin from '../pages/Admin'
import PendingApproval from '../pages/PendingApproval'
import Dashboard from '../pages/Dashboard'
import ProtectedRoute from '../components/ProtectedRoute'
import AppShell from '../components/AppShell'
import { DEMO_AUTH_EVENT, isDemoMode } from '../lib/demoMode'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [profileReady, setProfileReady] = useState(false)
  const [isActive, setIsActive] = useState<boolean | null>(null)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [demo, setDemo] = useState(() => isDemoMode())

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
    function syncDemoMode() {
      setDemo(isDemoMode())
    }

    window.addEventListener(DEMO_AUTH_EVENT, syncDemoMode)
    window.addEventListener('storage', syncDemoMode)
    return () => {
      window.removeEventListener(DEMO_AUTH_EVENT, syncDemoMode)
      window.removeEventListener('storage', syncDemoMode)
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

  const isAuthed = !!session || demo
  const activeForRoutes = demo ? true : isActive ?? false
  const adminForRoutes = demo ? true : isAdmin ?? false

  if (!authReady) return null
  if (!!session && !profileReady) return null

  return (
    <Routes>
      <Route path="/" element={<Navigate to={isAuthed ? '/dashboard' : '/login'} replace />} />
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
          <ProtectedRoute isAuthed={isAuthed} isActive={activeForRoutes}>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/profile" element={<UserProfile />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute
              isAuthed={isAuthed}
              isActive={activeForRoutes}
              requireAdmin
              isAdmin={adminForRoutes}
            >
              <Admin />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to={isAuthed ? '/dashboard' : '/login'} replace />} />
    </Routes>
  )
}
