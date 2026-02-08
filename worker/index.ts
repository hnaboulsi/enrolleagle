import 'dotenv/config';
import { PgBoss } from 'pg-boss';
import { env } from '@/src/lib/env';
import { enqueueDueWatchItems, pollWatchItem } from '@/src/services/pollingService';
import { log } from '@/src/lib/logger';

const boss = new PgBoss({ connectionString: env.DATABASE_URL });

async function start() {
  await boss.start();

  await boss.work('enqueue-due-watch-items', async () => {
    await enqueueDueWatchItems(boss);
  });

  await boss.work('poll-watch-item', { groupConcurrency: 3 }, async (jobs) => {
    for (const job of jobs) {
      await pollWatchItem(job.data.watchItemId);
    }
  });

  await boss.schedule('enqueue-due-watch-items', '*/1 * * * *');

  log('info', 'Worker started');
}

start().catch((error) => {
  log('error', 'Worker failed to start', { error: (error as Error).message });
  process.exit(1);
});

process.on('SIGTERM', async () => {
  await boss.stop({ timeout: 5000 });
  process.exit(0);
});
