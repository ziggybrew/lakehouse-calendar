export const DEMO_USER_ID = 'demo-user-zack'

const DEMO_AUTH_KEY = 'lakehouse_demo'
const DEMO_DATA_KEY = 'lakehouse_demo_data'

let demoAuthMemory = false
let demoDataMemory: DemoData | null = null

export type DemoProfile = {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  is_active: boolean
  role: 'admin' | 'member'
}

export type DemoBooking = {
  id: string
  label: string
  start_date: string
  end_date: string
  notes: string | null
  is_blocked: boolean
  created_by: string
}

export type DemoAccessRequest = {
  id: string
  email: string
  first_name: string
  last_name: string
  phone: string | null
  invite_code: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

type DemoData = {
  profiles: DemoProfile[]
  bookings: DemoBooking[]
  accessRequests: DemoAccessRequest[]
}

function todayYmd() {
  const now = new Date()
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function addDaysYmd(ymd: string, days: number) {
  const [year, month, day] = ymd.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  date.setDate(date.getDate() + days)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function createInitialDemoData(): DemoData {
  const today = todayYmd()

  const profiles: DemoProfile[] = [
    {
      id: DEMO_USER_ID,
      email: 'demo@lakehousecalendar.app',
      first_name: 'Zack',
      last_name: 'Demo',
      avatar_url: null,
      is_active: true,
      role: 'admin',
    },
    {
      id: 'demo-user-amy',
      email: 'amy@example.com',
      first_name: 'Amy',
      last_name: 'Miller',
      avatar_url: null,
      is_active: true,
      role: 'member',
    },
    {
      id: 'demo-user-ben',
      email: 'ben@example.com',
      first_name: 'Ben',
      last_name: 'Carter',
      avatar_url: null,
      is_active: true,
      role: 'member',
    },
    {
      id: 'demo-user-nina',
      email: 'nina@example.com',
      first_name: 'Nina',
      last_name: 'Patel',
      avatar_url: null,
      is_active: true,
      role: 'member',
    },
  ]

  return {
    profiles,
    bookings: [
      {
        id: 'demo-booking-1',
        label: 'Amy Miller',
        start_date: addDaysYmd(today, 3),
        end_date: addDaysYmd(today, 6),
        notes: 'Long weekend with family.',
        is_blocked: false,
        created_by: 'demo-user-amy',
      },
      {
        id: 'demo-booking-2',
        label: 'Ben Carter, Nina Patel',
        start_date: addDaysYmd(today, 10),
        end_date: addDaysYmd(today, 13),
        notes: 'Planning to arrive Friday evening.',
        is_blocked: false,
        created_by: 'demo-user-ben',
      },
      {
        id: 'demo-booking-3',
        label: 'Dock maintenance',
        start_date: addDaysYmd(today, 18),
        end_date: addDaysYmd(today, 20),
        notes: 'Contractor has the property blocked.',
        is_blocked: true,
        created_by: DEMO_USER_ID,
      },
      {
        id: 'demo-booking-4',
        label: 'Zack Demo',
        start_date: addDaysYmd(today, 24),
        end_date: addDaysYmd(today, 27),
        notes: 'Demo user booking.',
        is_blocked: false,
        created_by: DEMO_USER_ID,
      },
    ],
    accessRequests: [
      {
        id: 'demo-access-1',
        email: 'sarah@example.com',
        first_name: 'Sarah',
        last_name: 'Nguyen',
        phone: '555-0148',
        invite_code: 'LAKEHOUSE',
        status: 'pending',
        created_at: new Date().toISOString(),
      },
    ],
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function readDemoData(): DemoData {
  try {
    const raw = window.sessionStorage?.getItem(DEMO_DATA_KEY)
    if (raw) return JSON.parse(raw) as DemoData
  } catch {
    if (demoDataMemory) return clone(demoDataMemory)
  }

  const data = createInitialDemoData()
  writeDemoData(data)
  return data
}

function writeDemoData(data: DemoData) {
  demoDataMemory = clone(data)
  try {
    window.sessionStorage?.setItem(DEMO_DATA_KEY, JSON.stringify(data))
  } catch {
    // In-memory fallback keeps demo mode functional when browser storage is unavailable.
  }
}

export function isDemoMode() {
  if (demoAuthMemory) return true

  try {
    return window.localStorage?.getItem(DEMO_AUTH_KEY) === '1'
  } catch {
    return false
  }
}

export function startDemoSession() {
  demoAuthMemory = true
  try {
    window.localStorage?.setItem(DEMO_AUTH_KEY, '1')
  } catch {
    // In-memory fallback keeps demo mode functional when browser storage is unavailable.
  }
  writeDemoData(createInitialDemoData())
}

export function endDemoSession() {
  demoAuthMemory = false
  demoDataMemory = null
  try {
    window.localStorage?.removeItem(DEMO_AUTH_KEY)
    window.sessionStorage?.removeItem(DEMO_DATA_KEY)
  } catch {
    // Storage may be unavailable in embedded/test browsers.
  }
}

export function getDemoProfile(id = DEMO_USER_ID) {
  return clone(readDemoData().profiles.find((p) => p.id === id) ?? readDemoData().profiles[0])
}

export function listDemoProfiles() {
  return clone(readDemoData().profiles)
}

export function updateDemoProfile(id: string, updates: Partial<Pick<DemoProfile, 'first_name' | 'last_name' | 'avatar_url' | 'is_active'>>) {
  const data = readDemoData()
  data.profiles = data.profiles.map((profile) =>
    profile.id === id ? { ...profile, ...updates } : profile
  )
  writeDemoData(data)
}

export function listDemoBookings() {
  return clone(readDemoData().bookings).sort((a, b) => a.start_date.localeCompare(b.start_date))
}

export function listDemoBookingsForUser(userId = DEMO_USER_ID) {
  return listDemoBookings().filter((booking) => booking.created_by === userId)
}

export function upsertDemoBooking(booking: Omit<DemoBooking, 'id'> & { id?: string }) {
  const data = readDemoData()
  if (booking.id) {
    data.bookings = data.bookings.map((existing) =>
      existing.id === booking.id ? { ...existing, ...booking, id: existing.id } : existing
    )
  } else {
    data.bookings.push({
      ...booking,
      id: `demo-booking-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    })
  }
  writeDemoData(data)
}

export function deleteDemoBooking(id: string) {
  const data = readDemoData()
  data.bookings = data.bookings.filter((booking) => booking.id !== id)
  writeDemoData(data)
}

export function listDemoAccessRequests() {
  return clone(readDemoData().accessRequests).sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export function updateDemoAccessRequest(id: string, status: DemoAccessRequest['status']) {
  const data = readDemoData()
  data.accessRequests = data.accessRequests.map((request) =>
    request.id === id ? { ...request, status } : request
  )
  writeDemoData(data)
}
