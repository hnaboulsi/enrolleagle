import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import {
  createWatchFromSearch,
  deleteWatch,
  getClasses,
  listWatches,
  logout,
  updateWatch,
  type CatalogSearchResult,
  type Watch,
} from '../api/client'
import AdvancedAddWatch from '../components/AdvancedAddWatch'
import ClassResults from '../components/ClassResults'
import SearchFilters, { type FilterValues } from '../components/SearchFilters'
import WatchesPanel from '../components/WatchesPanel'

type Props = {
  userEmail: string
}

type Tab = 'search' | 'watches'

type Notice = {
  tone: 'success' | 'error'
  message: string
  actionLabel?: string
  actionTab?: Tab
}

function SummaryCard({ label, value, detail }: { detail: string; label: string; value: string }) {
  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{detail}</p>
    </div>
  )
}

export default function DashboardPage({ userEmail }: Props) {
  const [searchParams, setSearchParams] = useSearchParams()

  const tabParam = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState<Tab>(tabParam === 'watches' ? 'watches' : 'search')
  const [filters, setFilters] = useState<FilterValues>({
    schoolId: searchParams.get('school') || '',
    termRef: searchParams.get('term') || '',
    subjectCode: searchParams.get('subject') || '',
  })
  const [searchResult, setSearchResult] = useState<CatalogSearchResult | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [watches, setWatches] = useState<Watch[]>([])
  const [watchesLoading, setWatchesLoading] = useState(true)
  const [watchedSections, setWatchedSections] = useState<Set<string>>(new Set())
  const [notice, setNotice] = useState<Notice | null>(null)

  const activeWatchCount = useMemo(
    () => watches.filter((watch) => watch.is_active).length,
    [watches],
  )
  const pausedWatchCount = watches.length - activeWatchCount
  const openSeatCount = useMemo(
    () => watches.filter((watch) => watch.last_status === 'OPEN' || watch.last_status === 'WAITLIST').length,
    [watches],
  )
  const searchReady = Boolean(filters.schoolId && filters.termRef && filters.subjectCode)

  const loadWatches = useCallback(async (showError = true) => {
    setWatchesLoading(true)
    try {
      const items = await listWatches()
      const visibleItems = items.filter((watch) => watch.last_status !== 'DELETED')
      setWatches(visibleItems)
      setWatchedSections(
        new Set(visibleItems.map((watch) => `${watch.provider}:CRN:${watch.section_ref}`)),
      )
    } catch {
      if (showError) {
        setNotice({
          tone: 'error',
          message: 'We could not load your tracked sections. Please refresh and try again.',
        })
      }
    } finally {
      setWatchesLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadWatches(false)
  }, [loadWatches])

  function syncUrl(nextFilters: FilterValues, nextTab: Tab) {
    const params = new URLSearchParams()
    if (nextFilters.schoolId) params.set('school', nextFilters.schoolId)
    if (nextFilters.termRef) params.set('term', nextFilters.termRef)
    if (nextFilters.subjectCode) params.set('subject', nextFilters.subjectCode)
    params.set('tab', nextTab)
    setSearchParams(params, { replace: true })
  }

  function handleFiltersChange(nextFilters: FilterValues) {
    setFilters(nextFilters)
    setSearchError(null)
    setSearchResult(null)
    syncUrl(nextFilters, activeTab)
  }

  function handleResetFilters() {
    const nextFilters = { schoolId: '', termRef: '', subjectCode: '' }
    setFilters(nextFilters)
    setSearchResult(null)
    setSearchError(null)
    syncUrl(nextFilters, activeTab)
  }

  function handleTabChange(tab: Tab) {
    setActiveTab(tab)
    syncUrl(filters, tab)
  }

  async function handleSearch() {
    if (!searchReady) return

    setSearchLoading(true)
    setSearchError(null)

    try {
      const data = await getClasses(filters.schoolId, filters.termRef, filters.subjectCode)
      setSearchResult(data)
      setNotice(null)
    } catch (err) {
      setSearchError((err as Error).message)
      setSearchResult(null)
    } finally {
      setSearchLoading(false)
    }
  }

  async function handleWatch(sectionId: string, schoolId: string, termRef: string) {
    try {
      await createWatchFromSearch(schoolId, termRef, sectionId)
      setWatchedSections((prev) => new Set(prev).add(`${schoolId}:${sectionId}`))
      await loadWatches(false)
      setNotice({
        tone: 'success',
        message: `Section ${sectionId.replace('CRN:', '')} is now being tracked.`,
        actionLabel: 'Open tracked seats',
        actionTab: 'watches',
      })
    } catch (err) {
      setNotice({
        tone: 'error',
        message: (err as Error).message || 'We could not save that watch.',
      })
    }
  }

  async function handleAdvancedWatchCreated(watch: Watch) {
    await loadWatches(false)
    setNotice({
      tone: 'success',
      message: `Manual watch saved for section ${watch.section_ref}.`,
      actionLabel: 'Open tracked seats',
      actionTab: 'watches',
    })
  }

  async function handleToggleActive(watch: Watch) {
    try {
      await updateWatch(watch.id, { is_active: !watch.is_active })
      await loadWatches(false)
      setNotice({
        tone: 'success',
        message: watch.is_active
          ? `Paused tracking for ${watch.section_ref}.`
          : `Resumed tracking for ${watch.section_ref}.`,
      })
    } catch (err) {
      setNotice({
        tone: 'error',
        message: (err as Error).message || 'We could not update that watch.',
      })
    }
  }

  async function handleDeleteWatch(watch: Watch) {
    if (!window.confirm(`Remove watch for section ${watch.section_ref}?`)) return

    try {
      await deleteWatch(watch.id)
      await loadWatches(false)
      setNotice({
        tone: 'success',
        message: `Removed section ${watch.section_ref} from your tracked seats.`,
      })
    } catch (err) {
      setNotice({
        tone: 'error',
        message: (err as Error).message || 'We could not remove that watch.',
      })
    }
  }

  async function handleLogout() {
    await logout()
    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div>
            <p className="font-display text-xs uppercase tracking-[0.24em] text-teal-700">
              EnrollEagle
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h1 className="text-lg font-semibold text-slate-900">Seat tracking dashboard</h1>
              <span className="text-sm text-slate-400">{userEmail}</span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2"
          >
            Log out
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <section className="rounded-[2rem] border border-teal-100 bg-white/85 p-6 shadow-[0_24px_80px_-45px_rgba(15,23,42,0.45)]">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] xl:items-end">
            <div>
              <p className="font-display text-xs uppercase tracking-[0.24em] text-teal-700">
                A calmer workflow
              </p>
              <h2 className="mt-3 text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">
                Find the right sections quickly, then keep your watch list tidy.
              </h2>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
                The search tab is for finding classes and starting new alerts. The tracked seats tab
                is where you pause, resume, or remove watches once they are running.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <SummaryCard
                label="Tracked"
                value={String(watches.length)}
                detail="Total sections in your workspace."
              />
              <SummaryCard
                label="Active"
                value={String(activeWatchCount)}
                detail="Alerts currently checking for seat changes."
              />
              <SummaryCard
                label="Open now"
                value={String(openSeatCount)}
                detail="Sections with open seats or waitlist movement."
              />
            </div>
          </div>
        </section>

        {notice && (
          <div
            className={`rounded-[1.75rem] border px-4 py-4 shadow-sm ${
              notice.tone === 'success'
                ? 'border-teal-200 bg-teal-50 text-teal-900'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-medium leading-6">{notice.message}</p>
              <div className="flex gap-2">
                {notice.actionTab && notice.actionLabel && (
                  <button
                    onClick={() => handleTabChange(notice.actionTab!)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] transition-colors ${
                      notice.tone === 'success'
                        ? 'bg-white text-teal-800 hover:bg-teal-100'
                        : 'bg-white text-red-700 hover:bg-red-100'
                    }`}
                  >
                    {notice.actionLabel}
                  </button>
                )}
                <button
                  onClick={() => setNotice(null)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] transition-colors ${
                    notice.tone === 'success'
                      ? 'bg-teal-100 text-teal-800 hover:bg-teal-200'
                      : 'bg-red-100 text-red-700 hover:bg-red-200'
                  }`}
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="inline-flex w-fit rounded-2xl border border-slate-200 bg-white/85 p-1 shadow-sm">
            <button
              onClick={() => handleTabChange('search')}
              className={`rounded-2xl px-5 py-2.5 text-sm font-semibold transition-colors ${
                activeTab === 'search'
                  ? 'bg-teal-700 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Find classes
            </button>
            <button
              onClick={() => handleTabChange('watches')}
              className={`rounded-2xl px-5 py-2.5 text-sm font-semibold transition-colors ${
                activeTab === 'watches'
                  ? 'bg-teal-700 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Tracked seats
              {watches.length > 0 && (
                <span
                  className={`ml-2 inline-flex min-w-[1.5rem] items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                    activeTab === 'watches' ? 'bg-white/20 text-white' : 'bg-teal-100 text-teal-700'
                  }`}
                >
                  {watches.length}
                </span>
              )}
            </button>
          </div>

          <p className="text-sm text-slate-500">
            {activeTab === 'search'
              ? searchReady
                ? 'Your search is ready. Load classes, then save the sections you want.'
                : 'Build a search on the left to start finding sections.'
              : pausedWatchCount > 0
                ? `${pausedWatchCount} watch${pausedWatchCount === 1 ? '' : 'es'} are currently paused.`
                : 'Everything in your watch list is active right now.'}
          </p>
        </div>

        {activeTab === 'search' && (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
            <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
              <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-5 shadow-sm">
                <SearchFilters
                  filters={filters}
                  onFiltersChange={handleFiltersChange}
                  onSearch={handleSearch}
                  onReset={handleResetFilters}
                  loading={searchLoading}
                />
              </div>
              <AdvancedAddWatch onCreated={handleAdvancedWatchCreated} />
            </aside>

            <main>
              <ClassResults
                result={searchResult}
                loading={searchLoading}
                error={searchError}
                onWatch={handleWatch}
                watchedSections={watchedSections}
              />
            </main>
          </div>
        )}

        {activeTab === 'watches' && (
          <div className="max-w-5xl">
            <WatchesPanel
              watches={watches}
              loading={watchesLoading}
              onToggleActive={handleToggleActive}
              onDelete={handleDeleteWatch}
              onGoToSearch={() => handleTabChange('search')}
            />
          </div>
        )}
      </div>
    </div>
  )
}
