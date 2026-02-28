import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import { getMe, type MeResponse } from './api/client'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'

export default function App() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<MeResponse | null>(null)

  useEffect(() => {
    let active = true

    async function loadMe() {
      try {
        const me = await getMe()
        if (active) setUser(me)
      } catch {
        if (active) setUser(null)
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadMe()
    return () => { active = false }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading...
        </div>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route
        path="/dashboard"
        element={user ? <DashboardPage userEmail={user.email} /> : <Navigate to="/login" replace />}
      />
      <Route path="/watches/new" element={<Navigate to="/dashboard?tab=search" replace />} />
      <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
    </Routes>
  )
}
