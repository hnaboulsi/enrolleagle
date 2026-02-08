import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { env } from '@/src/lib/env';
import { prisma } from '@/src/lib/prisma';

export type SessionData = {
  userId?: string;
  email?: string;
};

export async function getSession() {
  return getIronSession<SessionData>(cookies(), {
    cookieName: 'adddropper_session',
    password: env.SESSION_SECRET,
    cookieOptions: {
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      httpOnly: true,
      path: '/'
    }
  });
}

export async function setSession(user: { id: string; email: string }) {
  const session = await getSession();
  session.userId = user.id;
  session.email = user.email;
  await session.save();
}

export async function clearSession() {
  const session = await getSession();
  session.destroy();
}

export async function getSessionUser() {
  const session = await getSession();
  if (session.userId) {
    return prisma.user.findUnique({ where: { id: session.userId } });
  }
  if (session.email) {
    return prisma.user.findUnique({ where: { email: session.email } });
  }
  return null;
}

export async function requireSessionUser() {
  const user = await getSessionUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}
