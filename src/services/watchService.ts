import { prisma } from '@/src/lib/prisma';
import { ProviderState } from '@prisma/client';

export async function ensureWatchLimit(userId: string, max: number) {
  const count = await prisma.watchItem.count({
    where: { userId, status: { not: 'DELETED' } }
  });
  if (count >= max) {
    throw new Error('Watch limit reached.');
  }
}

export async function addWatchItem(input: {
  userId: string;
  collegeId: string;
  term: string;
  subject: string | null;
  catalogNumber: string | null;
  courseTitle: string | null;
  sectionLabel: string | null;
  externalSectionId: string;
  externalUrl: string | null;
  lastKnownSeats: number | null;
  lastKnownWaitlist: number | null;
  lastKnownState: 'open' | 'closed' | 'unknown';
}) {
  const state = input.lastKnownState.toUpperCase() as ProviderState;
  return prisma.watchItem.create({
    data: {
      userId: input.userId,
      collegeId: input.collegeId,
      term: input.term,
      subject: input.subject,
      catalogNumber: input.catalogNumber,
      courseTitle: input.courseTitle,
      sectionLabel: input.sectionLabel,
      externalSectionId: input.externalSectionId,
      externalUrl: input.externalUrl,
      status: 'ACTIVE',
      lastKnownSeats: input.lastKnownSeats,
      lastKnownWaitlist: input.lastKnownWaitlist,
      lastKnownState: state
    }
  });
}
