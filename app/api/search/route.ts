import { NextResponse } from 'next/server';
import { z } from 'zod';
import { env } from '@/src/lib/env';
import { rateLimit } from '@/src/lib/rateLimit';
import { searchSections } from '@/src/services/searchService';
import { requireApiUser } from '@/src/lib/apiAuth';

const schema = z.object({
  collegeSlug: z.string().min(1),
  term: z.string().optional().nullable(),
  subject: z.string().optional().nullable(),
  number: z.string().optional().nullable(),
  keyword: z.string().optional().nullable()
});

export async function POST(request: Request) {
  try {
    await requireApiUser();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const bucket = rateLimit(`search:${ip}`, env.SEARCH_RATE_LIMIT_MAX, env.SEARCH_RATE_LIMIT_WINDOW_SECONDS * 1000);
  if (!bucket.ok) {
    return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 });
  }

  const body = await request.json();
  const result = schema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 });
  }

  try {
    const items = await searchSections(result.data);
    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
