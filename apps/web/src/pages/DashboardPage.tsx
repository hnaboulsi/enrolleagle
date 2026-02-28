import { useCallback, useEffect, useState } from 'react'
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

export default function DashboardPage({ userEmail }: Props) {
  const [searchParams, setSearchParams] = useSearchParams()

  // Tab
  const tabParam = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState<Tab>(tabParam === 'watches' ? 'watches' : 'search')

  // Filters (preserved in URL)
  const [filters, setFilters] = useState<FilterValues>({
    schoolId: searchParams.get('school') || '',
    termRef: searchParams.get('term') || '',
    subjectCode: searchParams.get('subject') || '',
  })

  // Search state
  const [searchResult, setSearchResult] = useState<CatalogSearchResult | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  // Watches state
  const [watches, setWatches] = useState<Watch[]>([])
  const [watchesLoading, setWatchesLoading] = useState(true)
  const [watchedSections, setWatchedSections] = useState<Set<string>>(new Set())

  // Load watches
  const loadWatches = useCallback(async () => {
    setWatchesLoading(true)
    try {
      const items = await listWatches()
      setWatches(items)
      setWatchedSections(new Set(items.map((w) => `CRN:${w.section_ref}`)))
    } catch {
      // silent
    } finally {
      setWatchesLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadWatches()
  }, [loadWatches])

  // Sync filters to URL
  function handleFiltersChange(f: FilterValues) {
    setFilters(f)
    const params = new URLSearchParams()
    if (f.schoolId) params.set('school', f.schoolId)
    if (f.termRef) params.set('term', f.termRef)
    if (f.subjectCode) params.set('subject', f.subjectCode)
    params.set('tab', activeTab)
    setSearchParams(params, { replace: true })
  }

  function handleTabChange(tab: Tab) {
    setActiveTab(tab)
    const params = new URLSearchParams(searchParams)
    params.set('tab', tab)
    setSearchParams(params, { replace: true })
  }

  async function handleSearch() {
    if (!filters.schoolId || !filters.termRef || !filters.subjectCode) return
    setSearchLoading(true)
    setSearchError(null)
    try {
      const data = await getClasses(filters.schoolId, filters.termRef, filters.subjectCode)
      setSearchResult(data)
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
      setWatchedSections((prev) => new Set(prev).add(sectionId))
      await loadWatches()
    } catch {
      // ignore
    }
  }

  async function handleToggleActive(watch: Watch) {
    await updateWatch(watch.id, { is_active: !watch.is_active })
    await loadWatches()
  }

  async function handleDeleteWatch(watch: Watch) {
    await deleteWatch(watch.id)
    await loadWatches()
  }

  async function handleLogout() {
    await logout()
    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="bg-white/80 backdrop-blur border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-emerald-800">EnrollEagle</h1>
            <span className="hidden sm:block text-sm text-slate-400">|</span>
            <span className="hidden sm:block text-sm text-slate-500">{userEmail}</span>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Log out
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6 w-fit">
          <button
            onClick={() => handleTabChange('search')}
            className={`rounded-lg px-5 py-2 text-sm font-medium transition-colors ${
              activeTab === 'search'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Search Classes
          </button>
          <button
            onClick={() => handleTabChange('watches')}
            className={`rounded-lg px-5 py-2 text-sm font-medium transition-colors ${
              activeTab === 'watches'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            My Watches
            {watches.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold px-1.5 py-0.5 min-w-[1.25rem]">
                {watches.length}
              </span>
            )}
          </button>
        </div>

        {/* Search tab */}
        {activeTab === 'search' && (
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
            {/* Sidebar filters */}
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <div className="rounded-xl bg-white/80 border border-slate-200 p-5 shadow-sm">
                <SearchFilters
                  filters={filters}
                  onFiltersChange={handleFiltersChange}
                  onSearch={handleSearch}
                  loading={searchLoading}
                />
              </div>
              <div className="mt-4">
                <AdvancedAddWatch onCreated={loadWatches} />
              </div>
            </aside>

            {/* Results */}
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

        {/* Watches tab */}
        {activeTab === 'watches' && (
          <div className="max-w-3xl">
            <WatchesPanel
              watches={watches}
              loading={watchesLoading}
              onToggleActive={handleToggleActive}
              onDelete={handleDeleteWatch}
            />
          </div>
        )}
      </div>
    </div>
  )
}
