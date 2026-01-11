import TopNav from './TopNav'
import { Outlet } from 'react-router-dom'

export default function AppShell() {
  return (
    <div>
      <TopNav />
      <main style={{ padding: 16 }}>
        <Outlet />
      </main>
    </div>
  )
}