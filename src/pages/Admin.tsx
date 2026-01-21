import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

type AdminUser = {
  id: string
  email: string
  firstName?: string
  lastName?: string
  role: 'admin' | 'member'
  isActive: boolean
}

type AccessRequest = {
  id: string
  email: string
  first_name: string
  last_name: string
  phone: string | null
  invite_code: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

type Booking = {
  id: string
  label: string
  start: string
  end: string
  notes?: string
  createdBy?: string
  isBlocked?: boolean
}

type BookingDraft = {
  label: string
  start: string
  endInclusive: string
  notes: string
  isBlocked: boolean
}

export default function Admin() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])

  const [usersLoading, setUsersLoading] = useState(false)
  const [accessLoading, setAccessLoading] = useState(false)
  const [bookingsLoading, setBookingsLoading] = useState(false)

  const [usersError, setUsersError] = useState<string | null>(null)
  const [accessError, setAccessError] = useState<string | null>(null)
  const [bookingsError, setBookingsError] = useState<string | null>(null)

  const [draftOpen, setDraftOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [activeTab, setActiveTab] = useState<'access' | 'users' | 'bookings'>('bookings')

  const [draft, setDraft] = useState<BookingDraft>({
    label: '',
    start: todayYmd(),
    endInclusive: todayYmd(),
    notes: '',
    isBlocked: false,
  })

  useEffect(() => {
    loadAccessRequests()
    loadUsers()
    loadBookings()
  }, [])

  async function loadAccessRequests() {
    setAccessLoading(true)
    setAccessError(null)
    const { data, error } = await supabase
      .from('access_requests')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) setAccessError('Unable to load access requests.')
    setAccessRequests(data || [])
    setAccessLoading(false)
  }

  async function loadUsers() {
    setUsersLoading(true)
    setUsersError(null)
    const { data, error } = await supabase
      .from('profiles')
      .select('id,email,first_name,last_name,role,is_active')

    if (error) setUsersError('Unable to load users.')
    const mapped: AdminUser[] = (data || []).map((r: any) => ({
      id: r.id,
      email: r.email,
      firstName: r.first_name,
      lastName: r.last_name,
      role: r.role,
      isActive: r.is_active,
    }))

    mapped.sort((a, b) => {
      const aFirst = (a.firstName || '').trim().toLowerCase()
      const bFirst = (b.firstName || '').trim().toLowerCase()
      if (aFirst && bFirst && aFirst !== bFirst) return aFirst.localeCompare(bFirst)
      if (aFirst && !bFirst) return -1
      if (!aFirst && bFirst) return 1

      const aLast = (a.lastName || '').trim().toLowerCase()
      const bLast = (b.lastName || '').trim().toLowerCase()
      if (aLast && bLast && aLast !== bLast) return aLast.localeCompare(bLast)
      if (aLast && !bLast) return -1
      if (!aLast && bLast) return 1

      return (a.email || '').toLowerCase().localeCompare((b.email || '').toLowerCase())
    })

    setUsers(mapped)
    setUsersLoading(false)
  }

  async function loadBookings() {
    setBookingsLoading(true)
    setBookingsError(null)
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('start_date', { ascending: true })

    if (error) setBookingsError('Unable to load bookings.')
    setBookings(
      (data || []).map((b: any) => ({
        id: b.id,
        label: b.label,
        start: b.start_date,
        end: b.end_date,
        notes: b.notes,
        createdBy: b.created_by,
        isBlocked: b.is_blocked,
      }))
    )
    setBookingsLoading(false)
  }

  async function approveRequest(r: AccessRequest) {
    await supabase.from('access_requests').update({ status: 'approved' }).eq('id', r.id)
    await supabase.from('profiles').update({ is_active: true }).eq('email', r.email)
    loadAccessRequests()
  }

  async function rejectRequest(r: AccessRequest) {
    await supabase.from('access_requests').update({ status: 'rejected' }).eq('id', r.id)
    loadAccessRequests()
  }

  async function toggleUserActive(id: string, next: boolean) {
    await supabase.from('profiles').update({ is_active: next }).eq('id', id)
    loadUsers()
  }

  function openCreateBooking() {
    setEditingId(null)
    setDraft({
      label: '',
      start: todayYmd(),
      endInclusive: todayYmd(),
      notes: '',
      isBlocked: false,
    })
    setDraftOpen(true)
  }

  function openEditBooking(b: Booking) {
    setEditingId(b.id)
    setDraft({
      label: b.label,
      start: b.start,
      endInclusive: toInclusiveEnd(b.end),
      notes: b.notes || '',
      isBlocked: !!b.isBlocked,
    })
    setDraftOpen(true)
  }

  async function saveDraft() {
    const payload = {
      label: draft.isBlocked ? `Blocked: ${draft.label}` : draft.label,
      start_date: draft.start,
      end_date: toExclusiveEnd(draft.endInclusive),
      notes: draft.notes || null,
      is_blocked: draft.isBlocked,
    }

    if (editingId) {
      await supabase.from('bookings').update(payload).eq('id', editingId)
    } else {
      const { data } = await supabase.auth.getUser()
      await supabase.from('bookings').insert({ ...payload, created_by: data.user?.id })
    }

    setDraftOpen(false)
    loadBookings()
  }

  async function deleteBooking(id: string) {
    await supabase.from('bookings').delete().eq('id', id)
    loadBookings()
  }

  return (
    <div style={{ minHeight: '100vh', padding: 16, background: '#eef4f3' }}>
      <h1 style={{ margin: 0, color: '#2f6f73' }}>Admin</h1>
      <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
        Admin-only tools for managing users and entries.
      </div>

      <div style={{ marginTop: 14 }}>
        <div style={segmentedWrapStyle}>
          <button
            type="button"
            onClick={() => setActiveTab('bookings')}
            style={activeTab === 'bookings' ? segmentBtnActive : segmentBtn}
          >
            <span style={segmentInner}>
              <span style={segmentIcon} aria-hidden="true">
                <IconCalendarToday />
              </span>
              <span>Bookings</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            style={activeTab === 'users' ? segmentBtnActive : segmentBtn}
          >
            <span style={segmentInner}>
              <span style={segmentIcon} aria-hidden="true">
                <IconGroup />
              </span>
              <span>Users</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('access')}
            style={activeTab === 'access' ? segmentBtnActive : segmentBtn}
          >
            <span style={segmentInner}>
              <span style={segmentIcon} aria-hidden="true">
                <IconPersonAdd />
              </span>
              <span>Pending</span>
            </span>
          </button>
        </div>
      </div>

      {activeTab === 'access' && (
        <Section title="Access requests">
          {accessLoading ? 'Loading…' : accessRequests.filter(r => r.status === 'pending').map(r => (
            <Card key={r.id}>
              <strong>{r.first_name} {r.last_name}</strong>
              <div>{r.email}</div>
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Button compact icon={<IconCheck />} label="Approve" onClick={() => approveRequest(r)} />
                <div style={{ marginLeft: 'auto' }}>
                  <Button
                    compact
                    icon={<IconClose />}
                    label="Reject"
                    variant="danger"
                    onClick={() => {
                      const ok = window.confirm(`Reject access request for ${r.first_name} ${r.last_name}?`)
                      if (!ok) return
                      rejectRequest(r)
                    }}
                  />
                </div>
              </div>
            </Card>
          ))}
        </Section>
      )}

      {activeTab === 'users' && (
        <Section title="User management">
          {users.map(u => (
            <Card key={u.id}>
              <strong>{u.firstName} {u.lastName}</strong>
              <div>{u.email}</div>
              <Button
                compact
                icon={u.isActive ? <IconLock /> : <IconLockOpen />}
                label={u.isActive ? 'Deactivate' : 'Activate'}
                onClick={() => {
                  if (u.isActive) {
                    const ok = window.confirm(`Deactivate ${u.firstName || ''} ${u.lastName || ''}`.trim() + '?')
                    if (!ok) return
                  }
                  toggleUserActive(u.id, !u.isActive)
                }}
              />
            </Card>
          ))}
        </Section>
      )}

      {activeTab === 'bookings' && (
        <Section
          title="Booking management"
          right={<Button icon={<IconAdd />} label="New entry" onClick={openCreateBooking} />}
        >
          {bookings.map(b => (
            <Card key={b.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <strong>{b.label}</strong>

                    {isTodayWithinBooking(b.start, b.end) ? (
                    <span
                        style={{
                        marginLeft: 'auto',
                        display: 'inline-flex',
                        alignItems: 'center',
                        height: 22,
                        padding: '0 10px',
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 900,
                        background: 'rgba(47, 111, 115, 0.14)',
                        color: '#2f6f73',
                        border: '1px solid rgba(47, 111, 115, 0.22)',
                        }}
                    >
                        Active
                    </span>
                    ) : null}
                </div>
              <div>{formatDisplayDate(b.start)} → {formatDisplayDate(toInclusiveEnd(b.end))}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Button compact icon={<IconEdit />} label="Edit" onClick={() => openEditBooking(b)} />
                <div style={{ marginLeft: 'auto' }}>
                  <Button
                    compact
                    icon={<IconDelete />}
                    label="Remove"
                    variant="danger"
                    onClick={() => {
                      const ok = window.confirm(`Remove this booking for ${b.label}?`)
                      if (!ok) return
                      deleteBooking(b.id)
                    }}
                  />
                </div>
              </div>
            </Card>
          ))}
        </Section>
      )}

      {draftOpen && (
        <Modal title={editingId ? 'Edit entry' : 'New entry'} onClose={() => setDraftOpen(false)}>
          <input value={draft.label} onChange={e => setDraft({ ...draft, label: e.target.value })} />
          <input type="date" value={draft.start} onChange={e => setDraft({ ...draft, start: e.target.value })} />
          <input type="date" value={draft.endInclusive} onChange={e => setDraft({ ...draft, endInclusive: e.target.value })} />
          <textarea value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })} />
          <Button compact icon={<IconCheck />} label="Save" onClick={saveDraft} />
        </Modal>
      )}
    </div>
  )
}

/* ---------- Shared UI ---------- */

function Section({ title, children, right }: any) {
  return (
    <section style={{ marginTop: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <strong>{title}</strong>
        {right}
      </div>
      <div style={{ marginTop: 10 }}>{children}</div>
    </section>
  )
}

function Card({ children }: any) {
  return <div style={{ background: '#fff', padding: 14, borderRadius: 12, marginBottom: 10 }}>{children}</div>
}

function Button({ icon, label, onClick, variant, disabled, compact }: any) {
  const isDanger = variant === 'danger'
  const isCompact = !!compact
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        gap: 8,
        alignItems: 'center',
        justifyContent: 'center',
        height: isCompact ? 30 : 36,
        padding: isCompact ? '0 10px' : '0 12px',
        borderRadius: isCompact ? 10 : 12,
        border: '1px solid rgba(47,111,115,0.18)',
        background: isDanger ? 'rgba(185, 28, 28, 0.10)' : 'rgba(255,255,255,0.92)',
        color: isDanger ? '#991b1b' : '#1f2933',
        fontWeight: 800,
        cursor: 'pointer',
        fontSize: isCompact ? 12 : undefined,
      }}
    >
      {icon ? (
        <span
          style={{
            width: isCompact ? 16 : 18,
            height: isCompact ? 16 : 18,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </span>
      ) : null}
      <span>{label}</span>
    </button>
  )
}

const segmentedWrapStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: 0,
  borderRadius: 14,
  border: '1px solid rgba(47,111,115,0.22)',
  background: 'rgba(255,255,255,0.70)',
  overflow: 'hidden',
  width: '100%',
  maxWidth: 520,
}

const segmentBtn: React.CSSProperties = {
  height: 40,
  padding: '0 10px',
  border: 'none',
  background: 'transparent',
  color: '#2f6f73',
  fontSize: 13,
  fontWeight: 800,
  cursor: 'pointer',
}

const segmentBtnActive: React.CSSProperties = {
  ...segmentBtn,
  background: '#2f6f73',
  color: '#ffffff',
}

const segmentInner: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  width: '100%',
}

const segmentIcon: React.CSSProperties = {
  width: 16,
  height: 16,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
}

/* ---------- Icons ---------- */

function SvgIcon(props: { children: React.ReactNode }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={{ display: 'block' }}
    >
      {props.children}
    </svg>
  )
}

function IconCheck() {
  return (
    <SvgIcon>
      <path d="M9 16.2l-3.5-3.5L4 14.2l5 5 11-11-1.5-1.5L9 16.2z" fill="currentColor" />
    </SvgIcon>
  )
}

function IconClose() {
  return (
    <SvgIcon>
      <path
        d="M18.3 5.71L12 12l6.3 6.29-1.41 1.42L12 13.41l-6.89 6.3-1.41-1.42L10.59 12 3.7 5.71 5.11 4.29 12 10.59l6.89-6.3 1.41 1.42z"
        fill="currentColor"
      />
    </SvgIcon>
  )
}

function IconAdd() {
  return (
    <SvgIcon>
      <path d="M19 13H13v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor" />
    </SvgIcon>
  )
}

function IconEdit() {
  return (
    <SvgIcon>
      <path
        d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z"
        fill="currentColor"
      />
      <path
        d="M20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z"
        fill="currentColor"
      />
    </SvgIcon>
  )
}

function IconDelete() {
  return (
    <SvgIcon>
      <path d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12z" fill="currentColor" />
      <path d="M15.5 4l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor" />
    </SvgIcon>
  )
}

function IconLock() {
  return (
    <SvgIcon>
      <path
        d="M12 17a2 2 0 0 0 2-2v-2a2 2 0 0 0-4 0v2a2 2 0 0 0 2 2z"
        fill="currentColor"
      />
      <path
        d="M17 8h-1V6a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2zm-7-2a2 2 0 0 1 4 0v2h-4V6z"
        fill="currentColor"
      />
    </SvgIcon>
  )
}

function IconLockOpen() {
  return (
    <SvgIcon>
      <path
        d="M12 17a2 2 0 0 0 2-2v-2a2 2 0 0 0-4 0v2a2 2 0 0 0 2 2z"
        fill="currentColor"
      />
      <path
        d="M17 8h-7V6a2 2 0 0 1 3.41-1.41l1.42-1.42A4 4 0 0 0 8 6v2H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2z"
        fill="currentColor"
      />
    </SvgIcon>
  )
}

function IconGroup() {
  return (
    <SvgIcon>
      <path
        d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V21h14v-4.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V21h6v-4.5c0-2.33-4.67-3.5-7-3.5z"
        fill="currentColor"
      />
    </SvgIcon>
  )
}

function IconPersonAdd() {
  return (
    <SvgIcon>
      <path
        d="M15 12c2.21 0 4-1.79 4-4S17.21 4 15 4s-4 1.79-4 4 1.79 4 4 4zm-9 0c1.66 0 3-1.34 3-3S7.66 6 6 6 3 7.34 3 9s1.34 3 3 3zm0 2c-2.33 0-6 1.17-6 3.5V21h7v-3.5c0-1.21.54-2.27 1.44-3.07C7.55 14.16 6.69 14 6 14zm9 0c-2.67 0-8 1.34-8 4v3h16v-3c0-2.66-5.33-4-8-4zm7-3v-2h-2V9h-2v2h-2v2h2v2h2v-2h2z"
        fill="currentColor"
      />
    </SvgIcon>
  )
}

function IconCalendarToday() {
  return (
    <SvgIcon>
      <path
        d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.11 0 2-.9 2-2V6c0-1.1-.89-2-2-2zm0 16H5V9h14v11zm0-13H5V6h14v1z"
        fill="currentColor"
      />
    </SvgIcon>
  )
}

/* ---------- Helpers ---------- */

function todayYmd() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
function pad(n: number) { return String(n).padStart(2, '0') }
function toInclusiveEnd(e: string) {
  const d = new Date(e); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10)
}
function toExclusiveEnd(i: string) {
  const d = new Date(i); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10)
}
function formatDisplayDate(ymd: string) {
  const [y, m, d] = ymd.split('-'); return `${m}/${d}/${y}`
}

function isTodayWithinBooking(startYmd: string, endExclusiveYmd: string) {
  const today = todayYmd()
  return startYmd <= today && today < endExclusiveYmd
}

function Modal({ title, children, onClose }: any) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.3)' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', margin: '10% auto', padding: 20 }}>
        <strong>{title}</strong>
        {children}
      </div>
    </div>
  )
}