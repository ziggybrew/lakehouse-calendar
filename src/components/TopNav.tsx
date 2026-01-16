// src/components/TopNav.tsx
import { useEffect, useMemo, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'

type UserInfo = {
  displayName: string
  modeLabel: string // e.g. "Guest" or "Member"
}

export default function TopNav() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  // Placeholder user info for now (auth wiring comes later)
  const user: UserInfo = useMemo(
    () => ({
      displayName: 'Guest',
      modeLabel: 'Demo Mode',
    }),
    []
  )

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
                <div style={styles.userName}>{user.displayName}</div>
                <div style={styles.userMeta}>{user.modeLabel}</div>
              </div>

              <button type="button" onClick={() => setOpen(false)} style={styles.iconBtn} aria-label="Close menu">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <nav style={styles.nav}>
              <NavItem to="/calendar" label="Calendar" />
              <NavItem to="/admin" label="Admin" />
            </nav>

            <div style={styles.drawerFooter}>
              <button
                type="button"
                style={styles.secondaryBtn}
                onClick={() => {
                  navigate('/login')
                }}
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

function NavItem(props: { to: string; label: string }) {
  return (
    <NavLink
      to={props.to}
      style={({ isActive }) => ({
        ...styles.navItem,
        ...(isActive ? styles.navItemActive : null),
      })}
    >
      {props.label}
    </NavLink>
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
  },
  navItemActive: {
    background: '#2f6f73',
    color: '#ffffff',
    border: '1px solid #2f6f73',
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