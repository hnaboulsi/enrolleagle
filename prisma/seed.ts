import 'dotenv/config';
import { prisma } from '@/src/lib/prisma';

async function main() {
  const colleges = [
    { name: 'De Anza College', slug: 'deanza', adapterKey: 'deanza', defaultTerm: '2026SP' },
    { name: 'Foothill College', slug: 'foothill', adapterKey: 'foothill', defaultTerm: '2026SP' },
    { name: 'Diablo Valley College', slug: 'dvc', adapterKey: 'dvc', defaultTerm: '2026SP' },
    { name: 'Santa Monica College', slug: 'smc', adapterKey: 'smc', defaultTerm: '2026SP' },
    { name: 'Irvine Valley College', slug: 'ivc', adapterKey: 'ivc', defaultTerm: '2026SP' }
  ];

  for (const college of colleges) {
    await prisma.college.upsert({
      where: { slug: college.slug },
      update: college,
      create: college
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
