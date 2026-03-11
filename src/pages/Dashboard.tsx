import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'

type ProfileRow = {
  first_name?: string | null
  last_name?: string | null
}

type BookingRow = {
  id: string
  label: string
  start_date: string
  end_date: string
  notes: string | null
  is_blocked: boolean
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [bookings, setBookings] = useState<BookingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const greetingName = useMemo(() => {
    const first = (profile?.first_name || '').trim()
    const last = (profile?.last_name || '').trim()
    const name = [first, last].filter(Boolean).join(' ').trim()
    return name || session?.user?.email || 'Member'
  }, [profile, session])

  useEffect(() => {
    let alive = true

    async function load() {
      setLoading(true)
      setErrorMsg(null)

      const { data } = await supabase.auth.getSession()
      if (!alive) return

      const activeSession = data.session ?? null
      setSession(activeSession)

      if (!activeSession?.user) {
        setProfile(null)
        setBookings([])
        setLoading(false)
        return
      }

      const [profileResult, bookingsResult] = await Promise.all([
        supabase.from('profiles').select('first_name, last_name').eq('id', activeSession.user.id).single(),
        supabase
          .from('bookings')
          .select('id,label,start_date,end_date,notes,is_blocked')
          .eq('created_by', activeSession.user.id)
          .gte('end_date', todayYmd())
          .order('start_date', { ascending: true }),
      ])

      if (!alive) return

      if (profileResult.error) {
        setErrorMsg('Unable to load your profile details.')
        setProfile(null)
      } else {
        setProfile(profileResult.data ?? null)
      }

      if (bookingsResult.error) {
        setErrorMsg('Unable to load upcoming bookings.')
        setBookings([])
      } else {
        setBookings((bookingsResult.data || []) as BookingRow[])
      }

      setLoading(false)
    }

    load()

    return () => {
      alive = false
    }
  }, [])

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <div style={styles.kicker}>Dashboard</div>
          <h1 style={styles.title}>Welcome back, {greetingName}</h1>
          <div style={styles.subtle}>Keep track of your upcoming stays and plan a new booking.</div>
        </div>
        <div style={styles.heroCard}>
          <div style={styles.heroLabel}>Next step</div>
          <div style={styles.heroTitle}>Ready to book the lakehouse?</div>
          <div style={styles.heroActions}>
            <button type="button" style={styles.primaryBtn} onClick={() => navigate('/calendar', { state: { openBooking: true } })}>
              Book now
            </button>
            <button type="button" style={styles.ghostBtn} onClick={() => navigate('/calendar')}>
              View calendar
            </button>
          </div>
        </div>
      </div>

      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Upcoming bookings</h2>
          <button type="button" style={styles.linkBtn} onClick={() => navigate('/calendar')}>
            See full calendar
          </button>
        </div>

        {loading ? (
          <div style={styles.card}>Loading your bookings…</div>
        ) : errorMsg ? (
          <div style={styles.card}>{errorMsg}</div>
        ) : bookings.length === 0 ? (
          <div style={styles.card}>No upcoming bookings yet. Reserve your next stay.</div>
        ) : (
          <div style={styles.bookingList}>
            {bookings.slice(0, 5).map((booking) => (
              <div key={booking.id} style={styles.bookingCard}>
                <div style={styles.bookingHeader}>
                  <div style={styles.bookingTitle}>{booking.label}</div>
                  {booking.is_blocked ? <span style={styles.blockedPill}>Blocked</span> : null}
                </div>
                <div style={styles.bookingMeta}>{formatRange(booking.start_date, booking.end_date)}</div>
                {booking.notes ? <div style={styles.bookingNotes}>{booking.notes}</div> : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function todayYmd() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function ymdToDate(ymd: string) {
  const [year, month, day] = ymd.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function formatRange(startYmd: string, endExclusiveYmd: string) {
  const startDate = ymdToDate(startYmd)
  const endInclusive = addDays(ymdToDate(endExclusiveYmd), -1)
  const fmt = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  const startLabel = fmt.format(startDate)
  const endLabel = fmt.format(endInclusive)

  if (startLabel === endLabel) return startLabel
  return `${startLabel} - ${endLabel}`
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    padding: 16,
    background: '#eef4f3',
    color: '#1f2933',
  },
  header: {
    display: 'grid',
    gap: 16,
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    alignItems: 'stretch',
  },
  kicker: {
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#5fa7a3',
    fontWeight: 700,
  },
  title: {
    margin: '6px 0 8px',
    fontSize: 28,
    color: '#1f2933',
  },
  subtle: {
    fontSize: 14,
    color: '#4f6f6d',
  },
  heroCard: {
    padding: 18,
    borderRadius: 18,
    background: 'linear-gradient(135deg, #2f6f73, #3a8f7c)',
    color: '#ffffff',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    justifyContent: 'space-between',
    boxShadow: '0 10px 24px rgba(47, 111, 115, 0.25)',
  },
  heroLabel: {
    fontSize: 12,
    opacity: 0.8,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: 700,
  },
  heroActions: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
  },
  primaryBtn: {
    border: 'none',
    borderRadius: 999,
    padding: '10px 18px',
    background: '#ffffff',
    color: '#2f6f73',
    fontWeight: 700,
    cursor: 'pointer',
  },
  ghostBtn: {
    border: '1px solid rgba(255,255,255,0.6)',
    borderRadius: 999,
    padding: '10px 18px',
    background: 'transparent',
    color: '#ffffff',
    fontWeight: 600,
    cursor: 'pointer',
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
    flexWrap: 'wrap',
  },
  sectionTitle: {
    margin: 0,
    fontSize: 18,
    color: '#1f2933',
  },
  linkBtn: {
    background: 'transparent',
    border: 'none',
    color: '#2f6f73',
    fontWeight: 700,
    cursor: 'pointer',
  },
  card: {
    background: '#ffffff',
    borderRadius: 16,
    padding: 16,
    border: '1px solid #d6e6e3',
    fontSize: 14,
  },
  bookingList: {
    display: 'grid',
    gap: 12,
  },
  bookingCard: {
    background: '#ffffff',
    borderRadius: 16,
    padding: 16,
    border: '1px solid #d6e6e3',
  },
  bookingHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  bookingTitle: {
    fontWeight: 700,
    color: '#1f2933',
  },
  blockedPill: {
    background: '#f2d6d6',
    color: '#8a3d3d',
    fontSize: 11,
    padding: '4px 8px',
    borderRadius: 999,
    fontWeight: 700,
  },
  bookingMeta: {
    marginTop: 6,
    fontSize: 13,
    color: '#4f6f6d',
  },
  bookingNotes: {
    marginTop: 8,
    fontSize: 13,
    color: '#1f2933',
  },
}
