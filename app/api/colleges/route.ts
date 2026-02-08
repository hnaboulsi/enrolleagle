import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';

export async function GET() {
  const colleges = await prisma.college.findMany({ orderBy: { name: 'asc' } });
  return NextResponse.json({ items: colleges });
}
