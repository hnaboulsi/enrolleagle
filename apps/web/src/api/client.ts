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

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

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

export function getGoogleStartUrl() {
  return `${API_BASE}/auth/google/start`
}

export async function getMe(): Promise<MeResponse> {
  return request<MeResponse>('/me')
}

export async function logout(): Promise<void> {
  await request('/auth/logout', { method: 'POST' })
}

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

export async function updateWatch(id: string, payload: Record<string, unknown>): Promise<Watch> {
  return request<Watch>(`/watches/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function deleteWatch(id: string): Promise<void> {
  await request(`/watches/${id}`, { method: 'DELETE' })
}
