// src/pages/Login.tsx
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const navigate = useNavigate()

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 16,
      }}
    >
      <div style={{ width: 'min(360px, 100%)', display: 'grid', gap: 12 }}>
        <button
          type="button"
          onClick={() => {
            alert('Login flow not implemented yet.')
          }}
          style={primaryBtn}
        >
          Login
        </button>

        <button
          type="button"
          onClick={() => {
            navigate('/calendar')
          }}
          style={ghostBtn}
        >
          Guest Login
        </button>
      </div>
    </div>
  )
}

const primaryBtn: React.CSSProperties = {
  width: '100%',
  padding: '14px 16px',
  borderRadius: 14,
  border: '1px solid rgba(255,255,255,0.18)',
  background: 'rgba(17, 24, 39, 0.78)',
  color: '#ffffff',
  fontWeight: 750,
  fontSize: 16,
  cursor: 'pointer',
  backdropFilter: 'blur(10px)',
}

const ghostBtn: React.CSSProperties = {
  width: '100%',
  padding: '14px 16px',
  borderRadius: 14,
  border: '1px solid rgba(255,255,255,0.28)',
  background: 'rgba(255, 255, 255, 0.14)',
  color: '#ffffff',
  fontWeight: 750,
  fontSize: 16,
  cursor: 'pointer',
  backdropFilter: 'blur(10px)',
}