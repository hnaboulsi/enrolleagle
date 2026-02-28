import { useState } from 'react'
import type { CatalogSearchResult, SectionResult } from '../api/client'
import SeatBadge from './SeatBadge'

type Props = {
  result: CatalogSearchResult | null
  loading: boolean
  error: string | null
  onWatch: (sectionId: string, schoolId: string, termRef: string) => void
  watchedSections: Set<string>
}

function MeetingInfo({ section }: { section: SectionResult }) {
  if (!section.meeting_times || section.meeting_times.length === 0) {
    return <span className="text-slate-400 text-sm">TBA</span>
  }
  return (
    <div className="space-y-0.5">
      {section.meeting_times.map((mt, i) => (
        <div key={i} className="text-sm text-slate-600">
          {mt.days && <span className="font-medium">{mt.days}</span>}
          {mt.start && mt.end_time && (
            <span className="ml-1">{mt.start} – {mt.end_time}</span>
          )}
          {mt.location && <span className="ml-1 text-slate-400">({mt.location})</span>}
          {mt.modality && <span className="ml-1 text-xs text-slate-400">[{mt.modality}]</span>}
        </div>
      ))}
    </div>
  )
}

export default function ClassResults({ result, loading, error, onWatch, watchedSections }: Props) {
  const [filter, setFilter] = useState('')

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((n) => (
          <div key={n} className="animate-pulse rounded-xl bg-white/60 border border-slate-200 p-5">
            <div className="h-5 bg-slate-200 rounded w-1/3 mb-3" />
            <div className="h-4 bg-slate-100 rounded w-full mb-2" />
            <div className="h-4 bg-slate-100 rounded w-2/3" />
          </div>
        ))}
      </div>
    )
  }

  // Error
  if (error) {
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 p-5 text-red-800">
        <p className="font-medium">Error loading classes</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    )
  }

  // Empty / not searched
  if (!result) {
    return (
      <div className="rounded-xl bg-white/60 border border-slate-200 p-8 text-center">
        <div className="text-4xl mb-3">🔍</div>
        <p className="text-slate-500 font-medium">Select a school, term, and subject to search</p>
        <p className="text-slate-400 text-sm mt-1">Results will appear here</p>
      </div>
    )
  }

  // No results
  if (result.items.length === 0) {
    return (
      <div className="rounded-xl bg-white/60 border border-slate-200 p-8 text-center">
        <div className="text-4xl mb-3">📭</div>
        <p className="text-slate-500 font-medium">No classes found</p>
        <p className="text-slate-400 text-sm mt-1">
          Try a different subject or term
        </p>
      </div>
    )
  }

  // Filter items
  const filterLower = filter.toLowerCase()
  const filteredItems = filter
    ? result.items.filter(
        (c) =>
          c.course_code.toLowerCase().includes(filterLower) ||
          c.course_title.toLowerCase().includes(filterLower) ||
          c.sections.some(
            (s) =>
              s.section_label.toLowerCase().includes(filterLower) ||
              (s.instructor && s.instructor.toLowerCase().includes(filterLower)),
          ),
      )
    : result.items

  return (
    <div className="space-y-4">
      {/* Client-side search filter */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter results..."
          className="w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </div>

      <p className="text-sm text-slate-500">
        {filteredItems.length} course{filteredItems.length !== 1 ? 's' : ''} found
        {filteredItems.reduce((acc, c) => acc + c.sections.length, 0)} section
        {filteredItems.reduce((acc, c) => acc + c.sections.length, 0) !== 1 ? 's' : ''}
      </p>

      {filteredItems.map((course) => (
        <div
          key={course.course_code}
          className="rounded-xl bg-white/80 border border-slate-200 shadow-sm overflow-hidden"
        >
          {/* Course header */}
          <div className="bg-slate-50 px-5 py-3 border-b border-slate-200">
            <div className="flex items-baseline gap-3">
              <h3 className="font-semibold text-slate-900">{course.course_code}</h3>
              <span className="text-sm text-slate-600">{course.course_title}</span>
              {course.units && (
                <span className="text-xs text-slate-400 ml-auto">{course.units} units</span>
              )}
            </div>
          </div>

          {/* Sections */}
          <div className="divide-y divide-slate-100">
            {course.sections.map((section) => {
              const isWatched = watchedSections.has(section.section_id)
              return (
                <div key={section.section_id} className="px-5 py-3 flex items-center gap-4 hover:bg-slate-50/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-slate-800">{section.section_label}</span>
                      <SeatBadge
                        status={section.status}
                        openSeats={section.open_seats}
                        waitlistSeats={section.waitlist_open_seats}
                      />
                    </div>
                    <div className="mt-1 flex items-center gap-4 flex-wrap">
                      <MeetingInfo section={section} />
                      {section.instructor && (
                        <span className="text-sm text-slate-500">{section.instructor}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => onWatch(section.section_id, result.school_id, result.term_ref)}
                    disabled={isWatched}
                    className={`shrink-0 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${
                      isWatched
                        ? 'bg-emerald-100 text-emerald-700 cursor-default'
                        : 'bg-emerald-700 text-white hover:bg-emerald-800 shadow-sm'
                    }`}
                  >
                    {isWatched ? '✓ Watching' : 'Watch'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
