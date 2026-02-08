export function LastCheckedIndicator({ lastCheckedAt }: { lastCheckedAt: string | null }) {
  if (!lastCheckedAt) {
    return <span className="text-xs text-slate-500">Never checked</span>;
  }
  const date = new Date(lastCheckedAt);
  return <span className="text-xs text-slate-500">{date.toLocaleString()}</span>;
}
