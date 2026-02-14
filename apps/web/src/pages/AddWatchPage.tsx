import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import AddWatchForm, { type AddWatchPayload } from '../components/AddWatchForm'
import { createWatch } from '../api/client'

export default function AddWatchPage() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(payload: AddWatchPayload) {
    setSubmitting(true)
    setError(null)
    try {
      await createWatch(payload)
      navigate('/dashboard')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page-shell">
      <header className="topbar">
        <div>
          <h1>Add Watch</h1>
          <p className="subtle">Create a watch for a section and term.</p>
        </div>
        <Link className="button-link" to="/dashboard">
          Back
        </Link>
      </header>

      {error ? <div className="error">{error}</div> : null}
      <AddWatchForm onSubmit={handleSubmit} submitting={submitting} />
    </div>
  )
}
