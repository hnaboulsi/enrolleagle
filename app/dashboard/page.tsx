import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/src/lib/auth';
import { prisma } from '@/src/lib/prisma';
import { WatchlistTable, WatchItemRow } from '@/components/WatchlistTable';
import { LogoutButton } from '@/components/LogoutButton';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const items = await prisma.watchItem.findMany({
    where: { userId: user.id, status: { not: 'DELETED' } },
    orderBy: { createdAt: 'desc' },
    include: { college: true }
  });

  const recentAlerts = await prisma.alertEvent.findMany({
    where: { watchItem: { userId: user.id } },
    include: { watchItem: { include: { college: true } } },
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  const hasFailures = items.some((item) => item.consecutiveFailures > 0);

  const viewItems: WatchItemRow[] = items.map((item) => ({
    id: item.id,
    collegeName: item.college.name,
    term: item.term,
    subject: item.subject,
    catalogNumber: item.catalogNumber,
    courseTitle: item.courseTitle,
    sectionLabel: item.sectionLabel,
    lastKnownSeats: item.lastKnownSeats,
    lastKnownState: item.lastKnownState,
    lastCheckedAt: item.lastCheckedAt ? item.lastCheckedAt.toISOString() : null,
    status: item.status,
    consecutiveFailures: item.consecutiveFailures
  }));

  return (
    <div className="space-y-8 pt-8 fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-base text-slate-600 mt-1">Monitor seat availability across your selected classes</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/watch/new" className="btn-primary">
            Add watch
          </Link>
          <LogoutButton />
        </div>
      </div>

      {/* Failure Alert */}
      {hasFailures && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-800 flex items-start gap-3">
          <span className="text-lg">⚠️</span>
          <div>
            <strong className="font-semibold">Some checks are failing</strong>
            <p className="mt-1 text-rose-700">See details in the watch list or admin diagnostics.</p>
          </div>
        </div>
      )}

      {/* Watchlist */}
      <WatchlistTable items={viewItems} />

      {/* Recent Alerts */}
      <div className="card p-7 border border-emerald-100">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">📬</span>
          <h2 className="text-xl font-bold text-slate-800">Recent Alerts</h2>
        </div>
        {recentAlerts.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center">
            No alerts yet. We&apos;ll notify you when seats become available.
          </p>
        ) : (
          <ul className="space-y-3">
            {recentAlerts.map((alert) => (
              <li key={alert.id} className="flex items-start gap-3 text-sm border-b border-slate-100 last:border-0 pb-3 last:pb-0">
                <span className="text-lg">✉️</span>
                <div className="flex-1">
                  <p className="font-medium text-slate-800">
                    {alert.watchItem.college.name} · {alert.watchItem.sectionLabel ?? alert.watchItem.externalSectionId}
                  </p>
                  <p className="text-slate-600 mt-1">
                    {alert.type.replace(/_/g, ' ')} · {alert.createdAt.toLocaleString()}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
