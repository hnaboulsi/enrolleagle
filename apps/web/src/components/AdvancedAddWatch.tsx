import { FormEvent, useMemo, useState } from 'react'
import { createWatch, type Watch } from '../api/client'

const providerOptions = [
  { value: 'foothill', label: 'Foothill' },
  { value: 'socccd', label: 'SOCCCD (IVC/Saddleback)' },
  { value: 'deanza', label: 'De Anza' },
  { value: 'smc', label: 'Santa Monica College (unsupported)' },
  { value: 'sdccd', label: 'SDCCD (unsupported)' },
  { value: 'vsb4cd', label: '4CD/VSB (unsupported)' },
]

type Props = {
  onCreated: (watch: Watch) => Promise<void> | void
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

  const inputClass =
    'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm transition-colors focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200'
  const selectedProvider = useMemo(
    () => providerOptions.find((option) => option.value === provider),
    [provider],
  )

  if (!open) {
    return (
      <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white/75 p-4 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-display text-xs uppercase tracking-[0.22em] text-slate-500">
              Optional fallback
            </p>
            <h3 className="mt-2 text-base font-semibold text-slate-900">Add a watch manually</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Use this if the catalog search misses a section. A CRN, class number, or public
              schedule URL is enough to get started.
            </p>
          </div>

          <button
            onClick={() => setOpen(true)}
            className="rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2"
          >
            Add manually
          </button>
        </div>
      </div>
    )
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!crn.trim() && !classNumber.trim() && !pastedUrl.trim()) {
      setError('Enter at least one identifier: a CRN, class number, or public schedule URL.')
      return
    }

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
      const watch = await createWatch(payload)
      await onCreated(watch)
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

  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white/90 p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-display text-xs uppercase tracking-[0.22em] text-slate-500">
            Manual setup
          </p>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">Create a watch without search</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Best for direct CRNs, copied schedule links, or providers that need extra context.
          </p>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 transition-colors hover:border-slate-400 hover:text-slate-700"
        >
          Close
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-5 grid gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">
            Provider
            <select
              value={provider}
              onChange={(event) => setProvider(event.target.value)}
              className={`${inputClass} mt-1.5`}
            >
              {providerOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Term
            <input
              value={termRef}
              onChange={(event) => setTermRef(event.target.value)}
              placeholder="2026SP or current"
              className={`${inputClass} mt-1.5`}
            />
          </label>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
          <p className="text-sm font-semibold text-slate-800">Choose one identifier</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            The more specific you are, the easier it is to build the watch correctly.
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              CRN
              <input
                value={crn}
                onChange={(event) => setCrn(event.target.value)}
                placeholder="12345"
                className={`${inputClass} mt-1.5`}
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Class number
              <input
                value={classNumber}
                onChange={(event) => setClassNumber(event.target.value)}
                placeholder="33445"
                className={`${inputClass} mt-1.5`}
              />
            </label>
          </div>

          <label className="mt-4 block text-sm font-medium text-slate-700">
            Public schedule URL
            <input
              value={pastedUrl}
              onChange={(event) => setPastedUrl(event.target.value)}
              placeholder="https://..."
              className={`${inputClass} mt-1.5`}
            />
          </label>
        </div>

        {provider === 'socccd' && (
          <label className="block text-sm font-medium text-slate-700">
            Campus
            <select
              value={campusCode}
              onChange={(event) => setCampusCode(event.target.value)}
              className={`${inputClass} mt-1.5`}
            >
              <option value="ivc">IVC</option>
              <option value="saddleback">Saddleback</option>
            </select>
          </label>
        )}

        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <label className="block text-sm font-medium text-slate-700">
            Check interval
            <input
              type="number"
              min={120}
              step={60}
              value={cadenceSeconds}
              onChange={(event) => setCadenceSeconds(Number(event.target.value || 120))}
              className={`${inputClass} mt-1.5`}
            />
            <span className="mt-1 block text-xs text-slate-500">Minimum: 120 seconds.</span>
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={notifyOnWaitlist}
              onChange={(event) => setNotifyOnWaitlist(event.target.checked)}
              className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            Notify me when waitlist spots open
          </label>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl bg-slate-950 px-4 py-4 text-white sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold">{selectedProvider?.label ?? 'Selected provider'}</p>
            <p className="mt-1 text-xs leading-5 text-slate-300">
              Unsupported providers may need a schedule URL or extra cleanup after creation.
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-slate-950 transition-all hover:-translate-y-0.5 hover:bg-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-orange-300"
          >
            {submitting ? 'Saving watch...' : 'Save manual watch'}
          </button>
        </div>
      </form>
    </div>
  )
}
