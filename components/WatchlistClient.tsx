'use client';

import { useMemo, useState } from 'react';

export type WatchItemView = {
  id: string;
  college: string;
  term: string | null;
  subject: string | null;
  catalogNumber: string | null;
  sectionLabel: string | null;
  status: 'active' | 'paused' | 'error';
  lastCheckedAt: string | null;
  lastKnownSeats: number | null;
  lastKnownWaitlist: number | null;
  lastKnownState: string | null;
  lastChangeAt: string | null;
  alertOnWaitlist: boolean;
};

export function WatchlistClient({ items }: { items: WatchItemView[] }) {
  const [data, setData] = useState(items);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const hasItems = data.length > 0;

  const stats = useMemo(() => {
    const active = data.filter((item) => item.status === 'active').length;
    return { total: data.length, active };
  }, [data]);

  async function updateItem(id: string, patch: Partial<WatchItemView>) {
    setLoadingId(id);
    const response = await fetch(`/api/watchlist/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch)
    });
    setLoadingId(null);
    if (!response.ok) {
      return;
    }
    setData((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  async function deleteItem(id: string) {
    setLoadingId(id);
    await fetch(`/api/watchlist/${id}`, { method: 'DELETE' });
    setLoadingId(null);
    setData((prev) => prev.filter((item) => item.id !== id));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Your watchlist</h2>
          <p className="text-sm text-slate-600">
            {stats.total} total watches · {stats.active} active
          </p>
        </div>
        <a className="btn-primary" href="/watch/new">
          Add watch
        </a>
      </div>
      {!hasItems ? (
        <div className="card p-6 text-sm text-slate-600">
          No watches yet. Add a class section to start receiving alerts.
        </div>
      ) : (
        <div className="grid gap-4">
          {data.map((item) => (
            <div key={item.id} className="card p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-slate-500">{item.college}</p>
                  <h3 className="text-lg font-semibold">
                    {item.sectionLabel ?? 'Section'}{' '}
                    {item.subject && item.catalogNumber
                      ? `(${item.subject} ${item.catalogNumber})`
                      : null}
                  </h3>
                  <p className="text-xs text-slate-500">Term: {item.term ?? 'Current term'}</p>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <p>Last checked: {item.lastCheckedAt ?? 'Never'}</p>
                  <p>Last change: {item.lastChangeAt ?? '—'}</p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-3">
                <div>
                  <p className="text-xs uppercase text-slate-400">Seats</p>
                  <p className="font-semibold text-slate-700">
                    {item.lastKnownSeats ?? 'Unknown'} ({item.lastKnownState ?? 'unknown'})
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-400">Waitlist</p>
                  <p className="font-semibold text-slate-700">{item.lastKnownWaitlist ?? 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-400">Status</p>
                  <p className="font-semibold text-slate-700">{item.status}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  className="btn-outline"
                  onClick={() =>
                    updateItem(item.id, { status: item.status === 'active' ? 'paused' : 'active' })
                  }
                  disabled={loadingId === item.id}
                >
                  {item.status === 'active' ? 'Pause' : 'Resume'}
                </button>
                <button
                  className="btn-outline"
                  onClick={() => updateItem(item.id, { alertOnWaitlist: !item.alertOnWaitlist })}
                  disabled={loadingId === item.id}
                >
                  Waitlist alerts: {item.alertOnWaitlist ? 'On' : 'Off'}
                </button>
                <button className="btn-outline" onClick={() => deleteItem(item.id)} disabled={loadingId === item.id}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
