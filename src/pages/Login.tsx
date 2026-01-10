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
        {/* Title */}
        <div
        style={{
            position: 'absolute',
            top: '7%',
            left: '10%',
            color: '#ffffff',
            fontSize: 44,
            fontWeight: 400,
            letterSpacing: 0.5,
            fontFamily:
            '"Allura", "Dancing Script", "Pacifico", "Segoe Script", cursive',
            textShadow: '0 2px 6px rgba(0, 0, 0, 0.45)',
            transform: 'rotate(-1deg)',
            userSelect: 'none',
            pointerEvents: 'none',
        }}
        >
        Lakehouse Calendar
        </div>
      {/* Button group */}
      <div
        style={{
          position: 'absolute',
          left: '15%',
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
  color: '#FFFFFF',
  fontWeight: 700,
  fontSize: 14,
  cursor: 'pointer',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  letterSpacing: 0.2,
  textShadow: '0 .5px .5px rgba(0, 0, 0, 0.45)',
}

const primaryBtn: React.CSSProperties = {
  ...baseBtn,
  background: 'rgba(17, 24, 39, 0.80)',
}

const ghostBtn: React.CSSProperties = {
  ...baseBtn,
  background: 'rgba(255, 255, 255, 0.14)',
  border: '1px solid rgba(255, 255, 255, 0.28)',
}