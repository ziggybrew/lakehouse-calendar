import { useMemo, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { DateClickArg } from '@fullcalendar/interaction'

type Booking = {
  id: string
  title: string
  start: string // YYYY-MM-DD
  end: string // YYYY-MM-DD (FullCalendar treats end as exclusive in many cases)
}

type BookingMode = 'weekend' | 'week'

export default function Calendar() {
  const [bookingMode, setBookingMode] = useState<BookingMode>('weekend')
  const [selectedRange, setSelectedRange] = useState<{ start: string; end: string } | null>(null)

  const events: Booking[] = useMemo(
    () => [
      {
        id: '1',
        title: 'Booked - Zack',
        start: '2026-01-16',
        end: '2026-01-19',
      },
      {
        id: '2',
        title: 'Booked - Family',
        start: '2026-02-06',
        end: '2026-02-09',
      },
    ],
    []
  )

  function onDateClick(arg: DateClickArg) {
    const range =
        bookingMode === 'weekend'
        ? getWeekendRange(arg.date)
        : getWeekRange(arg.date)

    setSelectedRange({
        start: formatYmd(range.start),
        end: formatYmd(range.endExclusive),
    })
}

  function closePanel() {
    setSelectedRange(null)
  }

  function pad2(n: number) {
    return String(n).padStart(2, '0')
  }

  function formatYmd(d: Date) {
    // Local date -> YYYY-MM-DD (avoids timezone drift from toISOString)
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
  }

  function addDays(date: Date, days: number) {
    const d = new Date(date)
    d.setDate(d.getDate() + days)
    return d
  }

  function startOfDay(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate())
  }

  function getWeekendRange(clicked: Date) {
    // Weekend = Fri–Sun, endExclusive = Monday
    const d = startOfDay(clicked)
    const dow = d.getDay() // 0=Sun, 1=Mon, ... 5=Fri, 6=Sat

    let offsetToFriday = 0

    if (dow === 0) offsetToFriday = -2 // Sun -> previous Fri
    else if (dow === 6) offsetToFriday = -1 // Sat -> previous Fri
    else if (dow === 5) offsetToFriday = 0 // Fri -> Fri
    else offsetToFriday = 5 - dow // Mon-Thu -> upcoming Fri

    const start = addDays(d, offsetToFriday)
    const endExclusive = addDays(start, 3) // Fri + 3 = Monday

    return { start, endExclusive }
  }

  function getWeekRange(clicked: Date) {
    // Week = Mon–Sun, endExclusive = next Monday
    const d = startOfDay(clicked)
    const dow = d.getDay() // 0=Sun, 1=Mon, ... 6=Sat

    const offsetToMonday = dow === 0 ? -6 : 1 - dow // Sun -> previous Mon, else snap back to Mon
    const start = addDays(d, offsetToMonday)
    const endExclusive = addDays(start, 7) // next Monday

    return { start, endExclusive }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <h1 style={{ margin: 0 }}>Calendar</h1>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, opacity: 0.7 }}>Booking mode:</span>
          <button
            onClick={() => setBookingMode('weekend')}
            disabled={bookingMode === 'weekend'}
          >
            Weekend
          </button>
          <button
            onClick={() => setBookingMode('week')}
            disabled={bookingMode === 'week'}
          >
            Week
          </button>
        </div>
      </div>

      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        height="auto"
        events={events}
        dateClick={onDateClick}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: '',
        }}
      />

      {selectedRange && (
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
          onClick={closePanel}
        >
          <div
            style={{
              width: 'min(520px, 100%)',
              background: 'white',
              color: '#111827',
              borderRadius: 12,
              padding: 16,
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <strong>New booking</strong>
              <button onClick={closePanel}>Close</button>
            </div>

            <div style={{ marginTop: 12, fontSize: 14 }}>
              <div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>Selected date</div>
                <div>{selectedRange.start} → {selectedRange.end}</div>
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, opacity: 0.7 }}>Mode</div>
                <div>{bookingMode === 'weekend' ? 'Weekend (Fri–Sun)' : 'Week (Mon–Sun)'}</div>
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, opacity: 0.7 }}>Next</div>
                <div>
                  For now this is a stub. Next steps include:
                  <ul style={{ marginTop: 8 }}>
                    <li>Auto-calculate start/end based on weekend vs week</li>
                    <li>Detect conflicts with existing bookings</li>
                    <li>Add “Booked for” name + notes</li>
                    <li>Persist to Firebase/Supabase</li>
                  </ul>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button onClick={closePanel}>Cancel</button>
              <button
                onClick={() => {
                  alert('Stub: create booking')
                  closePanel()
                }}
              >
                Create booking (stub)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}