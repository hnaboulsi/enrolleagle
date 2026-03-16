import { useDeferredValue, useMemo, useState } from 'react'
import type { CatalogSearchResult, SectionResult } from '../api/client'
import SeatBadge from './SeatBadge'

type Props = {
  result: CatalogSearchResult | null
  loading: boolean
  error: string | null
  onWatch: (sectionId: string, schoolId: string, termRef: string) => Promise<void>
  watchedSections: Set<string>
}

type EmptyStateProps = {
  eyebrow: string
  title: string
  description: string
}

function EmptyState({ eyebrow, title, description }: EmptyStateProps) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white/70 p-8 text-center shadow-sm">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
        <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M4 7.5A2.5 2.5 0 016.5 5h11A2.5 2.5 0 0120 7.5v9a2.5 2.5 0 01-2.5 2.5h-11A2.5 2.5 0 014 16.5v-9z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M8 10h8M8 14h5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <p className="font-display mt-5 text-xs uppercase tracking-[0.22em] text-teal-700">{eyebrow}</p>
      <h2 className="mt-2 text-xl font-semibold text-slate-900">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">{description}</p>
    </div>
  )
}

function MeetingInfo({ section }: { section: SectionResult }) {
  if (!section.meeting_times || section.meeting_times.length === 0) {
    return <span className="text-sm text-slate-400">Schedule details are still TBA.</span>
  }

  return (
    <div className="space-y-1">
      {section.meeting_times.map((meetingTime, index) => (
        <div key={index} className="text-sm text-slate-600">
          {meetingTime.days && <span className="font-semibold text-slate-700">{meetingTime.days}</span>}
          {meetingTime.start && meetingTime.end_time && (
            <span className="ml-1">{meetingTime.start} - {meetingTime.end_time}</span>
          )}
          {meetingTime.location && <span className="ml-2 text-slate-400">{meetingTime.location}</span>}
          {meetingTime.modality && (
            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
              {meetingTime.modality}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

function SummaryChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  )
}

export default function ClassResults({ result, loading, error, onWatch, watchedSections }: Props) {
  const [filter, setFilter] = useState('')
  const [pendingSectionId, setPendingSectionId] = useState<string | null>(null)
  const deferredFilter = useDeferredValue(filter.trim().toLowerCase())

  const filteredItems = useMemo(() => {
    if (!result) return []
    if (!deferredFilter) return result.items

    return result.items.filter(
      (course) =>
        course.course_code.toLowerCase().includes(deferredFilter) ||
        course.course_title.toLowerCase().includes(deferredFilter) ||
        course.sections.some(
          (section) =>
            section.section_label.toLowerCase().includes(deferredFilter) ||
            (section.instructor && section.instructor.toLowerCase().includes(deferredFilter)),
        ),
    )
  }, [deferredFilter, result])

  const sectionCount = filteredItems.reduce((total, course) => total + course.sections.length, 0)
  const openSectionCount = filteredItems.reduce(
    (total, course) =>
      total + course.sections.filter((section) => section.status === 'OPEN' || section.status === 'WAITLIST').length,
    0,
  )

  async function handleWatchClick(sectionId: string, schoolId: string, termRef: string) {
    setPendingSectionId(sectionId)
    try {
      await onWatch(sectionId, schoolId, termRef)
    } finally {
      setPendingSectionId(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="animate-pulse rounded-[2rem] border border-slate-200 bg-white/70 p-6 shadow-sm"
          >
            <div className="h-5 w-40 rounded-full bg-slate-200" />
            <div className="mt-4 h-4 w-full rounded-full bg-slate-100" />
            <div className="mt-2 h-4 w-2/3 rounded-full bg-slate-100" />
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-[2rem] border border-red-200 bg-red-50 p-6 text-red-800 shadow-sm">
        <p className="font-display text-xs uppercase tracking-[0.22em] text-red-600">Search error</p>
        <h2 className="mt-2 text-lg font-semibold">We could not load classes for that selection.</h2>
        <p className="mt-2 text-sm leading-6 text-red-700">{error}</p>
      </div>
    )
  }

  if (!result) {
    return (
      <EmptyState
        eyebrow="Ready when you are"
        title="Search results will appear here"
        description="Pick a school, term, and subject on the left. Once classes load, you can filter them further and save the sections you want to track."
      />
    )
  }

  if (result.items.length === 0) {
    return (
      <EmptyState
        eyebrow="No matches"
        title="That search did not return any classes"
        description="Try another subject or term. If you already have a CRN or a schedule URL, you can add the watch manually from the sidebar."
      />
    )
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[2rem] border border-teal-100 bg-white/85 p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-display text-xs uppercase tracking-[0.22em] text-teal-700">Step 2</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">Review sections and save watches</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Results for <span className="font-semibold text-slate-900">{result.subject_code}</span> in{' '}
              <span className="font-semibold text-slate-900">{result.term_ref}</span>. Use the quick
              filter to narrow by course code, instructor, or section label.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <SummaryChip label="Courses" value={String(filteredItems.length)} />
            <SummaryChip label="Sections" value={String(sectionCount)} />
            <SummaryChip label="Open or waitlist" value={String(openSectionCount)} />
          </div>
        </div>

        <div className="mt-5">
          <label className="relative block">
            <span className="sr-only">Filter results</span>
            <svg
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Filter by course code, title, instructor, or section..."
              className="w-full rounded-2xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm shadow-sm transition-colors focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
            />
          </label>
        </div>
      </section>

      {filteredItems.length === 0 && (
        <div className="rounded-[2rem] border border-slate-200 bg-white/80 p-6 text-center shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">No sections match that filter</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Try a broader keyword or clear the filter to see the full subject again.
          </p>
        </div>
      )}

      {filteredItems.map((course) => (
        <article
          key={course.course_code}
          className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white/90 shadow-sm"
        >
          <div className="border-b border-slate-200 bg-slate-50/90 px-5 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between">
              <div>
                <p className="font-display text-xs uppercase tracking-[0.18em] text-slate-400">
                  {course.course_code}
                </p>
                <h3 className="mt-1 text-lg font-semibold text-slate-900">{course.course_title}</h3>
              </div>
              {course.units && (
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 shadow-sm">
                  {course.units} units
                </span>
              )}
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {course.sections.map((section) => {
              const isWatched = watchedSections.has(`${result.school_id}:${section.section_id}`)
              const isPending = pendingSectionId === section.section_id

              return (
                <div
                  key={section.section_id}
                  className="grid gap-4 px-5 py-4 transition-colors hover:bg-slate-50/70 md:grid-cols-[minmax(0,1fr)_auto]"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Section {section.section_label}
                      </span>
                      <SeatBadge
                        status={section.status}
                        openSeats={section.open_seats}
                        waitlistSeats={section.waitlist_open_seats}
                      />
                    </div>

                    <div className="mt-3 space-y-2">
                      <MeetingInfo section={section} />
                      <div className="flex flex-wrap gap-3 text-sm text-slate-500">
                        {section.instructor && <span>Instructor: {section.instructor}</span>}
                        {section.block_reason && <span>Note: {section.block_reason}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-stretch gap-2 md:min-w-[12rem]">
                    {section.source_url && (
                      <a
                        href={section.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2"
                      >
                        Open source page
                      </a>
                    )}
                    <button
                      onClick={() => handleWatchClick(section.section_id, result.school_id, result.term_ref)}
                      disabled={isWatched || isPending}
                      className={`rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                        isWatched
                          ? 'cursor-default bg-teal-100 text-teal-800 focus:ring-teal-200'
                          : 'bg-teal-700 text-white hover:-translate-y-0.5 hover:bg-teal-800 focus:ring-teal-600'
                      }`}
                    >
                      {isWatched ? 'Already tracking' : isPending ? 'Saving...' : 'Track this section'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </article>
      ))}
    </div>
  )
}
