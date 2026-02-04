import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiUser } from '@/src/lib/apiAuth';
import { updateWatchItem, deleteWatchItem } from '@/src/services/watchService';

const patchSchema = z.object({
  status: z.enum(['active', 'paused', 'error']).optional(),
  alertOnWaitlist: z.boolean().optional()
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  let user;
  try {
    user = await requireApiUser();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const result = patchSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 });
  }

  try {
    const updated = await updateWatchItem(params.id, user.id, result.data);
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 404 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  let user;
  try {
    user = await requireApiUser();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await deleteWatchItem(params.id, user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 404 });
  }
}
