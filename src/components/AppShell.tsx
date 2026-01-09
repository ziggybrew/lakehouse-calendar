import { Link, Outlet } from 'react-router-dom'

export default function AppShell() {
  return (
    <div>
      <header
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <strong>Lakehouse Calendar</strong>

          <nav style={{ display: 'flex', gap: 12 }}>
            <Link to="/calendar">Calendar</Link>
            <Link to="/admin">Admin</Link>
          </nav>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, opacity: 0.7 }}>Not signed in</span>
          <Link to="/login">Login</Link>
        </div>
      </header>

      <main style={{ padding: 16 }}>
        <Outlet />
      </main>
    </div>
  )
}