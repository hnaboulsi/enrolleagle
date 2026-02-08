import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSessionUser } from '@/src/lib/session';
import { rateLimit } from '@/src/lib/rateLimit';
import { searchSections } from '@/src/services/searchService';

const schema = z.object({
  college: z.string().min(1),
  term: z.string().optional(),
  q: z.string().optional(),
  subject: z.string().optional(),
  number: z.string().optional()
});

export async function GET(request: Request) {
  let user;
  try {
    user = await requireSessionUser();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  const parsed = schema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query.' }, { status: 400 });
  }

  const bucket = rateLimit(`search:${user.id}`, 30, 60 * 1000);
  if (!bucket.ok) {
    return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 });
  }

  const { college, term, q, subject, number } = parsed.data;
  try {
    const items = await searchSections({
      collegeSlug: college,
      term: term ?? undefined,
      q: q ?? undefined,
      subject: subject ?? undefined,
      number: number ?? undefined
    });
    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
