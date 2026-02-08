import 'dotenv/config';
import { prisma } from '@/src/lib/prisma';

async function main() {
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
