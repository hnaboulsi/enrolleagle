import { redirect } from 'next/navigation';
import { WatchlistClient, WatchItemView } from '@/components/WatchlistClient';
import { getCurrentUser } from '@/src/lib/auth';
import { prisma } from '@/src/lib/prisma';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const items = await prisma.watchItem.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    include: { college: true }
  });

  const recentAlerts = await prisma.alertEvent.findMany({
    where: { watchItem: { userId: user.id } },
    include: { watchItem: { include: { college: true } } },
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  const viewItems: WatchItemView[] = items.map((item) => ({
    id: item.id,
    college: item.college.name,
    term: item.term,
    subject: item.subject,
    catalogNumber: item.catalogNumber,
    sectionLabel: item.sectionLabel,
    status: item.status,
    lastCheckedAt: item.lastCheckedAt ? item.lastCheckedAt.toISOString() : null,
    lastKnownSeats: item.lastKnownSeats,
    lastKnownWaitlist: item.lastKnownWaitlist,
    lastKnownState: item.lastKnownState,
    lastChangeAt: item.lastChangeAt ? item.lastChangeAt.toISOString() : null,
    alertOnWaitlist: item.alertOnWaitlist
  }));

  return (
    <div className="space-y-6 pt-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-sm text-slate-600">Monitor seat availability across your selected classes.</p>
      </div>
      <WatchlistClient items={viewItems} />
      <div className="card p-6">
        <h2 className="text-lg font-semibold">Recent alerts</h2>
        {recentAlerts.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">No alerts yet.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            {recentAlerts.map((alert) => (
              <li key={alert.id}>
                {alert.watchItem.college.name} · {alert.watchItem.sectionLabel ?? alert.watchItem.sectionId} ·{' '}
                {alert.type.replace('_', ' ')} · {alert.createdAt.toISOString()}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
