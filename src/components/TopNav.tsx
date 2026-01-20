// src/components/TopNav.tsx
import { useEffect, useMemo, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import type { Session } from '@supabase/supabase-js'

type UserInfo = {
  displayName: string
  firstName?: string | null
  lastName?: string | null
  isDemo: boolean
  avatarUrl?: string | null
}

export default function TopNav() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<{ first_name?: string; last_name?: string; avatar_url?: string | null } | null>(null)

  async function handleLogout() {
    setOpen(false)
    const { error } = await supabase.auth.signOut()
    if (error) {
      // Keep this simple for now; replace with toast UI later.
      alert(error.message)
      return
    }
    navigate('/login')
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => {
      sub.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!session?.user) {
      setProfile(null)
      return
    }

    supabase
      .from('profiles')
      .select('first_name, last_name, avatar_url')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        setProfile(data ?? null)
      })
  }, [session])

  const user: UserInfo = useMemo(() => {
    if (!session?.user) {
      return {
        displayName: 'Guest',
        firstName: null,
        lastName: null,
        isDemo: true,
        avatarUrl: null,
      }
    }

    const firstName = profile?.first_name ?? null
    const lastName = profile?.last_name ?? null
    const name = [firstName, lastName].filter(Boolean).join(' ').trim()

    return {
      displayName: name || 'Member',
      firstName,
      lastName,
      isDemo: false,
      avatarUrl: profile?.avatar_url ?? null,
    }
  }, [session, profile])

  // Close drawer on route change
  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  // Esc closes drawer
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  const initials = getInitialsFromFirstLast(user.firstName, user.lastName) || getInitials(user.displayName)

  return (
    <>
      <header style={styles.header}>
        <button
          type="button"
          aria-label="Open menu"
          onClick={() => setOpen(true)}
          style={styles.iconBtn}
        >
          {/* Hamburger icon */}
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        <div style={styles.titleWrap}>
          <div style={styles.title}>Lakehouse Calendar</div>
        </div>

        {/* Right side placeholder (later: user avatar, actions) */}
        <div style={styles.rightSlot} />
      </header>

      {/* Drawer + overlay */}
      {open && (
        <div style={styles.overlay} onClick={() => setOpen(false)} role="presentation">
          <aside
            style={styles.drawer}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            <div style={styles.drawerTop}>
              <div style={styles.userBlock}>
                <div style={styles.userRow}>
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt=""
                      style={styles.avatarImg}
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div style={styles.avatarFallback} aria-hidden="true">
                      {initials}
                    </div>
                  )}

                  <div style={{ minWidth: 0 }}>
                    <div style={styles.userName}>{user.displayName}</div>
                    {user.isDemo ? <div style={styles.userMeta}>Demo Mode</div> : null}
                  </div>
                </div>
              </div>

              <button type="button" onClick={() => setOpen(false)} style={styles.iconBtn} aria-label="Close menu">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <nav style={styles.nav}>
              <NavItem to="/calendar" label="Calendar" icon={<IconCalendar />} />
              <NavItem to="/admin" label="Admin" icon={<IconShield />} />
            </nav>

            <div style={styles.drawerFooter}>
              <button
                type="button"
                style={styles.secondaryBtn}
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  )
}

function NavItem(props: { to: string; label: string; icon: React.ReactNode }) {
  return (
    <NavLink
      to={props.to}
      style={({ isActive }) => ({
        ...styles.navItem,
        ...(isActive ? styles.navItemActive : null),
      })}
    >
      <span style={styles.navItemInner}>
        <span style={styles.navIcon} aria-hidden="true">
          {props.icon}
        </span>
        <span style={styles.navLabel}>{props.label}</span>
      </span>
    </NavLink>
  )
}

function getInitialsFromFirstLast(firstName?: string | null, lastName?: string | null) {
  const first = String(firstName || '').trim()
  const last = String(lastName || '').trim()

  const a = first ? first[0] : ''
  const b = last ? last[0] : ''

  const out = (a + b).toUpperCase().slice(0, 2)
  return out || ''
}

function getInitials(name: string) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (parts.length === 0) return '?'
  const first = parts[0][0] || '?'
  const last = (parts.length > 1 ? parts[parts.length - 1][0] : '') || ''
  return (first + last).toUpperCase().slice(0, 2)
}

function IconCalendar() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 3v2M17 3v2M4 8h16M6 6h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconShield() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3l7 4v6c0 5-3 8-7 9-4-1-7-4-7-9V7l7-4Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M12 7v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 17h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    height: 56,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '0 12px',
    background: '#eef4f3',
    borderBottom: '1px solid #d6e6e3',
    position: 'sticky',
    top: 0,
    zIndex: 50,
  },
  iconBtn: {
    height: 40,
    width: 40,
    padding: 0,
    lineHeight: 0,
    boxSizing: 'border-box',
    borderRadius: 12,
    border: '1px solid #d6e6e3',
    background: '#ffffff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#2f6f73',
  },
  titleWrap: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  title: {
    fontSize: 16,
    fontWeight: 800,
    color: '#2f6f73',
    lineHeight: 1.1,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  rightSlot: {
    marginLeft: 'auto',
    width: 40,
    height: 40,
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(47, 111, 115, 0.35)',
    zIndex: 9999,
    display: 'flex',
  },
  drawer: {
    width: 'min(340px, 86vw)',
    height: '100dvh',
    maxHeight: '100dvh',
    boxSizing: 'border-box',
    padding: 14,
    paddingBottom: 'calc(14px + env(safe-area-inset-bottom))',
    overflowY: 'auto',
    background: '#eef4f3',
    boxShadow: '12px 0 30px rgba(0,0,0,0.25)',
    display: 'flex',
    flexDirection: 'column',
  },
  drawerTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  userBlock: {
    minWidth: 0,
  },
  userRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  avatarFallback: {
    width: 38,
    height: 38,
    borderRadius: 12,
    background: '#ffffff',
    border: '1px solid #d6e6e3',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#2f6f73',
    fontWeight: 900,
    letterSpacing: 0.4,
  },
  avatarImg: {
    width: 38,
    height: 38,
    borderRadius: 12,
    objectFit: 'cover',
    border: '1px solid #d6e6e3',
    background: '#ffffff',
  },
  userName: {
    fontSize: 14,
    fontWeight: 800,
    color: '#2f6f73',
  },
  userMeta: {
    fontSize: 12,
    color: '#5fa7a3',
    marginTop: 2,
  },
  nav: {
    display: 'grid',
    gap: 8,
    marginTop: 6,
  },
  navItem: {
    padding: '12px 12px',
    borderRadius: 12,
    border: '1px solid #d6e6e3',
    color: '#1f2933',
    textDecoration: 'none',
    fontWeight: 750,
    background: '#ffffff',
    display: 'block',
  },
  navItemActive: {
    background: '#2f6f73',
    color: '#ffffff',
    border: '1px solid #2f6f73',
  },
  navItemInner: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  navIcon: {
    width: 22,
    height: 22,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLabel: {
    minWidth: 0,
  },
  drawerFooter: {
    marginTop: 'auto',
    paddingTop: 12,
    borderTop: '1px solid #d6e6e3',
  },
  secondaryBtn: {
    width: '100%',
    padding: '12px 12px',
    borderRadius: 12,
    border: '1px solid #2f6f73',
    background: '#ffffff',
    color: '#2f6f73',
    fontWeight: 750,
    cursor: 'pointer',
  },
}