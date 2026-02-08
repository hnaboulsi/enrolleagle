import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/src/lib/prisma';
import { verifyPassword } from '@/src/lib/auth';
import { rateLimit } from '@/src/lib/rateLimit';
import { setSession } from '@/src/lib/session';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(10)
});

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const bucket = rateLimit(`auth:login:${ip}`, 10, 60 * 1000);
  if (!bucket.ok) {
    return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 });
  }

  const body = await request.json();
  const result = schema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 });
  }

  const email = result.data.email.toLowerCase();
  const { password } = result.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
  }

  await setSession(user);
  return NextResponse.json({ id: user.id, email: user.email });
}
