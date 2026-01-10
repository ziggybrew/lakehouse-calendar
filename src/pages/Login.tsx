// src/pages/Login.tsx
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const navigate = useNavigate()

  return (
    <div
      style={{
        height: '100dvh',
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Button group */}
      <div
        style={{
          position: 'absolute',
          left: '20%',
          bottom: '9%',
          width: 'min(320px, 70vw)',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 10,
          }}
        >
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
    </div>
  )
}

const baseBtn: React.CSSProperties = {
  width: '100%',
  padding: '12px 12px',
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.22)',
  color: '#ffffff',
  fontWeight: 700,
  fontSize: 14,
  cursor: 'pointer',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  letterSpacing: 0.2,
}

const primaryBtn: React.CSSProperties = {
  ...baseBtn,
  background: 'rgba(17, 24, 39, 0.80)',
}

const ghostBtn: React.CSSProperties = {
  ...baseBtn,
  background: 'rgba(0, 0, 0, 0.25)',
}