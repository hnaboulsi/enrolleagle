import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/src/lib/prisma';
import { createSessionToken, hashPassword, setAuthCookie } from '@/src/lib/auth';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export async function POST(request: Request) {
  const body = await request.json();
  const result = schema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 });
  }

  const { email, password } = result.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: 'Email already in use.' }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { email, passwordHash }
  });

  const token = createSessionToken({ userId: user.id, email: user.email });
  setAuthCookie(token);

  return NextResponse.json({ id: user.id, email: user.email });
}
