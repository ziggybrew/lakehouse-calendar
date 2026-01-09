import { Navigate, Route, Routes } from 'react-router-dom'
import Login from '../pages/Login'
import Calendar from '../pages/Calendar'
import Admin from '../pages/Admin'
import ProtectedRoute from '../components/ProtectedRoute'

export default function App() {
  const isAuthed = false // temporary; we’ll replace this when we add real auth

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/calendar" replace />} />
      <Route path="/login" element={<Login />} />

      <Route
        path="/calendar"
        element={
          <ProtectedRoute isAuthed={isAuthed}>
            <Calendar />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute isAuthed={isAuthed}>
            <Admin />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/calendar" replace />} />
    </Routes>
  )
}