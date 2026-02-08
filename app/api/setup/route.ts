import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');

  // Simple auth - replace with a secret key
  const SETUP_SECRET = process.env.SETUP_SECRET || 'your-secret-setup-key-change-me';

  if (authHeader !== `Bearer ${SETUP_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const colleges = [
      { name: 'De Anza College', slug: 'deanza', adapterKey: 'deanza' },
      { name: 'Foothill College', slug: 'foothill', adapterKey: 'foothill' },
      { name: 'Diablo Valley College', slug: 'dvc', adapterKey: 'dvc' },
      { name: 'Santa Monica College', slug: 'smc', adapterKey: 'smc' },
      { name: 'Irvine Valley College', slug: 'ivc', adapterKey: 'ivc' }
    ];

    for (const college of colleges) {
      await prisma.college.upsert({
        where: { slug: college.slug },
        update: college,
        create: college
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Colleges seeded successfully',
      colleges: colleges.length
    });
  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json({
      error: 'Failed to seed colleges',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
