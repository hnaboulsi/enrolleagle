import type { Watch } from '../api/client'

type Props = {
  watches: Watch[]
  onToggleActive: (watch: Watch) => Promise<void>
  onDelete: (watch: Watch) => Promise<void>
}

function formatDate(value: string | null) {
  if (!value) return 'Never'
  const date = new Date(value)
  return date.toLocaleString()
}

export default function WatchTable({ watches, onToggleActive, onDelete }: Props) {
  if (watches.length === 0) {
    return <div className="panel">No watches yet.</div>
  }

  return (
    <div className="panel">
      <table className="watch-table">
        <thead>
          <tr>
            <th>Provider</th>
            <th>Section</th>
            <th>Status</th>
            <th>Open Seats</th>
            <th>Next Run</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {watches.map((watch) => (
            <tr key={watch.id}>
              <td>{watch.provider}</td>
              <td>
                {watch.section_ref}
                <div className="subtle">{watch.term_ref}</div>
              </td>
              <td>
                <span className={`pill pill-${watch.last_status.toLowerCase()}`}>{watch.last_status}</span>
              </td>
              <td>{watch.last_open_seats ?? '-'}</td>
              <td>{formatDate(watch.next_run_at)}</td>
              <td>
                <div className="actions-inline">
                  <button onClick={() => onToggleActive(watch)}>
                    {watch.is_active ? 'Pause' : 'Activate'}
                  </button>
                  <button className="danger" onClick={() => onDelete(watch)}>
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
