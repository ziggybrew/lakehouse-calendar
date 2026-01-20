// src/pages/PendingApproval.tsx
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function PendingApproval() {
  const navigate = useNavigate()

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        padding: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: 'min(520px, 100%)',
          background: '#ffffff',
          color: '#1f2933',
          borderRadius: 14,
          padding: 18,
          boxShadow: '0 16px 40px rgba(0,0,0,0.25)',
          border: '1px solid rgba(214, 230, 227, 0.9)',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 900, color: '#2f6f73' }}>Pending approval</div>

        <div style={{ marginTop: 10, fontSize: 14, lineHeight: 1.45, opacity: 0.9 }}>
          Access is not active yet. An admin needs to approve this account before the calendar is available.
        </div>

        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={handleLogout}
            style={{
              height: 42,
              padding: '0 14px',
              borderRadius: 12,
              border: '1px solid #2f6f73',
              background: '#2f6f73',
              color: '#ffffff',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  )
}