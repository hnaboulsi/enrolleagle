import { FormEvent, useState } from 'react'
import { createWatch } from '../api/client'

const providerOptions = [
  { value: 'foothill', label: 'Foothill' },
  { value: 'socccd', label: 'SOCCCD (IVC/Saddleback)' },
  { value: 'deanza', label: 'De Anza' },
  { value: 'smc', label: 'Santa Monica College (Unsupported)' },
  { value: 'sdccd', label: 'SDCCD (Unsupported)' },
  { value: 'vsb4cd', label: '4CD/VSB (Unsupported)' },
]

type Props = {
  onCreated: () => void
}

export default function AdvancedAddWatch({ onCreated }: Props) {
  const [open, setOpen] = useState(false)
  const [provider, setProvider] = useState('foothill')
  const [termRef, setTermRef] = useState('current')
  const [crn, setCrn] = useState('')
  const [classNumber, setClassNumber] = useState('')
  const [pastedUrl, setPastedUrl] = useState('')
  const [campusCode, setCampusCode] = useState('ivc')
  const [cadenceSeconds, setCadenceSeconds] = useState(120)
  const [notifyOnWaitlist, setNotifyOnWaitlist] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-slate-500 underline underline-offset-2 hover:text-slate-700 transition-colors"
      >
        Advanced: Add by CRN/URL
      </button>
    )
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    const payload: Record<string, unknown> = {
      provider,
      term_ref: termRef,
      cadence_seconds: cadenceSeconds,
      notify_on_waitlist: notifyOnWaitlist,
    }
    if (crn.trim()) payload.crn = crn.trim()
    if (classNumber.trim()) payload.class_number = classNumber.trim()
    if (pastedUrl.trim()) payload.pasted_url = pastedUrl.trim()
    if (provider === 'socccd') payload.campus_code = campusCode

    try {
      await createWatch(payload)
      onCreated()
      setOpen(false)
      setCrn('')
      setClassNumber('')
      setPastedUrl('')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500'

  return (
    <div className="rounded-xl bg-white/80 border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-700">Add Watch by CRN/URL</h3>
        <button
          onClick={() => setOpen(false)}
          className="text-sm text-slate-400 hover:text-slate-600"
        >
          Close
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Provider</label>
          <select value={provider} onChange={(e) => setProvider(e.target.value)} className={inputClass}>
            {providerOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Term</label>
          <input value={termRef} onChange={(e) => setTermRef(e.target.value)} placeholder="2026SP or current" className={inputClass} />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">CRN</label>
          <input value={crn} onChange={(e) => setCrn(e.target.value)} placeholder="12345" className={inputClass} />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Class Number</label>
          <input value={classNumber} onChange={(e) => setClassNumber(e.target.value)} placeholder="33445" className={inputClass} />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Public Schedule URL</label>
          <input value={pastedUrl} onChange={(e) => setPastedUrl(e.target.value)} placeholder="https://..." className={inputClass} />
        </div>

        {provider === 'socccd' && (
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Campus</label>
            <select value={campusCode} onChange={(e) => setCampusCode(e.target.value)} className={inputClass}>
              <option value="ivc">IVC</option>
              <option value="saddleback">Saddleback</option>
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Check interval (seconds, min 120)</label>
          <input type="number" min={120} value={cadenceSeconds} onChange={(e) => setCadenceSeconds(Number(e.target.value || 120))} className={inputClass} />
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
          <input type="checkbox" checked={notifyOnWaitlist} onChange={(e) => setNotifyOnWaitlist(e.target.checked)} className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
          Notify on waitlist openings
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-50 transition-colors"
        >
          {submitting ? 'Saving...' : 'Create Watch'}
        </button>
      </form>
    </div>
  )
}
