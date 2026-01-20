// src/pages/Calendar.tsx
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { DateClickArg } from '@fullcalendar/interaction'

type Booking = {
  id: string
  title: string
  start: string // YYYY-MM-DD
  end: string // YYYY-MM-DD (end-exclusive)
  notes?: string
}

type DraftBooking = {
  start: string // YYYY-MM-DD
  end: string // YYYY-MM-DD (end-exclusive)
  title: string
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

export default function Calendar() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [bookingsLoading, setBookingsLoading] = useState(false)
  const [bookingsError, setBookingsError] = useState<string | null>(null)

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
      setBookings(
        rows.map((r) => ({
          id: r.id,
          title: r.is_blocked ? `Blocked: ${r.label}` : r.label,
          start: r.start_date,
          end: r.end_date,
          notes: r.notes || undefined,
        }))
      )
    } finally {
      setBookingsLoading(false)
    }
  }

  useEffect(() => {
    loadBookings()
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
    const today = new Date()
    const start = formatYmd(today)
    const endExclusive = formatYmd(addDays(startOfDay(today), 1))

    setDraft({
      start,
      end: endExclusive,
      title: '',
      notes: '',
    })
  }

  function closeBookingModal() {
    setDraft(null)
  }

  function closeDayModal() {
    setActiveDay(null)
  }

  function onDayClick(arg: DateClickArg) {
    setActiveDay(arg.dateStr)
  }

  function onCreateEntryStub() {
    alert(
      [
        'Create entry (stub)',
        '',
        `Label: ${draft?.title || '(none)'}`,
        `Start: ${draft?.start}`,
        `End (exclusive): ${draft?.end}`,
        `Notes: ${draft?.notes || '(none)'}`,
      ].join('\n')
    )
    closeBookingModal()
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

          <button onClick={loadBookings} style={{ opacity: 0.9 }}>
            Refresh
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
          }

          .fc .fc-button-group {
            display: inline-flex;
            gap: 10px;
          }

          .fc .fc-col-header-cell-cushion,
          .fc .fc-daygrid-day-number {
            color: #1f2933;
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
          headerToolbar={{
            left: 'prev,next',
            center: 'title',
            right: '',
          }}
          titleFormat={{ year: 'numeric', month: '2-digit' }}
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
                onChange={(e) => setDraft({ ...draft, start: e.target.value })}
              />
            </div>

            <div>
              <div style={{ fontSize: 16, opacity: 0.7, marginBottom: 4 }}>
                End date
              </div>
              <input
                type="date"
                value={toInclusiveEnd(draft.end)}
                onChange={(e) =>
                  setDraft({ ...draft, end: toExclusiveEnd(e.target.value) })
                }
              />
            </div>

            <div>
              <div style={{ fontSize: 16, opacity: 0.7, marginBottom: 4 }}>Name(s)</div>
              <input
                type="text"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <div style={{ fontSize: 16, opacity: 0.7, marginBottom: 4 }}>
                Notes (optional)
              </div>
              <textarea
                rows={3}
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>

            {/* <div style={{ fontSize: 16, opacity: 0.7 }}>
              Next steps include: persisting entries, adding authentication, and
              improving the display of overlapping entries.
            </div> */}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16, gap: 8 }}>
            <button onClick={closeBookingModal}>Cancel</button>
            <button onClick={onCreateEntryStub} disabled={!draft.start || !draft.end}>
              Submit
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