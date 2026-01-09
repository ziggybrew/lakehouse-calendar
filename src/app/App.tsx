import { Navigate, Route, Routes } from 'react-router-dom'
import Login from '../pages/Login'
import Calendar from '../pages/Calendar'
import Admin from '../pages/Admin'
import ProtectedRoute from '../components/ProtectedRoute'
import AppShell from '../components/AppShell'

export default function App() {
  const isAuthed = true // TODO: replace with real auth check

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/calendar" replace />} />
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

      <Route path="*" element={<Navigate to="/calendar" replace />} />
    </Routes>
  )
}