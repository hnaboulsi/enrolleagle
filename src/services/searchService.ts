import { prisma } from '@/src/lib/prisma';
import { getProvider, isSupported } from '@/src/providers';

export async function searchSections(input: {
  collegeSlug: string;
  term?: string;
  q?: string;
  subject?: string;
  number?: string;
}) {
  const college = await prisma.college.findUnique({ where: { slug: input.collegeSlug } });
  if (!college) {
    throw new Error('College not found');
  }

  if (!isSupported(college.slug)) {
    throw new Error(`${college.name} is coming soon — search is not available yet.`);
  }

  const provider = getProvider(college.adapterKey);
  return provider.searchSections({
    term: input.term ?? 'current',
    q: input.q,
    subject: input.subject,
    number: input.number
  });
}
