import { NextResponse } from 'next/server';
import { clearAuthCookie } from '@/src/lib/auth';

export async function POST() {
  clearAuthCookie();
  return NextResponse.json({ ok: true });
}
