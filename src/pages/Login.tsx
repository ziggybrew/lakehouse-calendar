// src/pages/Login.tsx
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const navigate = useNavigate()

  const [showLogin, setShowLogin] = useState(false)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'email' | 'code'>('email')

  const emailIsValid = useMemo(() => {
    const trimmed = email.trim()
    if (!trimmed) return false
    // Simple validation; server-side validation will be enforced when auth is implemented.
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
  }, [email])

  function openLogin() {
    setShowLogin(true)
    setStep('email')
    setCode('')
  }

  function closeLogin() {
    setShowLogin(false)
  }

  function onSubmitEmail(e: React.FormEvent) {
    e.preventDefault()
    if (!emailIsValid) return
    // Temporary stub. When auth is implemented, this will request a one-time code to be emailed.
    setStep('code')
  }

  function onSubmitCode(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim()) return
    // Temporary stub. When auth is implemented, this will verify the code and establish a session.
    navigate('/calendar')
  }

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
              openLogin()
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
      {showLogin && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={closeLogin}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(2px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(420px, 100%)',
              background: '#ffffff',
              color: '#1f2933',
              borderRadius: 14,
              padding: 18,
              boxShadow: '0 16px 40px rgba(0,0,0,0.25)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#2f6f73' }}>Sign in</div>
              <button
                type="button"
                onClick={closeLogin}
                style={{
                  height: 36,
                  width: 36,
                  padding: 0,
                  lineHeight: 0,
                  borderRadius: 10,
                  border: '1px solid #d6e6e3',
                  background: '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#2f6f73',
                }}
                aria-label="Close"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ display: 'block' }}>
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {step === 'email' ? (
              <form onSubmit={onSubmitEmail} style={{ marginTop: 14, display: 'grid', gap: 12 }}>
                <div style={{ fontSize: 13, color: '#1f2933', opacity: 0.85 }}>
                  Email sign-in uses a one-time code. Passwords are not required.
                </div>

                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontSize: 12, color: '#1f2933', opacity: 0.8 }}>Email</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    autoComplete="email"
                    style={{
                      height: 40,
                      borderRadius: 12,
                      border: '1px solid #d6e6e3',
                      padding: '0 12px',
                      fontSize: 14,
                      outline: 'none',
                    }}
                  />
                </label>

                <button
                  type="submit"
                  disabled={!emailIsValid}
                  style={{
                    height: 42,
                    borderRadius: 12,
                    border: '1px solid #2f6f73',
                    background: emailIsValid ? '#2f6f73' : 'rgba(47, 111, 115, 0.4)',
                    color: '#ffffff',
                    fontWeight: 800,
                    cursor: emailIsValid ? 'pointer' : 'not-allowed',
                  }}
                >
                  Send code
                </button>
              </form>
            ) : (
              <form onSubmit={onSubmitCode} style={{ marginTop: 14, display: 'grid', gap: 12 }}>
                <div style={{ fontSize: 13, color: '#1f2933', opacity: 0.85 }}>
                  Enter the code sent to <strong>{email.trim()}</strong>.
                </div>

                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontSize: 12, color: '#1f2933', opacity: 0.8 }}>One-time code</span>
                  <input
                    inputMode="numeric"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="123456"
                    style={{
                      height: 40,
                      borderRadius: 12,
                      border: '1px solid #d6e6e3',
                      padding: '0 12px',
                      fontSize: 14,
                      outline: 'none',
                      letterSpacing: 2,
                    }}
                  />
                </label>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setStep('email')
                      setCode('')
                    }}
                    style={{
                      flex: 1,
                      height: 42,
                      borderRadius: 12,
                      border: '1px solid #d6e6e3',
                      background: '#ffffff',
                      color: '#2f6f73',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    Back
                  </button>

                  <button
                    type="submit"
                    disabled={!code.trim()}
                    style={{
                      flex: 1,
                      height: 42,
                      borderRadius: 12,
                      border: '1px solid #2f6f73',
                      background: code.trim() ? '#2f6f73' : 'rgba(47, 111, 115, 0.4)',
                      color: '#ffffff',
                      fontWeight: 800,
                      cursor: code.trim() ? 'pointer' : 'not-allowed',
                    }}
                  >
                    Sign in
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
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