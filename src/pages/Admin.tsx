import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

type AdminUser = {
  id: string
  name: string
  email: string
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
  start: string // YYYY-MM-DD
  end: string // YYYY-MM-DD (end-exclusive)
  notes?: string
  createdBy?: string
  isBlocked?: boolean
}

type BookingDraft = {
  label: string
  start: string // YYYY-MM-DD
  endInclusive: string // YYYY-MM-DD (inclusive, for UI)
  notes: string
  isBlocked: boolean
}

export default function Admin() {
  // Temporary sample data (persistence + auth comes later).
  const initialUsers = useMemo<AdminUser[]>(
    () => [
      {
        id: 'u1',
        name: 'Zack',
        email: 'zack@example.com',
        role: 'admin',
        isActive: true,
      },
      {
        id: 'u2',
        name: 'Jeff',
        email: 'jeff@example.com',
        role: 'member',
        isActive: true,
      },
      {
        id: 'u3',
        name: 'Rob',
        email: 'rob@example.com',
        role: 'member',
        isActive: false,
      },
    ],
    []
  )

  const initialBookings = useMemo<Booking[]>(
    () => [
      {
        id: 'b1',
        label: 'Zack',
        start: '2026-01-16',
        end: '2026-01-19',
        notes: 'Arriving Friday evening. Leaving Sunday afternoon.',
        createdBy: 'Zack',
      },
      {
        id: 'b2',
        label: 'Family',
        start: '2026-02-06',
        end: '2026-02-09',
        notes: 'Weekend hang.',
        createdBy: 'Mom',
      },
      {
        id: 'b3',
        label: 'Blocked: Maintenance',
        start: '2026-02-20',
        end: '2026-02-23',
        notes: 'Plumbing work scheduled.',
        createdBy: 'Admin',
        isBlocked: true,
      },
    ],
    []
  )

  const [users, setUsers] = useState<AdminUser[]>(initialUsers)
  const [bookings, setBookings] = useState<Booking[]>(initialBookings)

  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([])
  const [accessLoading, setAccessLoading] = useState(false)
  const [accessError, setAccessError] = useState<string | null>(null)

  const [draftOpen, setDraftOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<BookingDraft>({
    label: '',
    start: todayYmd(),
    endInclusive: todayYmd(),
    notes: '',
    isBlocked: false,
  })

  async function loadAccessRequests() {
    setAccessLoading(true)
    setAccessError(null)
    try {
      const { data, error } = await supabase
        .from('access_requests')
        .select('id,email,first_name,last_name,phone,invite_code,status,created_at')
        .order('created_at', { ascending: false })

      if (error) {
        setAccessError(error.message)
        setAccessRequests([])
        return
      }

      setAccessRequests((data || []) as AccessRequest[])
    } finally {
      setAccessLoading(false)
    }
  }

  useEffect(() => {
    loadAccessRequests()
  }, [])

  async function approveRequest(r: AccessRequest) {
    const ok = window.confirm(`Approve access for ${r.email}?`)
    if (!ok) return

    // 1) mark request approved
    const { error: reqErr } = await supabase
      .from('access_requests')
      .update({ status: 'approved' })
      .eq('id', r.id)

    if (reqErr) {
      alert(reqErr.message)
      return
    }

    // 2) attempt to activate an existing profile (if the auth user already exists)
    const { data: updatedProfiles, error: profErr } = await supabase
      .from('profiles')
      .update({ is_active: true })
      .eq('email', r.email)
      .select('id')

    const count = updatedProfiles?.length ?? 0

    if (profErr) {
      // Access request is still approved; profile activation can be retried later.
      alert(`Approved request, but profile activation failed: ${profErr.message}`)
      await loadAccessRequests()
      return
    }

    if (!count) {
      alert('Approved request. Note: no existing auth user/profile was found for this email yet.')
    }

    await loadAccessRequests()
  }

  async function rejectRequest(r: AccessRequest) {
    const ok = window.confirm(`Reject access for ${r.email}?`)
    if (!ok) return

    const { error } = await supabase
      .from('access_requests')
      .update({ status: 'rejected' })
      .eq('id', r.id)

    if (error) {
      alert(error.message)
      return
    }

    await loadAccessRequests()
  }

  function toggleUserActive(userId: string) {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, isActive: !u.isActive } : u))
    )
  }

  function openCreateBooking() {
    setEditingId(null)
    const t = todayYmd()
    setDraft({
      label: '',
      start: t,
      endInclusive: t,
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

  function closeDraft() {
    setDraftOpen(false)
  }

  function saveDraft() {
    if (!draft.label.trim()) return

    const newBooking: Booking = {
      id: editingId || `b_${Date.now()}`,
      label: draft.isBlocked ? ensureBlockedPrefix(draft.label.trim()) : draft.label.trim(),
      start: draft.start,
      end: toExclusiveEnd(draft.endInclusive),
      notes: draft.notes.trim() ? draft.notes.trim() : undefined,
      createdBy: 'Admin',
      isBlocked: draft.isBlocked,
    }

    setBookings((prev) => {
      if (!editingId) return [newBooking, ...prev]
      return prev.map((b) => (b.id === editingId ? newBooking : b))
    })

    setDraftOpen(false)
  }

  function deleteBooking(id: string) {
    const ok = window.confirm('Remove this entry?')
    if (!ok) return
    setBookings((prev) => prev.filter((b) => b.id !== id))
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#eef4f3',
        color: '#1f2933',
        padding: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <h1 style={{ margin: 0, color: '#2f6f73' }}>Admin</h1>
        <div style={{ fontSize: 12, color: '#1f2933', opacity: 0.75 }}>
          Admin-only tools for managing users and entries.
        </div>
      </div>

      {/* Access Requests */}
      <Section
        title="Access requests"
        description="Review new registration requests. Approving activates an existing profile if the auth user already exists."
        rightAction={
          <button type="button" onClick={loadAccessRequests} style={secondaryBtn}>
            Refresh
          </button>
        }
      >
        <div style={cardStyle}>
          {accessError ? (
            <div
              style={{
                padding: 12,
                borderRadius: 14,
                border: '1px solid rgba(154, 79, 79, 0.35)',
                background: 'rgba(154, 79, 79, 0.08)',
                color: '#9a4f4f',
                fontSize: 13,
                fontWeight: 900,
              }}
            >
              {accessError}
            </div>
          ) : null}

          <div style={{ marginTop: accessError ? 12 : 0 }}>
            {accessLoading ? (
              <div style={{ opacity: 0.75, fontSize: 13 }}>Loading access requests…</div>
            ) : (
              <div style={gridStyle}>
                {accessRequests.filter((r) => r.status === 'pending').length === 0 ? (
                  <div style={itemCardStyle}>
                    <div style={{ fontWeight: 900, color: '#1f2933' }}>No pending requests</div>
                    <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
                      New registration requests will appear here.
                    </div>
                  </div>
                ) : (
                  accessRequests
                    .filter((r) => r.status === 'pending')
                    .map((r) => (
                      <div key={r.id} style={itemCardStyle}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'space-between',
                            gap: 12,
                          }}
                        >
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 900, color: '#1f2933' }}>
                              {r.first_name} {r.last_name}
                            </div>
                            <div style={{ fontSize: 12, opacity: 0.8, wordBreak: 'break-word' }}>
                              {r.email}
                            </div>
                          </div>

                          <span style={chip('#5fa7a3')}>pending</span>
                        </div>

                        <div style={{ marginTop: 10, fontSize: 12, opacity: 0.85 }}>
                          Requested: {formatDisplayDateTime(r.created_at)}
                        </div>

                        {r.phone ? (
                          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>
                            Phone: {r.phone}
                          </div>
                        ) : null}

                        {r.invite_code ? (
                          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>
                            Invite code: <span style={{ fontWeight: 900 }}>{r.invite_code}</span>
                          </div>
                        ) : null}

                        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
                          <button type="button" onClick={() => rejectRequest(r)} style={dangerOutlineBtn}>
                            Reject
                          </button>
                          <button type="button" onClick={() => approveRequest(r)} style={primaryBtn}>
                            Approve
                          </button>
                        </div>

                        <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
                          If the auth user does not exist yet, create the user in Supabase Auth (Users) and re-approve to activate.
                        </div>
                      </div>
                    ))
                )}
              </div>
            )}
          </div>
        </div>
      </Section>

      {/* User Management */}
      <Section
        title="User management"
        description="View users, roles, and active status. Deactivating a user removes access."
      >
        <div style={cardStyle}>
          <div style={gridStyle}>
            {users.map((u) => (
              <div key={u.id} style={itemCardStyle}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 900, color: '#1f2933' }}>{u.name}</div>
                    <div style={{ fontSize: 12, opacity: 0.8, wordBreak: 'break-word' }}>
                      {u.email}
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      gap: 8,
                      flexWrap: 'wrap',
                      justifyContent: 'flex-end',
                    }}
                  >
                    <span style={chip(u.role === 'admin' ? '#2f6f73' : '#5fa7a3')}>
                      {u.role}
                    </span>
                    <span style={chip(u.isActive ? '#2f6f73' : '#9aa7a5')}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => toggleUserActive(u.id)}
                    style={u.isActive ? dangerOutlineBtn : primaryOutlineBtn}
                  >
                    {u.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 12, fontSize: 12, opacity: 0.75 }}>
            Next steps include: real user list from the auth provider, invitations, and role assignment.
          </div>
        </div>
      </Section>

      {/* Booking Management */}
      <Section
        title="Booking management"
        description="Create, edit, and remove entries. Admin can book for others and block off dates."
        rightAction={
          <button type="button" onClick={openCreateBooking} style={primaryBtn}>
            New entry
          </button>
        }
      >
        <div style={cardStyle}>
          <div style={gridStyle}>
            {bookings.map((b) => (
              <div key={b.id} style={itemCardStyle}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <div style={{ fontWeight: 900, color: '#1f2933' }}>{b.label}</div>
                      {b.isBlocked ? <span style={chip('#9a6b4f')}>blocked</span> : null}
                    </div>

                    <div style={{ marginTop: 4, fontSize: 12, opacity: 0.85 }}>
                      {formatDisplayDate(b.start)} → {formatDisplayDate(toInclusiveEnd(b.end))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <button type="button" onClick={() => openEditBooking(b)} style={primaryOutlineBtn}>
                      Edit
                    </button>
                    <button type="button" onClick={() => deleteBooking(b.id)} style={dangerOutlineBtn}>
                      Remove
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: 10, fontSize: 13 }}>
                  {b.notes ? <div style={{ opacity: 0.9 }}>{b.notes}</div> : <div style={{ opacity: 0.55 }}>No notes.</div>}
                </div>

                <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
                  Created by: {b.createdBy || '—'}
                </div>
              </div>
            ))}

            {bookings.length === 0 ? (
              <div style={itemCardStyle}>
                <div style={{ opacity: 0.75 }}>No entries yet.</div>
              </div>
            ) : null}
          </div>

          <div style={{ marginTop: 12, fontSize: 12, opacity: 0.75 }}>
            Next steps include: admin-only create/edit against the same source of truth as the calendar page and a
            dedicated “blocked dates” entry type.
          </div>
        </div>
      </Section>

      {draftOpen && (
        <Modal title={editingId ? 'Edit entry' : 'New entry'} onClose={closeDraft}>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              saveDraft()
            }}
            style={{ display: 'grid', gap: 12 }}
          >
            <label style={labelStyle}>
              <span style={labelTextStyle}>Label</span>
              <input
                type="text"
                value={draft.label}
                onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                placeholder="e.g., Zack, Mom/Dad, Cousins"
                style={inputStyle}
              />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label style={labelStyle}>
                <span style={labelTextStyle}>Start date</span>
                <input
                  type="date"
                  value={draft.start}
                  onChange={(e) => setDraft({ ...draft, start: e.target.value })}
                  style={inputStyle}
                />
              </label>

              <label style={labelStyle}>
                <span style={labelTextStyle}>End date (inclusive)</span>
                <input
                  type="date"
                  value={draft.endInclusive}
                  onChange={(e) => setDraft({ ...draft, endInclusive: e.target.value })}
                  style={inputStyle}
                />
              </label>
            </div>

            <label style={labelStyle}>
              <span style={labelTextStyle}>Notes (optional)</span>
              <textarea
                rows={3}
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                placeholder="Anything helpful..."
                style={{ ...inputStyle, paddingTop: 10, resize: 'vertical' }}
              />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
              <input
                type="checkbox"
                checked={draft.isBlocked}
                onChange={(e) => setDraft({ ...draft, isBlocked: e.target.checked })}
              />
              Block dates (maintenance, private event, etc.)
            </label>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" onClick={closeDraft} style={secondaryBtn}>
                Cancel
              </button>
              <button type="submit" style={primaryBtn} disabled={!draft.label.trim()}>
                Save
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

function Section(props: {
  title: string
  description?: string
  rightAction?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section style={{ marginTop: 18 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 900, color: '#2f6f73' }}>{props.title}</div>
          {props.description ? (
            <div style={{ marginTop: 4, fontSize: 12, opacity: 0.75 }}>
              {props.description}
            </div>
          ) : null}
        </div>
        {props.rightAction ? <div>{props.rightAction}</div> : null}
      </div>

      <div style={{ marginTop: 10 }}>{props.children}</div>
    </section>
  )
}

function Modal(props: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(47, 111, 115, 0.25)',
        backdropFilter: 'blur(2px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={props.onClose}
    >
      <div
        style={{
          width: 'min(720px, 100%)',
          background: '#ffffff',
          color: '#1f2933',
          borderRadius: 14,
          padding: 16,
          border: '1px solid #d6e6e3',
          boxShadow: '0 16px 40px rgba(0,0,0,0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <strong style={{ color: '#2f6f73' }}>{props.title}</strong>
          <button type="button" onClick={props.onClose} style={iconBtn} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ display: 'block' }}>
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div style={{ marginTop: 12 }}>{props.children}</div>
      </div>
    </div>
  )
}

/**
 * Styles (kept inline for now; can be moved to a shared component later)
 */

const cardStyle: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid #d6e6e3',
  borderRadius: 14,
  padding: 14,
}

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  gap: 12,
}

const itemCardStyle: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid #d6e6e3',
  borderRadius: 14,
  padding: 14,
}

const primaryBtn: React.CSSProperties = {
  height: 40,
  padding: '0 14px',
  borderRadius: 12,
  border: '1px solid #2f6f73',
  background: '#2f6f73',
  color: '#ffffff',
  fontWeight: 900,
  cursor: 'pointer',
}

const secondaryBtn: React.CSSProperties = {
  height: 40,
  padding: '0 14px',
  borderRadius: 12,
  border: '1px solid #d6e6e3',
  background: '#ffffff',
  color: '#2f6f73',
  fontWeight: 900,
  cursor: 'pointer',
}

const primaryOutlineBtn: React.CSSProperties = {
  height: 34,
  padding: '0 12px',
  borderRadius: 12,
  border: '1px solid #2f6f73',
  background: '#ffffff',
  color: '#2f6f73',
  fontWeight: 900,
  cursor: 'pointer',
}

const dangerOutlineBtn: React.CSSProperties = {
  height: 34,
  padding: '0 12px',
  borderRadius: 12,
  border: '1px solid #9a4f4f',
  background: '#ffffff',
  color: '#9a4f4f',
  fontWeight: 900,
  cursor: 'pointer',
}

const iconBtn: React.CSSProperties = {
  height: 36,
  width: 36,
  padding: 0,
  lineHeight: 0,
  borderRadius: 12,
  border: '1px solid #d6e6e3',
  background: '#ffffff',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#2f6f73',
}

const labelStyle: React.CSSProperties = {
  display: 'grid',
  gap: 6,
}

const labelTextStyle: React.CSSProperties = {
  fontSize: 12,
  opacity: 0.8,
}

const inputStyle: React.CSSProperties = {
  height: 40,
  borderRadius: 12,
  border: '1px solid #d6e6e3',
  padding: '0 12px',
  fontSize: 14,
  outline: 'none',
  color: '#1f2933',
  background: '#ffffff',
}

function chip(color: string): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    height: 22,
    padding: '0 10px',
    borderRadius: 999,
    background: color,
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 900,
    textTransform: 'lowercase',
  }
}

/**
 * Date helpers (display MM/DD/YYYY; store as YYYY-MM-DD)
 */

function todayYmd() {
  const d = new Date()
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function toInclusiveEnd(endExclusiveYmd: string) {
  const d = ymdToDate(endExclusiveYmd)
  d.setDate(d.getDate() - 1)
  return formatYmd(d)
}

function toExclusiveEnd(inclusiveEndYmd: string) {
  const d = ymdToDate(inclusiveEndYmd)
  d.setDate(d.getDate() + 1)
  return formatYmd(d)
}

function ymdToDate(ymd: string) {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatYmd(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function formatDisplayDate(ymd: string) {
  const [y, m, d] = ymd.split('-')
  return `${m}/${d}/${y}`
}

function formatDisplayDateTime(iso: string) {
  // ISO timestamptz -> MM/DD/YYYY
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = pad2(d.getMonth() + 1)
  const day = pad2(d.getDate())
  return `${m}/${day}/${y}`
}

function ensureBlockedPrefix(label: string) {
  const l = label.trim()
  if (!l) return l
  return l.toLowerCase().startsWith('blocked') ? l : `Blocked: ${l}`
}