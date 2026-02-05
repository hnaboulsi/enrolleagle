import { redirect } from 'next/navigation';
import { PgBoss } from 'pg-boss';
import { prisma } from '@/src/lib/prisma';
import { env } from '@/src/lib/env';
import { getCurrentUser, isAdminEmail } from '@/src/lib/auth';

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user || !isAdminEmail(user.email)) {
    redirect('/dashboard');
  }

  const recentLogs = await prisma.providerLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: { college: true }
  });

  const failingProviders = await prisma.watchItem.findMany({
    where: { status: 'error' },
    include: { college: true }
  });

  let queueState = 'unknown';
  try {
    const boss = new PgBoss({ connectionString: env.DATABASE_URL });
    await boss.start();
    queueState = 'active';
    await boss.stop();
  } catch {
    queueState = 'error';
  }

  return (
    <div className="space-y-6 pt-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Console</h1>
        <p className="text-sm text-slate-600">Provider health, errors, and recent activity.</p>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold">Failing Providers</h2>
        <p className="text-sm text-slate-600">{failingProviders.length} watch items in error state.</p>
        <ul className="mt-3 space-y-2 text-sm text-slate-600">
          {failingProviders.map((item) => (
            <li key={item.id}>
              {item.college.name} · {item.sectionLabel ?? item.sectionId}
            </li>
          ))}
        </ul>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold">Queue Health</h2>
        <p className="text-sm text-slate-600">pg-boss state: {queueState}</p>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold">Recent Provider Logs</h2>
        <div className="mt-3 space-y-3 text-xs text-slate-600">
          {recentLogs.map((log) => (
            <div key={log.id}>
              <p className="font-semibold">{log.level.toUpperCase()} · {log.college?.name ?? 'Unknown'} </p>
              <p>{log.message}</p>
              <p className="text-slate-400">{log.createdAt.toISOString()}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
