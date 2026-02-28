import { useEffect, useState } from 'react'
import {
  getSchools,
  getTerms,
  getSubjects,
  type SchoolInfo,
  type TermInfo,
  type SubjectInfo,
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
  loading?: boolean
}

export default function SearchFilters({ filters, onFiltersChange, onSearch, loading }: Props) {
  const [schools, setSchools] = useState<SchoolInfo[]>([])
  const [terms, setTerms] = useState<TermInfo[]>([])
  const [subjects, setSubjects] = useState<SubjectInfo[]>([])
  const [loadingDropdown, setLoadingDropdown] = useState(false)

  // Load schools on mount
  useEffect(() => {
    getSchools()
      .then(setSchools)
      .catch(() => setSchools([]))
  }, [])

  // Load terms when school changes
  useEffect(() => {
    if (!filters.schoolId) {
      setTerms([])
      return
    }
    setLoadingDropdown(true)
    getTerms(filters.schoolId)
      .then((t) => {
        setTerms(t)
        setLoadingDropdown(false)
      })
      .catch(() => {
        setTerms([])
        setLoadingDropdown(false)
      })
  }, [filters.schoolId])

  // Load subjects when term changes
  useEffect(() => {
    if (!filters.schoolId || !filters.termRef) {
      setSubjects([])
      return
    }
    setLoadingDropdown(true)
    getSubjects(filters.schoolId, filters.termRef)
      .then((s) => {
        setSubjects(s)
        setLoadingDropdown(false)
      })
      .catch(() => {
        setSubjects([])
        setLoadingDropdown(false)
      })
  }, [filters.schoolId, filters.termRef])

  const canSearch = filters.schoolId && filters.termRef && filters.subjectCode

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-700">Filters</h2>

      <div>
        <label className="block text-sm font-medium text-slate-600 mb-1">School</label>
        <select
          value={filters.schoolId}
          onChange={(e) =>
            onFiltersChange({ schoolId: e.target.value, termRef: '', subjectCode: '' })
          }
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          <option value="">Select a school...</option>
          {schools.map((s) => (
            <option key={s.id} value={s.id} disabled={!s.supports_search}>
              {s.name} {!s.supports_search ? '(no search)' : ''}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-600 mb-1">Term</label>
        <select
          value={filters.termRef}
          onChange={(e) =>
            onFiltersChange({ ...filters, termRef: e.target.value, subjectCode: '' })
          }
          disabled={!filters.schoolId || terms.length === 0}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
        >
          <option value="">Select a term...</option>
          {terms.map((t) => (
            <option key={t.term_ref} value={t.term_ref}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-600 mb-1">Subject</label>
        <select
          value={filters.subjectCode}
          onChange={(e) =>
            onFiltersChange({ ...filters, subjectCode: e.target.value })
          }
          disabled={!filters.termRef || subjects.length === 0}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
        >
          <option value="">Select a subject...</option>
          {subjects.map((s) => (
            <option key={s.subject_code} value={s.subject_code}>
              {s.subject_name}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={onSearch}
        disabled={!canSearch || loading}
        className="w-full rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Searching...
          </span>
        ) : (
          'Search Classes'
        )}
      </button>

      {loadingDropdown && (
        <p className="text-xs text-slate-400">Loading options...</p>
      )}
    </div>
  )
}
