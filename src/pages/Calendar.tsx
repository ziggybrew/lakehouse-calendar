// src/pages/Calendar.tsx
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { DateClickArg } from '@fullcalendar/interaction'
import type { EventClickArg } from '@fullcalendar/core'

type Booking = {
  id: string
  title: string
  start: string // YYYY-MM-DD
  end: string // YYYY-MM-DD (end-exclusive)
  notes?: string
  extendedProps?: {
    label: string
    initials: string
    isBlocked: boolean
    color: string
    bookingId: string
  }
}

type DraftBooking = {
  start: string // YYYY-MM-DD
  end: string // YYYY-MM-DD (end-exclusive)
  userIds: string[] // selected profile ids
  notes: string
}

type BookingRow = {
  id: string
  label: string
  start_date: string // YYYY-MM-DD
  end_date: string // YYYY-MM-DD (end-exclusive)
  notes: string | null
  is_blocked: boolean
}

type ProfileOption = {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  is_active: boolean
}

export default function Calendar() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [bookingsLoading, setBookingsLoading] = useState(false)
  const [bookingsError, setBookingsError] = useState<string | null>(null)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [profileOptions, setProfileOptions] = useState<ProfileOption[]>([])
  const [profilesLoading, setProfilesLoading] = useState(false)
  const [peoplePickerOpen, setPeoplePickerOpen] = useState(false)

  async function loadBookings() {
    setBookingsLoading(true)
    setBookingsError(null)
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('id,label,start_date,end_date,notes,is_blocked')
        .order('start_date', { ascending: true })

      if (error) {
        setBookings([])
        setBookingsError('Unable to load bookings. Please try again.')
        return
      }

      const rows = (data || []) as BookingRow[]

      const expanded: Booking[] = []
      for (const r of rows) {
        const label = r.label
        const initials = getTwoLetterInitials(label)
        const baseColor = r.is_blocked ? '#9a4f4f' : colorForLabel(label)

        // Expand into one event per day so avatars show on every day in month view.
        // end_date is stored end-exclusive.
        let cur = r.start_date
        while (cur < r.end_date) {
          const next = formatYmd(addDays(ymdToDate(cur), 1))

          expanded.push({
            id: `${r.id}-${cur}`,
            title: r.is_blocked ? `Blocked: ${label}` : label,
            start: cur,
            end: next,
            notes: r.notes || undefined,
            extendedProps: {
              label,
              initials,
              isBlocked: r.is_blocked,
              color: baseColor,
              bookingId: r.id,
            },
          })

          cur = next
        }
      }

      setBookings(expanded)
    } finally {
      setBookingsLoading(false)
    }
  }

  async function loadProfiles() {
    setProfilesLoading(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id,email,first_name,last_name,is_active')
        .eq('is_active', true)
        .order('first_name', { ascending: true })

      if (error) {
        setProfileOptions([])
        return
      }

      setProfileOptions((data || []) as ProfileOption[])
    } finally {
      setProfilesLoading(false)
    }
  }

  useEffect(() => {
    loadBookings()
    loadProfiles()

    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null)
    })
  }, [])

  const events = bookings

  const [draft, setDraft] = useState<DraftBooking | null>(null)
  const [activeDay, setActiveDay] = useState<string | null>(null)

  // Prevent background scrolling while any modal is open
  useEffect(() => {
    if (draft || activeDay) document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [draft, activeDay])

  function openBookingModal() {
    setSubmitError(null)
    const today = new Date()
    const start = formatYmd(today)
    const endExclusive = formatYmd(addDays(startOfDay(today), 1))

    setDraft({
      start,
      end: endExclusive,
      userIds: currentUserId ? [currentUserId] : [],
      notes: '',
    })
    setPeoplePickerOpen(false)
  }

  function closeBookingModal() {
    setSubmitError(null)
    setPeoplePickerOpen(false)
    setDraft(null)
  }

  function closeDayModal() {
    setActiveDay(null)
  }

  function onDayClick(arg: DateClickArg) {
    setActiveDay(arg.dateStr)
  }

  function onEventClick(arg: EventClickArg) {
    // In month view, events render as segments inside each day cell.
    // Use the closest day element to determine which date was clicked.
    const dayEl = (arg.el as HTMLElement).closest('.fc-daygrid-day') as HTMLElement | null
    const date = dayEl?.getAttribute('data-date')

    if (date) {
      setActiveDay(date)
      return
    }

    // Fallback: use the event start date
    const startStr = arg.event.startStr
    setActiveDay(startStr ? startStr.slice(0, 10) : null)
  }

  async function onSubmitBooking() {
    if (!draft) return

    if (!draft.userIds || draft.userIds.length === 0) {
      setSubmitError('Please select at least one person.')
      return
    }

    const label = labelFromSelectedUsers(draft.userIds, profileOptions).trim()
    if (!label) {
      setSubmitError('Please select at least one person.')
      return
    }

    if (!draft.start || !draft.end) {
      setSubmitError('Please select a valid date range.')
      return
    }

    setSubmitLoading(true)
    setSubmitError(null)

    try {
      const { data: userRes, error: userErr } = await supabase.auth.getUser()
      if (userErr || !userRes?.user?.id) {
        setSubmitError('Sign-in is required to book dates. Please sign in again.')
        return
      }

      const { error } = await supabase.from('bookings').insert({
        label,
        start_date: draft.start,
        end_date: draft.end, // already end-exclusive
        notes: (draft.notes || '').trim() ? (draft.notes || '').trim() : null,
        is_blocked: false,
        created_by: userRes.user.id,
      })

      if (error) {
        setSubmitError('Unable to save this entry. Please try again.')
        return
      }

      closeBookingModal()
      await loadBookings()
    } finally {
      setSubmitLoading(false)
    }
  }
function profileDisplayName(p: { first_name: string | null; last_name: string | null }) {
  const name = [p.first_name, p.last_name].filter(Boolean).join(' ').trim()
  return name || 'Unknown'
}

function labelFromSelectedUsers(selectedIds: string[], options: ProfileOption[]) {
  const byId = new Map(options.map((p) => [p.id, p]))
  const names = selectedIds
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((p) => profileDisplayName(p as ProfileOption))

  // Dedupe while preserving order
  const seen = new Set<string>()
  const unique = names.filter((n) => (seen.has(n) ? false : (seen.add(n), true)))
  return unique.join(', ')
}

  function toggleSelectedUserId(id: string) {
    if (!draft) return

    const has = draft.userIds.includes(id)
    const next = has ? draft.userIds.filter((x) => x !== id) : [...draft.userIds, id]
    setDraft({ ...draft, userIds: next })
  }

  const selectedPeopleLabel = useMemo(() => {
    if (!draft) return ''

    const label = labelFromSelectedUsers(draft.userIds, profileOptions)
    return label || 'Select people'
  }, [draft, profileOptions])

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 12px',
    borderRadius: 12,
    border: '1px solid rgba(47, 111, 115, 0.25)',
    background: 'rgba(255,255,255,0.95)',
    color: '#1f2933',
    fontFamily: 'inherit',
    fontSize: 14,
    lineHeight: 1.2,
    boxSizing: 'border-box',
  }

  const dayBookings = useMemo(() => {
    if (!activeDay) return []
    return bookingsForDay(bookings, activeDay)
  }, [bookings, activeDay])

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#eef4f3',
        color: '#1f2933',
        padding: 16,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <h1 style={{ margin: 0, fontSize: 28 }}>Calendar</h1>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          {bookingsError ? (
            <span style={{ fontSize: 13, color: '#9a4f4f', fontWeight: 800 }}>
              {bookingsError}
            </span>
          ) : bookingsLoading ? (
            <span style={{ fontSize: 13, opacity: 0.8, fontWeight: 800 }}>Loading…</span>
          ) : null}

          <button onClick={openBookingModal}>Book</button>

          <button
            type="button"
            onClick={loadBookings}
            aria-label="Refresh bookings"
            title="Refresh"
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              border: '1px solid rgba(47, 111, 115, 0.25)',
              background: 'rgba(255,255,255,0.85)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#2f6f73',
            }}
          >
            <span
              aria-hidden="true"
              style={{
                fontSize: 18,
                lineHeight: 1,
                fontWeight: 900,
              }}
            >
              ↻
            </span>
          </button>
        </div>
      </div>

      <style>
        {`
          /* FullCalendar palette: soft lake tones */
          .fc {
            --fc-border-color: #d6e6e3;
            --fc-page-bg-color: #ffffff;
            --fc-neutral-bg-color: #ffffff;
            --fc-neutral-text-color: #1f2933;

            --fc-today-bg-color: rgba(95, 167, 163, 0.18);

            --fc-event-bg-color: #2f6f73;
            --fc-event-border-color: #2f6f73;
            --fc-event-text-color: #ffffff;

            --fc-button-bg-color: #2f6f73;
            --fc-button-border-color: #2f6f73;
            --fc-button-text-color: #ffffff;

            --fc-button-hover-bg-color: #5fa7a3;
            --fc-button-hover-border-color: #5fa7a3;

            --fc-button-active-bg-color: #255b5e;
            --fc-button-active-border-color: #255b5e;
          }

          .fc .fc-toolbar-title {
            color: #1f2933;
            font-weight: 800;
            font-size: 18px;
          }

          .fc .fc-button-group {
            display: inline-flex;
            gap: 10px;
          }

          .fc .fc-col-header-cell-cushion,
          .fc .fc-daygrid-day-number {
            color: #1f2933;
          }

          /* Render events as avatars (no bars) */
          .fc .fc-daygrid-event {
            background: transparent !important;
            border: 0 !important;
            padding: 0 !important;
            margin: 2px 0 !important;
            box-shadow: none !important;
          }

          .fc .fc-daygrid-event .fc-event-main {
            padding: 0 !important;
          }

          .fc .fc-daygrid-event-harness {
            margin-top: 2px;
          }

          /* Center avatar events inside the day cell */
          .fc .fc-daygrid-event-harness {
            display: flex;
            justify-content: center;
          }

          .fc .fc-daygrid-event {
            justify-content: center;
          }

          .fc .fc-daygrid-event .fc-event-main-frame {
            justify-content: center;
          }
        `}
      </style>

      {/* Calendar */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #d6e6e3',
          borderRadius: 14,
          padding: 12,
        }}
      >
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          height="auto"
          events={events}
          selectable={false}
          dateClick={onDayClick}
          eventClick={onEventClick}
          eventContent={(arg) => {
            const p: any = arg.event.extendedProps || {}
            const initials = (p.initials || '').toString().slice(0, 2) || '??'
            const isBlocked = !!p.isBlocked

            return (
              <div
                title={arg.event.title}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 999,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  fontWeight: 900,
                  letterSpacing: 0.2,
                  color: '#ffffff',
                  background: isBlocked ? '#9a4f4f' : (p.color || '#2f6f73'),
                  border: '1px solid rgba(0,0,0,0.08)',
                  userSelect: 'none',
                }}
              >
                {initials}
              </div>
            )
          }}
          headerToolbar={{
            left: 'prev,next',
            center: 'title',
            right: '',
          }}
          titleFormat={{ year: 'numeric', month: 'long' }}
          dayCellContent={(arg) => {
            const d = arg.date
            return `${d.getMonth() + 1}/${d.getDate()}`
          }}
        />
      </div>

      {/* Day Details Modal */}
      {activeDay && (
        <Modal onClose={closeDayModal} title={formatDisplayDate(activeDay)}>
          {dayBookings.length === 0 ? (
            <div style={{ fontSize: 14 }}>
              <strong>No one is booked</strong>
              <div style={{ marginTop: 6, opacity: 0.8 }}>
                Use “Book" to indicate you will be here on this date!
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {dayBookings.map((b) => (
                <div
                  key={b.id}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: 10,
                    padding: 12,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      justifyContent: 'space-between',
                    }}
                  >
                    <strong>{b.title}</strong>
                    <span style={{ fontSize: 16, opacity: 0.75 }}>
                      {formatDisplayDate(b.start)} → {formatDisplayDate(toInclusiveEnd(b.end))}
                    </span>
                  </div>

                  {b.notes ? (
                    <div style={{ marginTop: 8, fontSize: 13, opacity: 0.9 }}>{b.notes}</div>
                  ) : (
                    <div style={{ marginTop: 8, fontSize: 13, opacity: 0.6 }}>
                      No notes provided.
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16, gap: 8 }}>
            <button onClick={closeDayModal}>Close</button>
          </div> */}
        </Modal>
      )}

      {/* Booking Modal */}
      {draft && (
        <Modal onClose={closeBookingModal} title="Book Your Dates!">
          <div style={{ marginTop: 8, display: 'grid', gap: 12 }}>
            <div>
              <div style={{ fontSize: 16, opacity: 0.7, marginBottom: 4 }}>Start date</div>
              <input
                type="date"
                value={draft.start}
                onClick={(e) => {
                  const el = e.currentTarget as any
                  if (typeof el.showPicker === 'function') el.showPicker()
                }}
                onFocus={(e) => {
                  const el = e.currentTarget as any
                  if (typeof el.showPicker === 'function') el.showPicker()
                }}
                onChange={(e) => setDraft({ ...draft, start: e.target.value })}
                style={{ ...inputStyle, cursor: 'pointer' }}
              />
            </div>

            <div>
              <div style={{ fontSize: 16, opacity: 0.7, marginBottom: 4 }}>
                End date
              </div>
              <input
                type="date"
                value={toInclusiveEnd(draft.end)}
                onClick={(e) => {
                  const el = e.currentTarget as any
                  if (typeof el.showPicker === 'function') el.showPicker()
                }}
                onFocus={(e) => {
                  const el = e.currentTarget as any
                  if (typeof el.showPicker === 'function') el.showPicker()
                }}
                onChange={(e) =>
                  setDraft({ ...draft, end: toExclusiveEnd(e.target.value) })
                }
                style={{ ...inputStyle, cursor: 'pointer' }}
              />
            </div>

            <div>
              <div style={{ fontSize: 16, opacity: 0.7, marginBottom: 4 }}>Guest(s)</div>

              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setPeoplePickerOpen((v) => !v)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '12px 12px',
                    borderRadius: 12,
                    border: '1px solid rgba(47, 111, 115, 0.25)',
                    background: 'rgba(255,255,255,0.95)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 800, color: '#1f2933', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedPeopleLabel}
                  </span>
                  <span aria-hidden="true" style={{ opacity: 0.75, fontWeight: 900 }}>
                    {peoplePickerOpen ? '▴' : '▾'}
                  </span>
                </button>

                {peoplePickerOpen ? (
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      marginTop: 8,
                      borderRadius: 12,
                      border: '1px solid rgba(47, 111, 115, 0.25)',
                      background: 'rgba(255,255,255,0.98)',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
                      padding: 10,
                      zIndex: 5,
                      maxHeight: 220,
                      overflowY: 'auto',
                    }}
                  >
                    {profilesLoading ? (
                      <div style={{ fontSize: 13, opacity: 0.75, padding: 8 }}>Loading…</div>
                    ) : profileOptions.length === 0 ? (
                      <div style={{ fontSize: 13, opacity: 0.75, padding: 8 }}>No users available</div>
                    ) : (
                      <div style={{ display: 'grid', gap: 6 }}>
                        {profileOptions.map((p) => {
                          const checked = draft.userIds.includes(p.id)
                          const name = profileDisplayName(p)

                          return (
                            <label
                              key={p.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                padding: '10px 10px',
                                borderRadius: 10,
                                cursor: 'pointer',
                                border: checked ? '1px solid rgba(47, 111, 115, 0.35)' : '1px solid transparent',
                                background: checked ? 'rgba(95, 167, 163, 0.10)' : 'transparent',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleSelectedUserId(p.id)}
                                style={{ width: 16, height: 16 }}
                              />
                              <span style={{ fontSize: 14, fontWeight: 900, color: '#1f2933' }}>{name}</span>
                            </label>
                          )
                        })}
                      </div>
                    )}

                    <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
                      <button type="button" onClick={() => setPeoplePickerOpen(false)} style={{ padding: '10px 12px' }}>
                        Done
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
                Tap to select one or more people.
              </div>
            </div>

            <div>
              <div style={{ fontSize: 16, opacity: 0.7, marginBottom: 4 }}>
                Notes (optional)
              </div>
              <textarea
                rows={3}
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                style={{ ...inputStyle, resize: 'vertical', cursor: 'text' }}
              />
            </div>
          </div>

          {submitError ? (
            <div
              style={{
                marginTop: 12,
                padding: 10,
                borderRadius: 12,
                border: '1px solid rgba(154, 79, 79, 0.35)',
                background: 'rgba(154, 79, 79, 0.08)',
                color: '#9a4f4f',
                fontSize: 13,
                fontWeight: 900,
              }}
            >
              {submitError}
            </div>
          ) : null}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16, gap: 8 }}>
            <button onClick={closeBookingModal} disabled={submitLoading}>
              Cancel
            </button>
            <button
              onClick={onSubmitBooking}
              disabled={submitLoading || !draft.start || !draft.end || draft.userIds.length === 0}
            >
              {submitLoading ? 'Saving…' : 'Submit'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function Modal(props: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.65)',
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
          width: 'min(620px, 100%)',
          background: 'white',
          color: '#111827',
          borderRadius: 12,
          padding: 16,
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <strong>{props.title}</strong>
          <button onClick={props.onClose}>X</button>
        </div>

        <div style={{ marginTop: 12 }}>{props.children}</div>
      </div>
    </div>
  )
}

function formatDisplayDate(ymd: string) {
  const [y, m, d] = ymd.split('-')
  return `${m}/${d}/${y}`
}

function getTwoLetterInitials(label: string) {
  const parts = (label || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (parts.length === 0) return '??'

  const first = parts[0]
  const last = parts.length > 1 ? parts[parts.length - 1] : parts[0]

  const a = (first[0] || '').toUpperCase()
  const b = (last[0] || '').toUpperCase()

  // If only one word, use first two letters when available
  if (parts.length === 1) {
    const two = (first.slice(0, 2) || '').toUpperCase()
    return two.length === 2 ? two : (a + (first[1] ? first[1].toUpperCase() : a || '?'))
  }

  return (a + b) || '??'
}

const USER_COLOR_PALETTE = [
  '#2f6f73',
  '#5fa7a3',
  '#3f7f6b',
  '#6b8bbd',
  '#7a6bbd',
  '#b36b9c',
  '#c27d4a',
  '#4b9ab8',
  '#2f8a6a',
  '#8a6a2f',
]

function hashStringToIndex(input: string, modulo: number) {
  let h = 0
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0
  }
  return modulo === 0 ? 0 : h % modulo
}

function colorForLabel(label: string) {
  const key = (label || '').trim().toLowerCase() || 'unknown'
  const idx = hashStringToIndex(key, USER_COLOR_PALETTE.length)
  return USER_COLOR_PALETTE[idx]
}

/**
 * Utilities
 */

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function formatYmd(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function ymdToDate(ymd: string) {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addDays(date: Date, days: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
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

function isDayWithinRange(
  dayYmd: string,
  startYmd: string,
  endExclusiveYmd: string
) {
  return startYmd <= dayYmd && dayYmd < endExclusiveYmd
}

function bookingsForDay(bookings: Booking[], dayYmd: string) {
  return bookings
    .filter((b) => isDayWithinRange(dayYmd, b.start, b.end))
    .sort((a, b) => (a.title || '').localeCompare(b.title || ''))
}