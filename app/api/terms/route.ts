import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { getProvider } from '@/src/providers';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const college = searchParams.get('college');

  if (!college) {
    return NextResponse.json({ error: 'Missing college.' }, { status: 400 });
  }

  const collegeRecord = await prisma.college.findUnique({ where: { slug: college } });
  if (!collegeRecord) {
    return NextResponse.json({ error: 'College not found.' }, { status: 404 });
  }

  try {
    const provider = getProvider(collegeRecord.adapterKey);
    const terms = await provider.listTerms();
    return NextResponse.json({ items: terms });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
