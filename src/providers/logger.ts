import { prisma } from '@/src/lib/prisma';
import { logProviderEvent } from '@/src/services/providerLogService';

export async function logProviderError(input: {
  collegeSlug: string;
  watchItemId?: string;
  message: string;
  meta?: Record<string, unknown>;
}) {
  const college = await prisma.college.findUnique({ where: { slug: input.collegeSlug } });
  await logProviderEvent({
    collegeId: college?.id ?? null,
    watchItemId: input.watchItemId ?? null,
    level: 'ERROR',
    message: input.message,
    meta: input.meta ?? {}
  });
}
