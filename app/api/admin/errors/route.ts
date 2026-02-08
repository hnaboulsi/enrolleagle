import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { getSessionUser } from '@/src/lib/session';
import { isAdminEmail } from '@/src/lib/auth';

export async function GET() {
  const user = await getSessionUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const logs = await prisma.providerLog.findMany({
    where: { level: 'ERROR' },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { college: true, watchItem: true }
  });

  return NextResponse.json({ items: logs });
}
