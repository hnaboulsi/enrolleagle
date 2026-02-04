import 'dotenv/config';
import PgBoss from 'pg-boss';
import { env } from '@/src/lib/env';
import { pollWatchItems } from '@/src/services/pollingService';
import { log } from '@/src/lib/logger';

const boss = new PgBoss({ connectionString: env.DATABASE_URL });

async function start() {
  await boss.start();

  await boss.work('watch.poll', async () => {
    await pollWatchItems();
  });

  await boss.schedule('watch.poll', '*/1 * * * *');

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
