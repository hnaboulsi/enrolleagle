import { NextResponse } from 'next/server';
import { PgBoss } from 'pg-boss';
import { prisma } from '@/src/lib/prisma';
import { env } from '@/src/lib/env';
import { getSessionUser } from '@/src/lib/session';
import { isAdminEmail } from '@/src/lib/auth';

export async function GET() {
  const user = await getSessionUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const failingWatchItems = await prisma.watchItem.findMany({
    where: { consecutiveFailures: { gt: 0 }, status: { not: 'DELETED' } },
    include: { college: true },
    orderBy: { lastErrorAt: 'desc' }
  });

  let queueStatus: Record<string, unknown> = { status: 'unknown' };
  try {
    const boss = new PgBoss({ connectionString: env.DATABASE_URL });
    await boss.start();
    const pollStats = await boss.getQueueStats('poll-watch-item').catch(() => null);
    const enqueueStats = await boss.getQueueStats('enqueue-due-watch-items').catch(() => null);
    await boss.stop();
    queueStatus = {
      status: 'active',
      poll: pollStats,
      enqueue: enqueueStats
    };
  } catch (error) {
    queueStatus = { status: 'error', message: (error as Error).message };
  }

  return NextResponse.json({
    queue: queueStatus,
    failingWatchItems
  });
}
