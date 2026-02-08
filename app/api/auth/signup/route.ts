import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/src/lib/prisma';
import { hashPassword } from '@/src/lib/auth';
import { rateLimit } from '@/src/lib/rateLimit';
import { setSession } from '@/src/lib/session';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(10)
});

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const bucket = rateLimit(`auth:signup:${ip}`, 10, 60 * 1000);
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
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: 'Email already in use.' }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { email, passwordHash }
  });

  await setSession(user);

  return NextResponse.json({ id: user.id, email: user.email });
}
