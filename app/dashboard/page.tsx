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
    <div className="space-y-6 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-sm text-slate-600">Monitor seat availability across your selected classes.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/watch/new" className="btn-primary">
            Add watch
          </Link>
          <LogoutButton />
        </div>
      </div>

      {hasFailures ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          Some checks are failing; see details in the watch list or admin diagnostics.
        </div>
      ) : null}

      <WatchlistTable items={viewItems} />

      <div className="card p-6">
        <h2 className="text-lg font-semibold">Recent alerts</h2>
        {recentAlerts.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">No alerts yet.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            {recentAlerts.map((alert) => (
              <li key={alert.id}>
                {alert.watchItem.college.name} · {alert.watchItem.sectionLabel ?? alert.watchItem.externalSectionId} ·{' '}
                {alert.type.replace(/_/g, ' ')} · {alert.createdAt.toLocaleString()}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
