import { type FormEvent, type ReactNode, useEffect, useState } from 'react'
import {
  getSchools,
  getSubjects,
  getTerms,
  type SchoolInfo,
  type SubjectInfo,
  type TermInfo,
} from '../api/client'

export type FilterValues = {
  schoolId: string
  termRef: string
  subjectCode: string
}

type Props = {
  filters: FilterValues
  onFiltersChange: (f: FilterValues) => void
  onSearch: () => void
  onReset: () => void
  loading?: boolean
}

type StepFieldProps = {
  description: string
  label: string
  step: number
  children: ReactNode
}

function StepField({ description, label, step, children }: StepFieldProps) {
  return (
    <label className="block rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
      <span className="flex items-center gap-3">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-teal-700 text-xs font-semibold text-white">
          {step}
        </span>
        <span>
          <span className="block text-sm font-semibold text-slate-800">{label}</span>
          <span className="block text-xs text-slate-500">{description}</span>
        </span>
      </span>
      <div className="mt-3">{children}</div>
    </label>
  )
}

export default function SearchFilters({
  filters,
  onFiltersChange,
  onSearch,
  onReset,
  loading,
}: Props) {
  const [schools, setSchools] = useState<SchoolInfo[]>([])
  const [terms, setTerms] = useState<TermInfo[]>([])
  const [subjects, setSubjects] = useState<SubjectInfo[]>([])
  const [loadingTerms, setLoadingTerms] = useState(false)
  const [loadingSubjects, setLoadingSubjects] = useState(false)

  useEffect(() => {
    getSchools()
      .then(setSchools)
      .catch(() => setSchools([]))
  }, [])

  useEffect(() => {
    if (!filters.schoolId) {
      setTerms([])
      setLoadingTerms(false)
      return
    }

    setLoadingTerms(true)
    getTerms(filters.schoolId)
      .then((items) => {
        setTerms(items)
        setLoadingTerms(false)
      })
      .catch(() => {
        setTerms([])
        setLoadingTerms(false)
      })
  }, [filters.schoolId])

  useEffect(() => {
    if (!filters.schoolId || !filters.termRef) {
      setSubjects([])
      setLoadingSubjects(false)
      return
    }

    setLoadingSubjects(true)
    getSubjects(filters.schoolId, filters.termRef)
      .then((items) => {
        setSubjects(items)
        setLoadingSubjects(false)
      })
      .catch(() => {
        setSubjects([])
        setLoadingSubjects(false)
      })
  }, [filters.schoolId, filters.termRef])

  const canSearch = Boolean(filters.schoolId && filters.termRef && filters.subjectCode)
  const hasSelection = Boolean(filters.schoolId || filters.termRef || filters.subjectCode)
  const selectedSchool = schools.find((school) => school.id === filters.schoolId)
  const supportedSearchCount = schools.filter((school) => school.supports_search).length
  const loadingDropdown = loadingTerms || loadingSubjects
  const inputClass =
    'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm transition-colors focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200 disabled:cursor-not-allowed disabled:opacity-60'

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (canSearch) onSearch()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-xs uppercase tracking-[0.22em] text-teal-700">Step 1</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">Choose what to search</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Start with the school, then narrow down to a term and subject. We keep your selections in the URL so the page is easy to revisit.
          </p>
        </div>
        {hasSelection && (
          <button
            type="button"
            onClick={onReset}
            className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 transition-colors hover:border-slate-400 hover:text-slate-700"
          >
            Reset
          </button>
        )}
      </div>

      <StepField
        step={1}
        label="School"
        description={`${supportedSearchCount || 'No'} searchable campus${supportedSearchCount === 1 ? '' : 'es'} available right now.`}
      >
        <select
          value={filters.schoolId}
          onChange={(event) =>
            onFiltersChange({ schoolId: event.target.value, termRef: '', subjectCode: '' })
          }
          className={inputClass}
        >
          <option value="">Select a school...</option>
          {schools.map((school) => (
            <option key={school.id} value={school.id} disabled={!school.supports_search}>
              {school.name} {!school.supports_search ? '(search unavailable)' : ''}
            </option>
          ))}
        </select>
      </StepField>

      <StepField
        step={2}
        label="Term"
        description={
          filters.schoolId
            ? terms.length > 0
              ? `${terms.length} term${terms.length === 1 ? '' : 's'} to choose from.`
              : 'Available terms will load after you pick a school.'
            : 'Choose a school first.'
        }
      >
        <select
          value={filters.termRef}
          onChange={(event) =>
            onFiltersChange({ ...filters, termRef: event.target.value, subjectCode: '' })
          }
          disabled={!filters.schoolId || terms.length === 0}
          className={inputClass}
        >
          <option value="">Select a term...</option>
          {terms.map((term) => (
            <option key={term.term_ref} value={term.term_ref}>
              {term.label}
            </option>
          ))}
        </select>
      </StepField>

      <StepField
        step={3}
        label="Subject"
        description={
          filters.termRef
            ? subjects.length > 0
              ? `${subjects.length} subject${subjects.length === 1 ? '' : 's'} found for this term.`
              : 'Subjects will load for the selected term.'
            : 'Choose a term first.'
        }
      >
        <select
          value={filters.subjectCode}
          onChange={(event) => onFiltersChange({ ...filters, subjectCode: event.target.value })}
          disabled={!filters.termRef || subjects.length === 0}
          className={inputClass}
        >
          <option value="">Select a subject...</option>
          {subjects.map((subject) => (
            <option key={subject.subject_code} value={subject.subject_code}>
              {subject.subject_name}
            </option>
          ))}
        </select>
      </StepField>

      {selectedSchool && (
        <div className="rounded-2xl border border-teal-100 bg-teal-50/80 px-4 py-3 text-sm text-teal-900">
          <p className="font-semibold">{selectedSchool.name}</p>
          <p className="mt-1 text-teal-800/80">
            {selectedSchool.supports_seat_check
              ? 'Seat checks and alerts are supported for this school.'
              : 'Catalog search is available, but automated seat checks may be limited.'}
          </p>
          {selectedSchool.notes && <p className="mt-1 text-teal-800/80">{selectedSchool.notes}</p>}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-slate-950 px-4 py-4 text-white shadow-sm">
        <button
          type="submit"
          disabled={!canSearch || loading}
          className="flex w-full items-center justify-center rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-slate-950 transition-all hover:-translate-y-0.5 hover:bg-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-orange-300"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Loading classes...
            </span>
          ) : (
            'Show matching classes'
          )}
        </button>
        <p className="mt-3 text-xs leading-5 text-slate-300">
          After results load, you can filter by instructor or section number before saving a watch.
        </p>
      </div>

      {loadingDropdown && (
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
          Updating available choices...
        </p>
      )}
    </form>
  )
}
