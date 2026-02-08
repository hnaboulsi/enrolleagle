import { NextResponse } from 'next/server';
import { getSessionUser } from '@/src/lib/session';

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  return NextResponse.json({ user: { id: user.id, email: user.email } });
}
