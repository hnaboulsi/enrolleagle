type Props = {
  status: string
  openSeats?: number | null
  waitlistSeats?: number | null
}

const colorMap: Record<string, string> = {
  OPEN: 'bg-emerald-100 text-emerald-800',
  WAITLIST: 'bg-amber-100 text-amber-800',
  FULL: 'bg-red-100 text-red-800',
  CLOSED: 'bg-slate-200 text-slate-600',
  UNKNOWN: 'bg-slate-100 text-slate-500',
  BLOCKED: 'bg-orange-100 text-orange-700',
  UNSUPPORTED: 'bg-orange-100 text-orange-700',
}

export default function SeatBadge({ status, openSeats, waitlistSeats }: Props) {
  const colors = colorMap[status] ?? colorMap.UNKNOWN
  const label = status === 'OPEN' && openSeats != null
    ? `Open (${openSeats})`
    : status === 'WAITLIST' && waitlistSeats != null
      ? `Waitlist (${waitlistSeats})`
      : status === 'FULL'
        ? 'Full'
        : status

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${colors}`}>
      {label}
    </span>
  )
}
