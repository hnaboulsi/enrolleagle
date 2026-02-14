import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { deleteWatch, listWatches, logout, updateWatch, type Watch } from '../api/client'
import WatchTable from '../components/WatchTable'

type Props = {
  userEmail: string
}

export default function DashboardPage({ userEmail }: Props) {
  const [watches, setWatches] = useState<Watch[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const items = await listWatches()
      setWatches(items)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function handleToggleActive(watch: Watch) {
    await updateWatch(watch.id, { is_active: !watch.is_active })
    await load()
  }

  async function handleDelete(watch: Watch) {
    await deleteWatch(watch.id)
    await load()
  }

  async function handleLogout() {
    await logout()
    window.location.href = '/login'
  }

  return (
    <div className="page-shell">
      <header className="topbar">
        <div>
          <h1>Dashboard</h1>
          <p className="subtle">Signed in as {userEmail}</p>
        </div>
        <div className="actions-inline">
          <Link className="button-link" to="/watches/new">
            Add Watch
          </Link>
          <button onClick={handleLogout}>Log out</button>
        </div>
      </header>

      {error ? <div className="error">{error}</div> : null}

      {loading ? <div className="panel">Loading watches...</div> : null}
      {!loading ? (
        <WatchTable watches={watches} onToggleActive={handleToggleActive} onDelete={handleDelete} />
      ) : null}
    </div>
  )
}
