import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/src/lib/prisma';
import { requireSessionUser } from '@/src/lib/session';
import { rateLimit } from '@/src/lib/rateLimit';
import { env } from '@/src/lib/env';
import { addWatchItem, ensureWatchLimit } from '@/src/services/watchService';

const schema = z.object({
  collegeSlug: z.string().min(1),
  term: z.string().min(1),
  subject: z.string().nullable().optional(),
  catalogNumber: z.string().nullable().optional(),
  courseTitle: z.string().nullable().optional(),
  sectionLabel: z.string().nullable().optional(),
  externalSectionId: z.string().min(1),
  externalUrl: z.string().nullable().optional(),
  seatsAvailable: z.number().nullable().optional(),
  waitlistAvailable: z.number().nullable().optional(),
  state: z.enum(['open', 'closed', 'unknown']).nullable().optional()
});

export async function GET() {
  let user;
  try {
    user = await requireSessionUser();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const items = await prisma.watchItem.findMany({
    where: { userId: user.id, status: { not: 'DELETED' } },
    include: { college: true },
    orderBy: { createdAt: 'desc' }
  });

  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  let user;
  try {
    user = await requireSessionUser();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const bucket = rateLimit(`watch:create:${user.id}`, 10, 24 * 60 * 60 * 1000);
  if (!bucket.ok) {
    return NextResponse.json({ error: 'Daily watch limit reached.' }, { status: 429 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 });
  }

  await ensureWatchLimit(user.id, env.MAX_WATCH_ITEMS_FREE);

  const college = await prisma.college.findUnique({ where: { slug: parsed.data.collegeSlug } });
  if (!college) {
    return NextResponse.json({ error: 'College not found.' }, { status: 404 });
  }

  const existing = await prisma.watchItem.findFirst({
    where: {
      userId: user.id,
      collegeId: college.id,
      externalSectionId: parsed.data.externalSectionId,
      status: { not: 'DELETED' }
    }
  });
  if (existing) {
    return NextResponse.json({ error: 'Already watching this section.' }, { status: 409 });
  }

  const watchItem = await addWatchItem({
    userId: user.id,
    collegeId: college.id,
    term: parsed.data.term,
    subject: parsed.data.subject ?? null,
    catalogNumber: parsed.data.catalogNumber ?? null,
    courseTitle: parsed.data.courseTitle ?? null,
    sectionLabel: parsed.data.sectionLabel ?? null,
    externalSectionId: parsed.data.externalSectionId,
    externalUrl: parsed.data.externalUrl ?? null,
    lastKnownSeats: parsed.data.seatsAvailable ?? null,
    lastKnownWaitlist: parsed.data.waitlistAvailable ?? null,
    lastKnownState: parsed.data.state ?? 'unknown'
  });

  return NextResponse.json(watchItem);
}
