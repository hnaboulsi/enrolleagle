import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import { getMe, type MeResponse } from './api/client'
import AddWatchPage from './pages/AddWatchPage'
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
        if (active) {
          setUser(me)
        }
      } catch {
        if (active) {
          setUser(null)
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void loadMe()

    return () => {
      active = false
    }
  }, [])

  if (loading) {
    return <div className="center-screen">Loading...</div>
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route
        path="/dashboard"
        element={user ? <DashboardPage userEmail={user.email} /> : <Navigate to="/login" replace />}
      />
      <Route path="/watches/new" element={user ? <AddWatchPage /> : <Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
    </Routes>
  )
}
