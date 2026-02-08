'use client';

import { useState } from 'react';
import Link from 'next/link';
import { StatusPill } from '@/components/StatusPill';
import { LastCheckedIndicator } from '@/components/LastCheckedIndicator';

export type WatchItemRow = {
  id: string;
  collegeName: string;
  term: string;
  subject: string | null;
  catalogNumber: string | null;
  courseTitle: string | null;
  sectionLabel: string | null;
  lastKnownSeats: number | null;
  lastKnownState: string | null;
  lastCheckedAt: string | null;
  status: 'ACTIVE' | 'PAUSED' | 'DELETED';
  consecutiveFailures: number;
};

export function WatchlistTable({ items }: { items: WatchItemRow[] }) {
  const [data, setData] = useState(items);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function updateStatus(id: string, status: 'ACTIVE' | 'PAUSED') {
    setLoadingId(id);
    const response = await fetch(`/api/watch/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    setLoadingId(null);
    if (!response.ok) return;
    setData((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)));
  }

  async function deleteItem(id: string) {
    setLoadingId(id);
    const response = await fetch(`/api/watch/${id}`, { method: 'DELETE' });
    setLoadingId(null);
    if (!response.ok) return;
    setData((prev) => prev.filter((item) => item.id !== id));
  }

  if (data.length === 0) {
    return (
      <div className="card p-8 text-center border border-emerald-100">
        <p className="text-4xl mb-3">📋</p>
        <p className="text-base font-semibold text-slate-700">No watches yet</p>
        <p className="text-sm text-slate-500 mt-1">Add a class section to start receiving seat alerts.</p>
        <Link href="/watch/new" className="btn-primary mt-4 inline-block">
          Add your first watch
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((item) => (
        <div key={item.id} className="card p-5 border border-emerald-100">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Left: Course Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-800">
                  {[item.subject, item.catalogNumber].filter(Boolean).join(' ') || 'Unknown Course'}
                </h3>
                <StatusPill state={item.lastKnownState} />
                {item.status === 'PAUSED' && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">Paused</span>
                )}
                {item.consecutiveFailures > 0 && (
                  <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">Failing</span>
                )}
              </div>
              <p className="text-sm text-slate-600 mt-1">
                {item.collegeName} &middot; {item.sectionLabel ?? '—'}
                {item.courseTitle ? ` &middot; ${item.courseTitle}` : ''}
              </p>
              <div className="text-xs text-slate-500 mt-1">
                <LastCheckedIndicator lastCheckedAt={item.lastCheckedAt} />
              </div>
            </div>

            {/* Center: Seats */}
            <div className="text-center px-4">
              <p className="text-3xl font-bold text-slate-800">{item.lastKnownSeats ?? '?'}</p>
              <p className="text-xs text-slate-500">seats</p>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              <Link href={`/watch/${item.id}`} className="btn-outline text-xs px-3 py-1.5">
                View
              </Link>
              <button
                className="btn-outline text-xs px-3 py-1.5"
                disabled={loadingId === item.id}
                onClick={() => updateStatus(item.id, item.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE')}
              >
                {item.status === 'ACTIVE' ? 'Pause' : 'Resume'}
              </button>
              <button
                className="btn-outline text-xs px-3 py-1.5 text-rose-600 border-rose-200 hover:bg-rose-50"
                disabled={loadingId === item.id}
                onClick={() => deleteItem(item.id)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
