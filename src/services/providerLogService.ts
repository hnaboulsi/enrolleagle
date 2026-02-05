import { prisma } from '@/src/lib/prisma';

export async function logProviderEvent(input: {
  collegeId?: string | null;
  watchItemId?: string | null;
  level: 'info' | 'warn' | 'error';
  message: string;
  meta?: Record<string, any>;
}) {
  await prisma.providerLog.create({
    data: {
      collegeId: input.collegeId ?? null,
      watchItemId: input.watchItemId ?? null,
      level: input.level,
      message: input.message,
      meta: input.meta ?? {}
    }
  });
}
