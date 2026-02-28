import type { Watch } from '../api/client'
import SeatBadge from './SeatBadge'

type Props = {
  watches: Watch[]
  loading: boolean
  onToggleActive: (watch: Watch) => void
  onDelete: (watch: Watch) => void
}

function formatDate(value: string | null) {
  if (!value) return 'Never'
  return new Date(value).toLocaleString()
}

function timeUntil(isoDate: string): string {
  const diff = new Date(isoDate).getTime() - Date.now()
  if (diff <= 0) return 'Now'
  const mins = Math.round(diff / 60000)
  if (mins < 60) return `${mins}m`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

export default function WatchesPanel({ watches, loading, onToggleActive, onDelete }: Props) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((n) => (
          <div key={n} className="animate-pulse rounded-xl bg-white/60 border border-slate-200 p-4">
            <div className="h-4 bg-slate-200 rounded w-1/2 mb-2" />
            <div className="h-3 bg-slate-100 rounded w-1/3" />
          </div>
        ))}
      </div>
    )
  }

  if (watches.length === 0) {
    return (
      <div className="rounded-xl bg-white/60 border border-slate-200 p-8 text-center">
        <div className="text-4xl mb-3">👀</div>
        <p className="text-slate-500 font-medium">No watches yet</p>
        <p className="text-slate-400 text-sm mt-1">
          Search for classes and click "Watch" to start tracking seats
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {watches.map((watch) => (
        <div
          key={watch.id}
          className={`rounded-xl border p-4 transition-colors ${
            watch.is_active
              ? 'bg-white/80 border-slate-200 shadow-sm'
              : 'bg-slate-50/60 border-slate-200 opacity-70'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm text-slate-800">{watch.section_ref}</span>
                <SeatBadge
                  status={watch.is_active ? watch.last_status : 'PAUSED'}
                  openSeats={watch.last_open_seats}
                  waitlistSeats={watch.last_waitlist_open_seats}
                />
                {!watch.is_active && (
                  <span className="inline-flex items-center rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-500">
                    Paused
                  </span>
                )}
              </div>
              <div className="mt-1.5 flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                <span>{watch.provider}</span>
                <span>•</span>
                <span>{watch.term_ref}</span>
                {watch.last_checked_at && (
                  <>
                    <span>•</span>
                    <span>Checked: {formatDate(watch.last_checked_at)}</span>
                  </>
                )}
                {watch.is_active && (
                  <>
                    <span>•</span>
                    <span>Next: {timeUntil(watch.next_run_at)}</span>
                  </>
                )}
              </div>
              {watch.last_open_seats != null && (
                <p className="text-xs text-slate-500 mt-1">
                  Seats: {watch.last_open_seats}
                  {watch.last_waitlist_open_seats != null && (
                    <span> | Waitlist: {watch.last_waitlist_open_seats}</span>
                  )}
                </p>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => onToggleActive(watch)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                {watch.is_active ? 'Pause' : 'Resume'}
              </button>
              <button
                onClick={() => onDelete(watch)}
                className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
