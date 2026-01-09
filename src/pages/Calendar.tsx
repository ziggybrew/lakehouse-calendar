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
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

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
    // arg.dateStr is YYYY-MM-DD
    setSelectedDate(arg.dateStr)
  }

  function closePanel() {
    setSelectedDate(null)
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

      {selectedDate && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.35)',
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
                <div>{selectedDate}</div>
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, opacity: 0.7 }}>Mode</div>
                <div>{bookingMode === 'weekend' ? 'Weekend (Fri–Sun)' : 'Week (Mon–Sun)'}</div>
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, opacity: 0.7 }}>Next</div>
                <div>
                  For now this is a stub. Next we’ll:
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