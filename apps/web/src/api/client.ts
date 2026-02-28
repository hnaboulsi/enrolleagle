// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MeResponse = {
  id: string
  email: string
  name: string | null
  created_at: string
}

export type Watch = {
  id: string
  provider: string
  section_ref: string
  term_ref: string
  fetch_key: string
  source_url: string | null
  campus_code: string | null
  notify_on_waitlist: boolean
  last_open_seats: number | null
  last_waitlist_open_seats: number | null
  last_status: string
  last_checked_at: string | null
  next_run_at: string
  cadence_seconds: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export type SchoolInfo = {
  id: string
  name: string
  supports_search: boolean
  supports_seat_check: boolean
  notes: string | null
}

export type TermInfo = {
  term_ref: string
  label: string
}

export type SubjectInfo = {
  subject_code: string
  subject_name: string
}

export type MeetingTime = {
  days: string | null
  start: string | null
  end_time: string | null
  location: string | null
  modality: string | null
}

export type SectionResult = {
  section_id: string
  section_label: string
  meeting_times: MeetingTime[]
  instructor: string | null
  status: string
  open_seats: number | null
  waitlist_open_seats: number | null
  source_url: string | null
  block_reason: string | null
}

export type CourseResult = {
  course_code: string
  course_title: string
  units: string | null
  sections: SectionResult[]
}

export type CatalogSearchResult = {
  school_id: string
  term_ref: string
  subject_code: string
  items: CourseResult[]
}

// ---------------------------------------------------------------------------
// HTTP helper
// ---------------------------------------------------------------------------

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  })

  if (response.status === 204) {
    return undefined as T
  }

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const message = (data && (data.error || data.message)) || `Request failed (${response.status})`
    throw new Error(message)
  }

  return data as T
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export function getGoogleStartUrl() {
  return `${API_BASE}/auth/google/start`
}

export async function devLogin(): Promise<{ ok: boolean; email: string; name: string }> {
  return request('/auth/dev/login', { method: 'POST' })
}

export async function getMe(): Promise<MeResponse> {
  return request<MeResponse>('/me')
}

export async function logout(): Promise<void> {
  await request('/auth/logout', { method: 'POST' })
}

// ---------------------------------------------------------------------------
// Watches
// ---------------------------------------------------------------------------

export async function listWatches(): Promise<Watch[]> {
  const data = await request<{ items: Watch[] }>('/watches')
  return data.items
}

export async function createWatch(payload: Record<string, unknown>): Promise<Watch> {
  return request<Watch>('/watches', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function createWatchFromSearch(
  schoolId: string,
  termRef: string,
  sectionId: string,
  notifyOnWaitlist = false,
  cadenceSeconds = 120,
): Promise<Watch> {
  return request<Watch>('/watches', {
    method: 'POST',
    body: JSON.stringify({
      school_id: schoolId,
      term_ref: termRef,
      section_id: sectionId,
      notify_on_waitlist: notifyOnWaitlist,
      cadence_seconds: cadenceSeconds,
    }),
  })
}

export async function updateWatch(id: string, payload: Record<string, unknown>): Promise<Watch> {
  return request<Watch>(`/watches/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function deleteWatch(id: string): Promise<void> {
  await request(`/watches/${id}`, { method: 'DELETE' })
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export async function getSchools(): Promise<SchoolInfo[]> {
  return request<SchoolInfo[]>('/schools')
}

export async function getTerms(schoolId: string): Promise<TermInfo[]> {
  return request<TermInfo[]>(`/terms?school_id=${encodeURIComponent(schoolId)}`)
}

export async function getSubjects(schoolId: string, termRef: string): Promise<SubjectInfo[]> {
  return request<SubjectInfo[]>(
    `/subjects?school_id=${encodeURIComponent(schoolId)}&term_ref=${encodeURIComponent(termRef)}`,
  )
}

export async function getClasses(
  schoolId: string,
  termRef: string,
  subjectCode: string,
): Promise<CatalogSearchResult> {
  return request<CatalogSearchResult>(
    `/classes?school_id=${encodeURIComponent(schoolId)}&term_ref=${encodeURIComponent(termRef)}&subject_code=${encodeURIComponent(subjectCode)}`,
  )
}
