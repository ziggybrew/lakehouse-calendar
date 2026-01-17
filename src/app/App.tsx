import { Navigate, Route, Routes } from 'react-router-dom'
import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import Login from '../pages/Login'
import Calendar from '../pages/Calendar'
import Admin from '../pages/Admin'
import ProtectedRoute from '../components/ProtectedRoute'
import AppShell from '../components/AppShell'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(false)

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

  const isAuthed = !!session

  if (!authReady) return null

  return (
    <Routes>
      <Route path="/" element={<Navigate to={isAuthed ? '/calendar' : '/login'} replace />} />
      <Route path="/login" element={<Login />} />

      <Route
        element={
          <ProtectedRoute isAuthed={isAuthed}>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/admin" element={<Admin />} />
      </Route>

      <Route path="*" element={<Navigate to={isAuthed ? '/calendar' : '/login'} replace />} />
    </Routes>
  )
}