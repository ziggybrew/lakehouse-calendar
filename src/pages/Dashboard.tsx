import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import { DEMO_USER_ID, getDemoProfile, isDemoMode, listDemoAccessRequests, listDemoBookings } from '../lib/demoMode'

type ProfileRow = {
  first_name?: string | null
  last_name?: string | null
  role?: 'admin' | 'member' | string | null
}

type BookingRow = {
  id: string
  label: string
  start_date: string
  end_date: string
  notes: string | null
  is_blocked: boolean
}

const BOOKINGS_PER_PAGE = 5

export default function Dashboard() {
  const navigate = useNavigate()
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [bookings, setBookings] = useState<BookingRow[]>([])
  const [bookingPage, setBookingPage] = useState(1)
  const [pendingAccessCount, setPendingAccessCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const greetingName = useMemo(() => {
    const first = (profile?.first_name || '').trim()
    return first || session?.user?.email || 'Member'
  }, [profile, session])

  const isAdmin = profile?.role === 'admin' || isDemoMode()

  useEffect(() => {
    let alive = true

    async function load() {
      setLoading(true)
      setErrorMsg(null)

      if (isDemoMode()) {
        const demoProfile = getDemoProfile()
        setSession({
          user: {
            id: DEMO_USER_ID,
            email: demoProfile.email,
          },
        } as Session)
        setProfile({
          first_name: demoProfile.first_name,
          last_name: demoProfile.last_name,
          role: 'admin',
        })
        setBookings(listDemoBookings().filter((booking) => booking.end_date >= todayYmd()))
        setPendingAccessCount(listDemoAccessRequests().filter((request) => request.status === 'pending').length)
        setLoading(false)
        return
      }

      const { data } = await supabase.auth.getSession()
      if (!alive) return

      const activeSession = data.session ?? null
      setSession(activeSession)

      if (!activeSession?.user) {
        setProfile(null)
        setBookings([])
        setPendingAccessCount(0)
        setLoading(false)
        return
      }

      const profileResult = await supabase
        .from('profiles')
        .select('first_name, last_name, role')
        .eq('id', activeSession.user.id)
        .single()

      if (!alive) return

      if (profileResult.error) {
        setErrorMsg('Unable to load your profile details.')
        setProfile(null)
        setBookings([])
        setPendingAccessCount(0)
        setLoading(false)
        return
      }

      const nextProfile = profileResult.data ?? null
      const nextIsAdmin = nextProfile?.role === 'admin'
      setProfile(nextProfile)

      const bookingsQuery = nextIsAdmin
        ? supabase
          .from('bookings')
          .select('id,label,start_date,end_date,notes,is_blocked')
          .gte('end_date', todayYmd())
          .order('start_date', { ascending: true })
        : supabase
          .from('bookings')
          .select('id,label,start_date,end_date,notes,is_blocked')
          .eq('created_by', activeSession.user.id)
          .gte('end_date', todayYmd())
          .order('start_date', { ascending: true })

      const [bookingsResult, accessResult] = await Promise.all([
        bookingsQuery,
        nextIsAdmin
          ? supabase.from('access_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending')
          : Promise.resolve({ count: 0, error: null }),
      ])

      if (!alive) return

      if (bookingsResult.error) {
        setErrorMsg('Unable to load upcoming bookings.')
        setBookings([])
      } else {
        setBookings((bookingsResult.data || []) as BookingRow[])
      }

      setPendingAccessCount(accessResult.error ? 0 : accessResult.count ?? 0)
      setLoading(false)
    }

    load()

    return () => {
      alive = false
    }
  }, [])

  const pageCount = Math.max(1, Math.ceil(bookings.length / BOOKINGS_PER_PAGE))
  const currentPage = Math.min(bookingPage, pageCount)
  const visibleBookings = bookings.slice(
    (currentPage - 1) * BOOKINGS_PER_PAGE,
    currentPage * BOOKINGS_PER_PAGE
  )
  const blockedCount = bookings.filter((booking) => booking.is_blocked).length
  const nextBooking = bookings.find((booking) => !booking.is_blocked) ?? bookings[0] ?? null
  const nextStayLabel = nextBooking ? `${nextBooking.label} · ${formatRange(nextBooking.start_date, nextBooking.end_date)}` : 'No upcoming stays'

  useEffect(() => {
    setBookingPage(1)
  }, [bookings.length])

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <div style={styles.kicker}>Dashboard</div>
          <h1 style={styles.title}>Welcome back, {greetingName}!</h1>
          <div style={styles.subtle}>Keep track of your upcoming stays and plan a new booking.</div>
        </div>
        <div style={styles.heroCard}>
          <div style={styles.heroLabel}>Next step</div>
          <div style={styles.heroTitle}>Ready to book the lakehouse?</div>
          <div style={styles.heroActions}>
            <button type="button" style={styles.primaryBtn} onClick={() => navigate('/calendar', { state: { openBooking: true } })}>
              <span style={styles.btnInner}>
                <IconAddCalendar />
                <span>Book now</span>
              </span>
            </button>
            <button type="button" style={styles.ghostBtn} onClick={() => navigate('/calendar')}>
              <span style={styles.btnInner}>
                <IconCalendar />
                <span>View calendar</span>
              </span>
            </button>
          </div>
        </div>
      </div>

      {isAdmin ? (
        <section style={styles.adminSection}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Admin overview</h2>
          </div>

          <div style={styles.adminGrid}>
            <AdminMetric
              label="Upcoming stays"
              value={bookings.length}
              detail="Across the family calendar"
              icon={<IconCalendar />}
            />
            <AdminMetric
              label="Pending access"
              value={pendingAccessCount}
              detail="Registration requests to review"
              icon={<IconApprovals />}
              tone="warn"
            />
            <AdminMetric
              label="Blocked dates"
              value={blockedCount}
              detail="Maintenance or owner holds"
              icon={<IconBlock />}
            />
          </div>

          <div style={styles.adminWorkGrid}>
            <div style={styles.adminPanel}>
              <div style={styles.panelLabel}>Next on calendar</div>
              <div style={styles.panelTitle}>{nextStayLabel}</div>
              <button type="button" style={styles.panelAction} onClick={() => navigate('/calendar')}>
                Open calendar
              </button>
            </div>

            <div style={styles.adminPanel}>
              <div style={styles.panelLabel}>Admin queue</div>
              <div style={styles.panelTitle}>
                {pendingAccessCount > 0 ? `${pendingAccessCount} access request${pendingAccessCount === 1 ? '' : 's'} need review` : 'No access requests waiting'}
              </div>
              <button type="button" style={styles.panelAction} onClick={() => navigate('/admin')}>
                Review admin
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Upcoming bookings</h2>
        </div>

        {loading ? (
          <div style={styles.card}>Loading your bookings…</div>
        ) : errorMsg ? (
          <div style={styles.card}>{errorMsg}</div>
        ) : bookings.length === 0 ? (
          <div style={styles.card}>No upcoming bookings yet. Reserve your next stay.</div>
        ) : (
          <>
            <div style={styles.bookingList}>
              {visibleBookings.map((booking) => (
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

            {pageCount > 1 ? (
              <div style={styles.pagination} aria-label="Booking pagination">
                <button
                  type="button"
                  style={currentPage === 1 ? styles.pageBtnDisabled : styles.pageBtn}
                  disabled={currentPage === 1}
                  onClick={() => setBookingPage((page) => Math.max(1, page - 1))}
                  aria-label="Previous bookings page"
                >
                  <IconChevronLeft />
                </button>

                {Array.from({ length: pageCount }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    type="button"
                    style={page === currentPage ? styles.pageBtnActive : styles.pageBtn}
                    onClick={() => setBookingPage(page)}
                    aria-current={page === currentPage ? 'page' : undefined}
                  >
                    {page}
                  </button>
                ))}

                <button
                  type="button"
                  style={currentPage === pageCount ? styles.pageBtnDisabled : styles.pageBtn}
                  disabled={currentPage === pageCount}
                  onClick={() => setBookingPage((page) => Math.min(pageCount, page + 1))}
                  aria-label="Next bookings page"
                >
                  <IconChevronRight />
                </button>
              </div>
            ) : null}
          </>
        )}
      </section>
    </div>
  )
}

function SvgIcon(props: { children: React.ReactNode }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ display: 'block' }}>
      {props.children}
    </svg>
  )
}

function IconAddCalendar() {
  return (
    <SvgIcon>
      <path d="M7 3v3M17 3v3M4 9h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M12 12v5M9.5 14.5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </SvgIcon>
  )
}

function IconCalendar() {
  return (
    <SvgIcon>
      <path d="M7 3v3M17 3v3M4 9h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </SvgIcon>
  )
}

function IconApprovals() {
  return (
    <SvgIcon>
      <path d="M9 12l2 2 4-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 11.5V7l-8-4-8 4v5c0 5 3.5 8 8 9 1.8-.4 3.4-1.2 4.7-2.3" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M17 17h4M19 15v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </SvgIcon>
  )
}

function IconBlock() {
  return (
    <SvgIcon>
      <path d="M7 3v3M17 3v3M4 9h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M9 15h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </SvgIcon>
  )
}

function AdminMetric(props: {
  label: string
  value: number
  detail: string
  icon: React.ReactNode
  tone?: 'warn'
}) {
  return (
    <div style={styles.metricCard}>
      <div style={props.tone === 'warn' ? styles.metricIconWarn : styles.metricIcon}>
        {props.icon}
      </div>
      <div>
        <div style={styles.metricValue}>{props.value}</div>
        <div style={styles.metricLabel}>{props.label}</div>
        <div style={styles.metricDetail}>{props.detail}</div>
      </div>
    </div>
  )
}

function IconChevronLeft() {
  return (
    <SvgIcon>
      <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </SvgIcon>
  )
}

function IconChevronRight() {
  return (
    <SvgIcon>
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </SvgIcon>
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
  btnInner: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    whiteSpace: 'nowrap',
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
  adminSection: {
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
  card: {
    background: '#ffffff',
    borderRadius: 16,
    padding: 16,
    border: '1px solid #d6e6e3',
    fontSize: 14,
  },
  adminGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
    gap: 12,
  },
  metricCard: {
    background: '#ffffff',
    borderRadius: 16,
    padding: 16,
    border: '1px solid #d6e6e3',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    minHeight: 104,
    boxShadow: '0 4px 14px rgba(47, 111, 115, 0.06)',
  },
  metricIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    background: 'rgba(95, 167, 163, 0.14)',
    color: '#2f6f73',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: '0 0 auto',
  },
  metricIconWarn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    background: 'rgba(245, 158, 11, 0.16)',
    color: '#b45309',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: '0 0 auto',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 900,
    color: '#1f2933',
    lineHeight: 1,
  },
  metricLabel: {
    marginTop: 5,
    fontSize: 13,
    color: '#1f2933',
    fontWeight: 800,
  },
  metricDetail: {
    marginTop: 3,
    fontSize: 12,
    color: '#4f6f6d',
  },
  adminWorkGrid: {
    marginTop: 12,
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: 12,
  },
  adminPanel: {
    background: '#ffffff',
    borderRadius: 16,
    padding: 16,
    border: '1px solid #d6e6e3',
    boxShadow: '0 4px 14px rgba(47, 111, 115, 0.06)',
  },
  panelLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: '#5fa7a3',
    fontWeight: 900,
  },
  panelTitle: {
    marginTop: 8,
    fontSize: 15,
    color: '#1f2933',
    fontWeight: 800,
    lineHeight: 1.35,
  },
  panelAction: {
    marginTop: 14,
    border: '1px solid rgba(47, 111, 115, 0.22)',
    borderRadius: 12,
    padding: '10px 12px',
    background: '#eef4f3',
    color: '#2f6f73',
    fontWeight: 900,
    cursor: 'pointer',
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
  pagination: {
    marginTop: 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  pageBtn: {
    width: 38,
    height: 38,
    padding: 0,
    borderRadius: 12,
    border: '1px solid rgba(47, 111, 115, 0.18)',
    background: '#ffffff',
    color: '#2f6f73',
    fontWeight: 800,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(47, 111, 115, 0.08)',
  },
  pageBtnActive: {
    width: 38,
    height: 38,
    padding: 0,
    borderRadius: 12,
    border: '1px solid #2f6f73',
    background: '#2f6f73',
    color: '#ffffff',
    fontWeight: 900,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 5px 14px rgba(47, 111, 115, 0.24)',
  },
  pageBtnDisabled: {
    width: 38,
    height: 38,
    padding: 0,
    borderRadius: 12,
    border: '1px solid rgba(47, 111, 115, 0.10)',
    background: 'rgba(255,255,255,0.65)',
    color: 'rgba(47, 111, 115, 0.35)',
    fontWeight: 800,
    cursor: 'not-allowed',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
}
