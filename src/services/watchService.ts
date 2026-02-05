import { prisma } from '@/src/lib/prisma';
import { env } from '@/src/lib/env';
import { WatchStatus } from '@prisma/client';

export async function ensureWatchLimit(userId: string) {
  const count = await prisma.watchItem.count({ where: { userId } });
  if (count >= env.WATCH_MAX_PER_USER) {
    throw new Error('Watch limit reached.');
  }
}

export async function addWatchItem(input: {
  userId: string;
  collegeId: string;
  term: string | null;
  subject: string | null;
  catalogNumber: string | null;
  sectionLabel: string | null;
  sectionId: string;
  detailUrl: string | null;
}) {
  await ensureWatchLimit(input.userId);
  return prisma.watchItem.create({
    data: {
      userId: input.userId,
      collegeId: input.collegeId,
      term: input.term,
      subject: input.subject,
      catalogNumber: input.catalogNumber,
      sectionLabel: input.sectionLabel,
      sectionId: input.sectionId,
      detailUrl: input.detailUrl,
      status: 'active',
      alertOnWaitlist: false
    }
  });
}

export async function updateWatchItem(
  id: string,
  userId: string,
  patch: Partial<{ status: WatchStatus; alertOnWaitlist: boolean }>
) {
  const existing = await prisma.watchItem.findFirst({ where: { id, userId } });
  if (!existing) {
    throw new Error('Watch item not found.');
  }

  return prisma.watchItem.update({
    where: { id },
    data: patch
  });
}

export async function deleteWatchItem(id: string, userId: string) {
  const existing = await prisma.watchItem.findFirst({ where: { id, userId } });
  if (!existing) {
    throw new Error('Watch item not found.');
  }

  return prisma.watchItem.delete({ where: { id } });
}
