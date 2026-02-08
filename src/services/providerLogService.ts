import { prisma } from '@/src/lib/prisma';
import { LogLevel } from '@prisma/client';

export async function logProviderEvent(input: {
  collegeId?: string | null;
  watchItemId?: string | null;
  level: 'INFO' | 'WARN' | 'ERROR';
  message: string;
  meta?: Record<string, any>;
}) {
  await prisma.providerLog.create({
    data: {
      collegeId: input.collegeId ?? null,
      watchItemId: input.watchItemId ?? null,
      level: input.level as LogLevel,
      message: input.message,
      meta: input.meta ?? {}
    }
  });
}
