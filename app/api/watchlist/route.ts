import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/src/lib/prisma';
import { requireApiUser } from '@/src/lib/apiAuth';
import { addWatchItem } from '@/src/services/watchService';

const schema = z.object({
  collegeSlug: z.string().min(1),
  term: z.string().optional().nullable(),
  subject: z.string().optional().nullable(),
  catalogNumber: z.string().optional().nullable(),
  sectionLabel: z.string().optional().nullable(),
  sectionId: z.string().min(1),
  detailUrl: z.string().optional().nullable()
});

export async function GET() {
  try {
    const user = await requireApiUser();
    const items = await prisma.watchItem.findMany({
      where: { userId: user.id },
      include: { college: true },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(request: Request) {
  let user;
  try {
    user = await requireApiUser();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const result = schema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 });
  }

  const college = await prisma.college.findUnique({ where: { slug: result.data.collegeSlug } });
  if (!college) {
    return NextResponse.json({ error: 'College not found.' }, { status: 404 });
  }

  const existing = await prisma.watchItem.findFirst({
    where: {
      userId: user.id,
      collegeId: college.id,
      sectionId: result.data.sectionId
    }
  });
  if (existing) {
    return NextResponse.json({ error: 'Already watching this section.' }, { status: 409 });
  }

  try {
    const watchItem = await addWatchItem({
      userId: user.id,
      collegeId: college.id,
      term: result.data.term ?? college.defaultTerm ?? null,
      subject: result.data.subject ?? null,
      catalogNumber: result.data.catalogNumber ?? null,
      sectionLabel: result.data.sectionLabel ?? null,
      sectionId: result.data.sectionId,
      detailUrl: result.data.detailUrl ?? null
    });
    return NextResponse.json(watchItem);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
