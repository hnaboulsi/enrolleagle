export function StatusPill({ state }: { state: string | null }) {
  const normalized = (state || 'UNKNOWN').toUpperCase();
  const style =
    normalized === 'OPEN'
      ? 'bg-emerald-100 text-emerald-800'
      : normalized === 'CLOSED'
        ? 'bg-rose-100 text-rose-800'
        : 'bg-slate-100 text-slate-600';

  return <span className={`rounded-full px-2 py-1 text-xs font-semibold ${style}`}>{normalized}</span>;
}
