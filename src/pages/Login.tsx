import { useLocation, useNavigate } from 'react-router-dom'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/calendar'

  return (
    <div style={{ padding: 24 }}>
      <h1>Login</h1>
      <p>Auth not wired yet — this is a placeholder.</p>

      <button
        onClick={() => {
          // Temporary: just navigate. We’ll replace with real login.
          navigate(from, { replace: true })
        }}
      >
        Continue (temporary)
      </button>
    </div>
  )
}