import { useState } from 'react'
import type { Watch } from '../api/client'
import SeatBadge from './SeatBadge'

type Props = {
  watches: Watch[]
  loading: boolean
  onToggleActive: (watch: Watch) => Promise<void>
  onDelete: (watch: Watch) => Promise<void>
  onGoToSearch: () => void
}

function formatDate(value: string | null) {
  if (!value) return 'Never checked'
  return new Date(value).toLocaleString()
}

function timeUntil(isoDate: string): string {
  const diff = new Date(isoDate).getTime() - Date.now()
  if (diff <= 0) return 'Checking now'
  const mins = Math.round(diff / 60000)
  if (mins < 60) return `In ${mins}m`
  return `In ${Math.floor(mins / 60)}h ${mins % 60}m`
}

function formatCadence(seconds: number) {
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `Every ${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return remainder === 0 ? `Every ${hours} hr` : `Every ${hours} hr ${remainder} min`
}

function SummaryChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  )
}

type WatchSectionProps = {
  title: string
  description: string
  watches: Watch[]
  busyId: string | null
  onDelete: (watch: Watch) => Promise<void>
  onToggleActive: (watch: Watch) => Promise<void>
}

function WatchSection({
  title,
  description,
  watches,
  busyId,
  onDelete,
  onToggleActive,
}: WatchSectionProps) {
  if (watches.length === 0) return null

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>

      {watches.map((watch) => {
        const isBusy = busyId === watch.id

        return (
          <article
            key={watch.id}
            className={`rounded-[1.75rem] border p-5 transition-colors ${
              watch.is_active
                ? 'border-slate-200 bg-white/90 shadow-sm'
                : 'border-slate-200 bg-slate-50/90'
            }`}
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {watch.provider}
                  </span>
                  <SeatBadge
                    status={watch.is_active ? watch.last_status : 'PAUSED'}
                    openSeats={watch.last_open_seats}
                    waitlistSeats={watch.last_waitlist_open_seats}
                  />
                  <span className="font-display text-sm text-slate-900">{watch.section_ref}</span>
                </div>

                <div className="mt-3 grid gap-2 text-sm text-slate-500 sm:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Term</p>
                    <p className="mt-1 text-slate-700">{watch.term_ref}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Last checked</p>
                    <p className="mt-1 text-slate-700">{formatDate(watch.last_checked_at)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Next run</p>
                    <p className="mt-1 text-slate-700">
                      {watch.is_active ? timeUntil(watch.next_run_at) : 'Paused'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Cadence</p>
                    <p className="mt-1 text-slate-700">{formatCadence(watch.cadence_seconds)}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
                  <span className="rounded-full bg-slate-100 px-3 py-1">
                    Seats: {watch.last_open_seats ?? 'Unknown'}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1">
                    Waitlist: {watch.last_waitlist_open_seats ?? 'Unknown'}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1">
                    {watch.notify_on_waitlist ? 'Waitlist alerts on' : 'Waitlist alerts off'}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2 lg:min-w-[11rem]">
                <button
                  onClick={() => onToggleActive(watch)}
                  disabled={isBusy}
                  className="rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isBusy ? 'Saving...' : watch.is_active ? 'Pause tracking' : 'Resume tracking'}
                </button>
                <button
                  onClick={() => onDelete(watch)}
                  disabled={isBusy}
                  className="rounded-2xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Remove watch
                </button>
              </div>
            </div>
          </article>
        )
      })}
    </section>
  )
}

export default function WatchesPanel({
  watches,
  loading,
  onToggleActive,
  onDelete,
  onGoToSearch,
}: Props) {
  const [busyId, setBusyId] = useState<string | null>(null)
  const activeWatches = watches.filter((watch) => watch.is_active)
  const pausedWatches = watches.filter((watch) => !watch.is_active)
  const openSeatWatches = watches.filter((watch) => watch.last_status === 'OPEN').length

  async function handleToggleActive(watch: Watch) {
    setBusyId(watch.id)
    try {
      await onToggleActive(watch)
    } finally {
      setBusyId(null)
    }
  }

  async function handleDelete(watch: Watch) {
    setBusyId(watch.id)
    try {
      await onDelete(watch)
    } finally {
      setBusyId(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((item) => (
          <div
            key={item}
            className="animate-pulse rounded-[1.75rem] border border-slate-200 bg-white/70 p-5 shadow-sm"
          >
            <div className="h-4 w-36 rounded-full bg-slate-200" />
            <div className="mt-4 h-4 w-full rounded-full bg-slate-100" />
            <div className="mt-2 h-4 w-2/3 rounded-full bg-slate-100" />
          </div>
        ))}
      </div>
    )
  }

  if (watches.length === 0) {
    return (
      <div className="rounded-[2rem] border border-slate-200 bg-white/80 p-8 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
          <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M4 12c2.2-4 5.18-6 8-6s5.8 2 8 6c-2.2 4-5.18 6-8 6s-5.8-2-8-6z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.8" />
          </svg>
        </div>
        <p className="font-display mt-5 text-xs uppercase tracking-[0.22em] text-teal-700">No watches yet</p>
        <h2 className="mt-2 text-xl font-semibold text-slate-900">You have not started tracking any sections</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
          Use the search tab to find a class first, then save the sections you want EnrollEagle to
          monitor.
        </p>
        <button
          onClick={onGoToSearch}
          className="mt-6 rounded-2xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2"
        >
          Find classes to track
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[2rem] border border-teal-100 bg-white/85 p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-display text-xs uppercase tracking-[0.22em] text-teal-700">Step 3</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">Keep track of everything in one place</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Active watches keep checking automatically. Pause anything you do not need right now,
              and remove a watch once you are done with it.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <SummaryChip label="Total" value={String(watches.length)} />
            <SummaryChip label="Active" value={String(activeWatches.length)} />
            <SummaryChip label="Open seats" value={String(openSeatWatches)} />
          </div>
        </div>
      </section>

      <WatchSection
        title="Active watches"
        description="These sections are being checked automatically."
        watches={activeWatches}
        busyId={busyId}
        onDelete={handleDelete}
        onToggleActive={handleToggleActive}
      />

      <WatchSection
        title="Paused watches"
        description="Resume any watch when you want alerts again."
        watches={pausedWatches}
        busyId={busyId}
        onDelete={handleDelete}
        onToggleActive={handleToggleActive}
      />
    </div>
  )
}
