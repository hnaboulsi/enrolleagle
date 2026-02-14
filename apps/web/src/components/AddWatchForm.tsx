import { FormEvent, useState } from 'react'

export type AddWatchPayload = {
  provider: string
  term_ref: string
  cadence_seconds: number
  notify_on_waitlist: boolean
  crn?: string
  class_number?: string
  pasted_url?: string
  campus_code?: string
}

type Props = {
  onSubmit: (payload: AddWatchPayload) => Promise<void>
  submitting: boolean
}

const providerOptions = [
  { value: 'foothill', label: 'Foothill' },
  { value: 'socccd', label: 'SOCCCD (IVC/Saddleback)' },
  { value: 'deanza', label: 'De Anza (URL best effort)' },
  { value: 'smc', label: 'Santa Monica College (Unsupported)' },
  { value: 'sdccd', label: 'SDCCD (Unsupported)' },
  { value: 'vsb4cd', label: '4CD/VSB (Unsupported)' },
]

export default function AddWatchForm({ onSubmit, submitting }: Props) {
  const [provider, setProvider] = useState('foothill')
  const [termRef, setTermRef] = useState('current')
  const [crn, setCrn] = useState('')
  const [classNumber, setClassNumber] = useState('')
  const [pastedUrl, setPastedUrl] = useState('')
  const [campusCode, setCampusCode] = useState('ivc')
  const [cadenceSeconds, setCadenceSeconds] = useState(120)
  const [notifyOnWaitlist, setNotifyOnWaitlist] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const payload: AddWatchPayload = {
      provider,
      term_ref: termRef,
      cadence_seconds: cadenceSeconds,
      notify_on_waitlist: notifyOnWaitlist,
    }

    if (crn.trim()) payload.crn = crn.trim()
    if (classNumber.trim()) payload.class_number = classNumber.trim()
    if (pastedUrl.trim()) payload.pasted_url = pastedUrl.trim()
    if (provider === 'socccd') payload.campus_code = campusCode

    await onSubmit(payload)
  }

  return (
    <form className="panel form-grid" onSubmit={handleSubmit}>
      <label>
        Provider
        <select value={provider} onChange={(e) => setProvider(e.target.value)}>
          {providerOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label>
        Term
        <input value={termRef} onChange={(e) => setTermRef(e.target.value)} placeholder="2026SP or current" />
      </label>

      <label>
        CRN
        <input value={crn} onChange={(e) => setCrn(e.target.value)} placeholder="12345" />
      </label>

      <label>
        Class Number
        <input value={classNumber} onChange={(e) => setClassNumber(e.target.value)} placeholder="33445" />
      </label>

      <label>
        Public Schedule URL (recommended)
        <input value={pastedUrl} onChange={(e) => setPastedUrl(e.target.value)} placeholder="https://..." />
      </label>

      {provider === 'socccd' ? (
        <label>
          Campus Code
          <select value={campusCode} onChange={(e) => setCampusCode(e.target.value)}>
            <option value="ivc">IVC</option>
            <option value="saddleback">Saddleback</option>
          </select>
        </label>
      ) : null}

      <label>
        Cadence Seconds (min 120)
        <input
          type="number"
          min={120}
          value={cadenceSeconds}
          onChange={(e) => setCadenceSeconds(Number(e.target.value || 120))}
        />
      </label>

      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={notifyOnWaitlist}
          onChange={(e) => setNotifyOnWaitlist(e.target.checked)}
        />
        Notify on waitlist openings
      </label>

      <button disabled={submitting} type="submit">
        {submitting ? 'Saving...' : 'Create Watch'}
      </button>
    </form>
  )
}
