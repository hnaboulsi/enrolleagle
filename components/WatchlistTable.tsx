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
      <div className="card p-6 text-sm text-slate-600">
        No watches yet. Add a class section to start receiving alerts.
      </div>
    );
  }

  return (
    <div className="card overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-emerald-100/60 bg-emerald-50/60 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">College</th>
            <th className="px-4 py-3">Course</th>
            <th className="px-4 py-3">Section</th>
            <th className="px-4 py-3">Seats</th>
            <th className="px-4 py-3">State</th>
            <th className="px-4 py-3">Last Checked</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-emerald-100/50">
          {data.map((item) => (
            <tr key={item.id} className="text-slate-700">
              <td className="px-4 py-4">
                <p className="font-semibold">{item.collegeName}</p>
                <p className="text-xs text-slate-500">{item.term}</p>
              </td>
              <td className="px-4 py-4">
                <p className="font-semibold">
                  {[item.subject, item.catalogNumber].filter(Boolean).join(' ')}
                </p>
                <p className="text-xs text-slate-500">{item.courseTitle ?? '—'}</p>
              </td>
              <td className="px-4 py-4">{item.sectionLabel ?? '—'}</td>
              <td className="px-4 py-4 font-semibold">{item.lastKnownSeats ?? 'Unknown'}</td>
              <td className="px-4 py-4">
                <StatusPill state={item.lastKnownState} />
              </td>
              <td className="px-4 py-4">
                <LastCheckedIndicator lastCheckedAt={item.lastCheckedAt} />
              </td>
              <td className="px-4 py-4">
                <span className="text-xs font-semibold text-slate-600">{item.status}</span>
              </td>
              <td className="px-4 py-4">
                <div className="flex flex-wrap gap-2">
                  <Link href={`/watch/${item.id}`} className="btn-outline">
                    View
                  </Link>
                  <button
                    className="btn-outline"
                    disabled={loadingId === item.id}
                    onClick={() =>
                      updateStatus(item.id, item.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE')
                    }
                  >
                    {item.status === 'ACTIVE' ? 'Pause' : 'Resume'}
                  </button>
                  <button
                    className="btn-outline"
                    disabled={loadingId === item.id}
                    onClick={() => deleteItem(item.id)}
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
