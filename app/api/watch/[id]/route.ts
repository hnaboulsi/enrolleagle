import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/src/lib/prisma';
import { requireSessionUser } from '@/src/lib/session';

const patchSchema = z.object({
  status: z.enum(['ACTIVE', 'PAUSED']).optional()
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  let user;
  try {
    user = await requireSessionUser();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 });
  }

  const existing = await prisma.watchItem.findFirst({
    where: { id: params.id, userId: user.id, status: { not: 'DELETED' } }
  });
  if (!existing) {
    return NextResponse.json({ error: 'Watch item not found.' }, { status: 404 });
  }

  const updated = await prisma.watchItem.update({
    where: { id: params.id },
    data: parsed.data
  });

  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  let user;
  try {
    user = await requireSessionUser();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const existing = await prisma.watchItem.findFirst({
    where: { id: params.id, userId: user.id, status: { not: 'DELETED' } }
  });
  if (!existing) {
    return NextResponse.json({ error: 'Watch item not found.' }, { status: 404 });
  }

  await prisma.watchItem.update({
    where: { id: params.id },
    data: { status: 'DELETED' }
  });

  return NextResponse.json({ ok: true });
}
