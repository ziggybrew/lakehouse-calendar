// src/pages/Login.tsx
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function Login() {
  const navigate = useNavigate()

  const [isWide, setIsWide] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 641px)')
    const update = () => setIsWide(mq.matches)
    update()

    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', update)
      return () => mq.removeEventListener('change', update)
    }

    // Safari fallback
    mq.addListener(update)
    return () => mq.removeListener(update)
  }, [])

  const [showLogin, setShowLogin] = useState(false)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')

  const [regEmail, setRegEmail] = useState('')
  const [regFirstName, setRegFirstName] = useState('')
  const [regLastName, setRegLastName] = useState('')
  const [regPhone, setRegPhone] = useState('')
  const [regInviteCode, setRegInviteCode] = useState('')
  const [regSubmitted, setRegSubmitted] = useState(false)

  const [isSending, setIsSending] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isRegistering, setIsRegistering] = useState(false)

  const emailIsValid = useMemo(() => {
    const trimmed = email.trim()
    if (!trimmed) return false
    // Simple validation; server-side validation will be enforced when auth is implemented.
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
  }, [email])

  function openLogin() {
    setErrorMsg(null)
    setIsSending(false)
    setIsVerifying(false)
    setIsRegistering(false)
    setAuthMode('login')
    setShowLogin(true)
    // Keep current login step/email so users can return to enter the code without re-entering details.
  }

  function openRegister() {
    setErrorMsg(null)
    setIsSending(false)
    setIsVerifying(false)
    setIsRegistering(false)
    setAuthMode('register')
    setRegSubmitted(false)
    setShowLogin(true)
  }
  function regEmailIsValid(value: string) {
    const trimmed = value.trim()
    if (!trimmed) return false
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
  }

  function toFriendlyAuthError(message: string) {
    const m = (message || '').toLowerCase()

    if (m.includes('rate limit')) {
      return 'Too many attempts. Please wait a moment and try again.'
    }
    if (m.includes('invalid') && (m.includes('token') || m.includes('otp') || m.includes('code'))) {
      return 'That code did not work. Try again or request a new code.'
    }
    if (m.includes('expired') && (m.includes('token') || m.includes('otp') || m.includes('code'))) {
      return 'That code has expired. Request a new code and try again.'
    }
    if (m.includes('user not found')) {
      return 'Sign-in is not available for this email. Request access first.'
    }
    if (m.includes('signups not allowed') || m.includes('signup') && m.includes('disabled')) {
      return 'Sign-in is not available for this email. Request access first.'
    }

    return 'Something went wrong. Please try again.'
  }

  async function onSubmitRegister(e: FormEvent) {
    e.preventDefault()
    setErrorMsg(null)

    const emailOk = regEmailIsValid(regEmail)
    const firstOk = regFirstName.trim().length > 0
    const lastOk = regLastName.trim().length > 0

    if (!emailOk || !firstOk || !lastOk) {
      setErrorMsg('Please enter email, first name, and last name.')
      return
    }

    setIsRegistering(true)
    try {
      const payload = {
        email: regEmail.trim().toLowerCase(),
        first_name: regFirstName.trim(),
        last_name: regLastName.trim(),
        phone: regPhone.trim() ? regPhone.trim() : null,
        invite_code: regInviteCode.trim() ? regInviteCode.trim() : null,
        // status defaults to 'pending' in the database
      }

      const { error } = await supabase.from('access_requests').insert(payload)

      if (error) {
        // 23505 = unique_violation (likely a pending request already exists for this email)
        if ((error as any).code === '23505') {
          setErrorMsg('An access request already exists for this email. An admin will review it soon.')
          setRegSubmitted(true)
          return
        }

        setErrorMsg('Unable to submit the request. Please try again.')
        return
      }

      setRegSubmitted(true)
    } finally {
      setIsRegistering(false)
    }
  }

  function closeLogin() {
    setErrorMsg(null)
    setIsSending(false)
    setIsVerifying(false)
    setIsRegistering(false)
    setShowLogin(false)
  }

  async function onSubmitEmail(e: FormEvent) {
    e.preventDefault()
    setErrorMsg(null)
    if (!emailIsValid) return

    setIsSending(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: false,
        },
      })

      if (error) {
        setErrorMsg(toFriendlyAuthError(error.message))
        return
      }

      setStep('code')
      setCode('')
    } finally {
      setIsSending(false)
    }
  }

  async function onSubmitCode(e: FormEvent) {
    e.preventDefault()
    setErrorMsg(null)

    const token = code.trim()
    const trimmedEmail = email.trim()
    if (!trimmedEmail || !token) return

    setIsVerifying(true)
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: trimmedEmail,
        token,
        type: 'email',
      })

      if (error) {
        setErrorMsg(toFriendlyAuthError(error.message))
        return
      }

      if (data.session) {
        closeLogin()
        navigate('/calendar')
      } else {
        setErrorMsg('Sign-in could not be completed. Request a new code and try again.')
      }
    } finally {
      setIsVerifying(false)
    }
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
          top: isWide ? '6%' : '7%',
          left: isWide ? '50%' : '10%',
          color: '#ffffff',
          fontSize: isWide ? 56 : 44,
          fontWeight: 400,
          letterSpacing: 0.5,
          fontFamily: '"Allura", "Dancing Script", "Pacifico", "Segoe Script", cursive',
          textShadow: '0 2px 6px rgba(0, 0, 0, 0.45)',
          transform: isWide ? 'translateX(-50%) rotate(-1deg)' : 'rotate(-1deg)',
          userSelect: 'none',
          pointerEvents: 'none',
          textAlign: isWide ? 'center' : 'left',
          whiteSpace: 'nowrap',
        }}
        >
        Lakehouse Calendar
        </div>
      {/* Button group */}
      <div
        style={{
          position: 'absolute',
          left: isWide ? '50%' : '15%',
          bottom: isWide ? '10%' : '9%',
          transform: isWide ? 'translateX(-50%)' : undefined,
          width: isWide ? 'min(520px, 60vw)' : 'min(320px, 70vw)',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: isWide ? 14 : 10,
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
              openRegister()
            }}
            style={ghostBtn}
          >
            Register
          </button>
        </div>
      </div>
      {showLogin && (
        <div
          role="region"
          aria-label={authMode === 'login' ? 'Sign in' : 'Register'}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 520,
              margin: '0 auto',
              background: '#ffffff',
              color: '#1f2933',
              borderRadius: 14,
              padding: 18,
              boxShadow: '0 16px 40px rgba(0,0,0,0.25)',
              border: '1px solid rgba(214, 230, 227, 0.9)',
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 800, color: '#2f6f73' }}>
                {authMode === 'login' ? 'Sign in' : 'Register'}
              </div>

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
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                  style={{ display: 'block' }}
                >
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            {errorMsg ? (
              <div
                style={{
                  marginTop: 10,
                  padding: '10px 12px',
                  borderRadius: 12,
                  border: '1px solid rgba(154, 79, 79, 0.35)',
                  background: 'rgba(154, 79, 79, 0.08)',
                  color: '#9a4f4f',
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {errorMsg}
              </div>
            ) : null}

            {authMode === 'login' ? (
              step === 'email' ? (
                <form onSubmit={onSubmitEmail} style={{ marginTop: 14, display: 'grid', gap: 12 }}>
                  <div style={{ fontSize: 13, color: '#1f2933', opacity: 0.85 }}>
                    Enter the email address associated with an approved account to receive a one-time code.
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
                    disabled={!emailIsValid || isSending}
                    style={{
                      height: 42,
                      borderRadius: 12,
                      border: '1px solid #2f6f73',
                      background: emailIsValid && !isSending ? '#2f6f73' : 'rgba(47, 111, 115, 0.4)',
                      color: '#ffffff',
                      fontWeight: 800,
                      cursor: emailIsValid && !isSending ? 'pointer' : 'not-allowed',
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
                      autoComplete="one-time-code"
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
                        setErrorMsg(null)
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
                      Change email
                    </button>

                    <button
                      type="submit"
                      disabled={!code.trim() || isVerifying}
                      style={{
                        flex: 1,
                        height: 42,
                        borderRadius: 12,
                        border: '1px solid #2f6f73',
                        background: code.trim() && !isVerifying ? '#2f6f73' : 'rgba(47, 111, 115, 0.4)',
                        color: '#ffffff',
                        fontWeight: 800,
                        cursor: code.trim() && !isVerifying ? 'pointer' : 'not-allowed',
                      }}
                    >
                      Sign in
                    </button>
                  </div>

                  <div style={{ marginTop: 2, fontSize: 12, opacity: 0.75 }}>
                    Code not received? Use “Change email” and click “Send code” again.
                  </div>
                </form>
              )
            ) : (
              <div style={{ marginTop: 14 }}>
                {!regSubmitted ? (
                  <form onSubmit={onSubmitRegister} style={{ display: 'grid', gap: 12 }}>
                    <div style={{ fontSize: 13, color: '#1f2933', opacity: 0.85 }}>
                      Registration requests require admin approval before sign-in is allowed.
                    </div>

                    <label style={{ display: 'grid', gap: 6 }}>
                      <span style={{ fontSize: 12, color: '#1f2933', opacity: 0.8 }}>Email</span>
                      <input
                        type="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
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

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        columnGap: 12,
                        rowGap: 12,
                        width: '100%',
                        boxSizing: 'border-box',
                      }}
                    >
                      <label style={{ display: 'grid', gap: 6 }}>
                        <span style={{ fontSize: 12, color: '#1f2933', opacity: 0.8 }}>First name</span>
                        <input
                          type="text"
                          value={regFirstName}
                          onChange={(e) => setRegFirstName(e.target.value)}
                          placeholder="First"
                          autoComplete="given-name"
                          style={{
                            height: 40,
                            borderRadius: 12,
                            border: '1px solid #d6e6e3',
                            padding: '0 12px',
                            fontSize: 14,
                            outline: 'none',
                            width: '100%',
                            boxSizing: 'border-box',
                          }}
                        />
                      </label>

                      <label style={{ display: 'grid', gap: 6 }}>
                        <span style={{ fontSize: 12, color: '#1f2933', opacity: 0.8 }}>Last name</span>
                        <input
                          type="text"
                          value={regLastName}
                          onChange={(e) => setRegLastName(e.target.value)}
                          placeholder="Last"
                          autoComplete="family-name"
                          style={{
                            height: 40,
                            borderRadius: 12,
                            border: '1px solid #d6e6e3',
                            padding: '0 12px',
                            fontSize: 14,
                            outline: 'none',
                            width: '100%',
                            boxSizing: 'border-box',
                          }}
                        />
                      </label>
                    </div>

                    <label style={{ display: 'grid', gap: 6 }}>
                      <span style={{ fontSize: 12, color: '#1f2933', opacity: 0.8 }}>
                        Phone (optional)
                      </span>
                      <input
                        type="tel"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        placeholder="(555) 555-5555"
                        autoComplete="tel"
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

                    <label style={{ display: 'grid', gap: 6 }}>
                      <span style={{ fontSize: 12, color: '#1f2933', opacity: 0.8 }}>
                        Invite code (optional)
                      </span>
                      <input
                        type="text"
                        value={regInviteCode}
                        onChange={(e) => setRegInviteCode(e.target.value)}
                        placeholder="Provided by admin"
                        autoComplete="off"
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
                      disabled={isRegistering}
                      style={{
                        height: 42,
                        borderRadius: 12,
                        border: '1px solid #2f6f73',
                        background: isRegistering ? 'rgba(47, 111, 115, 0.7)' : '#2f6f73',
                        color: '#ffffff',
                        fontWeight: 800,
                        cursor: isRegistering ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {isRegistering ? 'Submitting...' : 'Request access'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setErrorMsg(null)
                        setAuthMode('login')
                      }}
                      style={{
                        height: 42,
                        borderRadius: 12,
                        border: '1px solid #d6e6e3',
                        background: '#ffffff',
                        color: '#2f6f73',
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      Back to sign in
                    </button>
                  </form>
                ) : (
                  <div style={{ display: 'grid', gap: 10 }}>
                    <div style={{ fontSize: 14, fontWeight: 900, color: '#2f6f73' }}>
                      Request submitted
                    </div>
                    <div style={{ fontSize: 13, opacity: 0.85 }}>
                      Access requires admin approval. Sign-in will work after the account is activated.
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setErrorMsg(null)
                        setAuthMode('login')
                      }}
                      style={{
                        height: 42,
                        borderRadius: 12,
                        border: '1px solid #2f6f73',
                        background: '#2f6f73',
                        color: '#ffffff',
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      Return to sign in
                    </button>
                  </div>
                )}
              </div>
            )}

            <div
              style={{
                marginTop: 14,
                paddingTop: 12,
                borderTop: '1px solid #d6e6e3',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                flexWrap: 'wrap',
                fontSize: 12,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  closeLogin()
                  navigate('/calendar?mode=demo')
                }}
                style={{
                  border: 'none',
                  background: 'transparent',
                  padding: 0,
                  color: '#2f6f73',
                  fontWeight: 800,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                View demo
              </button>

              {authMode === 'login' ? (
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg(null)
                    setAuthMode('register')
                    setRegSubmitted(false)
                  }}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    padding: 0,
                    color: '#2f6f73',
                    fontWeight: 800,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Need access? Register
                </button>
              ) : null}
            </div>
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