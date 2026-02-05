import { NextResponse } from 'next/server';
import { PgBoss } from 'pg-boss';
import { prisma } from '@/src/lib/prisma';
import { env } from '@/src/lib/env';

export async function GET() {
  let db = 'ok';
  let queue = 'ok';

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    db = 'error';
  }

  try {
    const boss = new PgBoss({ connectionString: env.DATABASE_URL });
    await boss.start();

    await boss.stop();
  } catch {
    queue = 'error';
  }

  const status = db === 'ok' && queue === 'ok' ? 200 : 503;
  return NextResponse.json({ db, queue, status }, { status });
}
