import { prisma } from '@/src/lib/prisma';
import { getProvider } from '@/src/providers';
import type { SearchQuery } from '@/src/providers/types';

export async function searchSections(query: SearchQuery) {
  const college = await prisma.college.findUnique({ where: { slug: query.collegeSlug } });
  if (!college) {
    throw new Error('College not found');
  }
  const provider = getProvider(college.adapterKey);
  return provider.searchSections({ ...query, term: query.term ?? college.defaultTerm ?? null });
}
