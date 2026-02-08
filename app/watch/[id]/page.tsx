import { redirect } from 'next/navigation';
import { prisma } from '@/src/lib/prisma';
import { getCurrentUser } from '@/src/lib/auth';
import { env } from '@/src/lib/env';
import { AlertHistoryList } from '@/components/AlertHistoryList';
import { StatusPill } from '@/components/StatusPill';

function computeNextCheck(lastCheckedAt: Date | null, consecutiveFailures: number) {
  if (!lastCheckedAt) return 'Soon';
  const multiplier = Math.min(4, Math.pow(2, consecutiveFailures));
  const intervalMs = env.POLL_INTERVAL_SECONDS * multiplier * 1000;
  const next = new Date(lastCheckedAt.getTime() + intervalMs);
  return next.toLocaleString();
}

export default async function WatchDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const item = await prisma.watchItem.findFirst({
    where: { id: params.id, userId: user.id, status: { not: 'DELETED' } },
    include: {
      college: true,
      alerts: { orderBy: { createdAt: 'desc' }, take: 20 },
      logs: { orderBy: { createdAt: 'desc' }, take: 20 }
    }
  });

  if (!item) {
    redirect('/dashboard');
  }

  const nextCheck = computeNextCheck(item.lastCheckedAt, item.consecutiveFailures);

  return (
    <div className="space-y-6 pt-6">
      <div>
        <h1 className="text-3xl font-bold">Watch details</h1>
        <p className="text-sm text-slate-600">Track current status and recent checks.</p>
      </div>

      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="text-sm text-slate-500">{item.college.name}</p>
            <h2 className="text-2xl font-semibold">{item.sectionLabel ?? item.externalSectionId}</h2>
            <p className="text-sm text-slate-600">
              {[item.subject, item.catalogNumber].filter(Boolean).join(' ')} {item.courseTitle ? `· ${item.courseTitle}` : ''}
            </p>
            <p className="text-xs text-slate-500">Term: {item.term}</p>
          </div>
          <div className="text-right text-sm text-slate-600">
            <p>Seats available: {item.lastKnownSeats ?? 'Unknown'}</p>
            <p>Waitlist: {item.lastKnownWaitlist ?? 'Unknown'}</p>
            <div className="mt-2">
              <StatusPill state={item.lastKnownState} />
            </div>
          </div>
        </div>
        <div className="mt-4 grid gap-4 text-sm text-slate-600 md:grid-cols-3">
          <div>
            <p className="text-xs uppercase text-slate-400">Last checked</p>
            <p>{item.lastCheckedAt ? item.lastCheckedAt.toLocaleString() : 'Never'}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-400">Next check</p>
            <p>{nextCheck}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-400">Consecutive failures</p>
            <p>{item.consecutiveFailures}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="card p-6">
          <h3 className="text-lg font-semibold">Alert history</h3>
          <div className="mt-4">
            <AlertHistoryList
              items={item.alerts.map((alert) => ({
                id: alert.id,
                type: alert.type,
                createdAt: alert.createdAt.toISOString(),
                payload: alert.payload
              }))}
            />
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold">Recent checks</h3>
          {item.logs.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">No logs yet.</p>
          ) : (
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              {item.logs.map((log) => (
                <li key={log.id}>
                  <p className="font-semibold">{log.level}</p>
                  <p>{log.message}</p>
                  <p className="text-xs text-slate-500">{log.createdAt.toLocaleString()}</p>
                </li>
              ))}
            </ul>
          )}
          {item.lastErrorAt ? (
            <p className="mt-4 text-xs text-rose-600">Last error at {item.lastErrorAt.toLocaleString()}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
