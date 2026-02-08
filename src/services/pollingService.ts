import { prisma } from '@/src/lib/prisma';
import { env } from '@/src/lib/env';
import { getProvider } from '@/src/providers';
import { sendAlertEmail } from '@/src/services/alertService';
import { logProviderEvent } from '@/src/services/providerLogService';
import type { Prisma, ProviderState } from '@prisma/client';
import type { PgBoss } from 'pg-boss';

const DEDUP_MS = env.ALERT_DEDUP_HOURS * 60 * 60 * 1000;

function normalizeState(state: 'open' | 'closed' | 'unknown'): ProviderState {
  return state.toUpperCase() as ProviderState;
}

function wasOpen(seats: number | null, state: ProviderState | null) {
  return (seats ?? 0) > 0 || state === 'OPEN';
}

function computeIntervalSeconds(consecutiveFailures: number) {
  const multiplier = Math.min(4, Math.pow(2, consecutiveFailures));
  return env.POLL_INTERVAL_SECONDS * multiplier;
}

function isDue(item: { lastCheckedAt: Date | null; consecutiveFailures: number }) {
  if (!item.lastCheckedAt) return true;
  const intervalSeconds = computeIntervalSeconds(item.consecutiveFailures);
  return Date.now() - item.lastCheckedAt.getTime() >= intervalSeconds * 1000;
}

async function sendOrRetryAlert(input: {
  watchItemId: string;
  type: 'SEATS_OPENED' | 'WAITLIST_CHANGED' | 'STATE_CHANGED';
  payload: Prisma.InputJsonValue;
  email: {
    to: string;
    collegeName: string;
    term: string;
    subject: string | null;
    catalogNumber: string | null;
    sectionLabel: string | null;
    seatsAvailable: number | null;
  };
}) {
  const existing = await prisma.alertEvent.findFirst({
    where: { watchItemId: input.watchItemId, type: input.type, sentAt: null },
    orderBy: { createdAt: 'desc' }
  });

  const alert =
    existing ??
    (await prisma.alertEvent.create({
      data: {
        watchItemId: input.watchItemId,
        type: input.type,
        payload: input.payload,
        sentAt: null
      }
    }));

  await sendAlertEmail({
    to: input.email.to,
    collegeName: input.email.collegeName,
    term: input.email.term,
    subject: input.email.subject,
    catalogNumber: input.email.catalogNumber,
    sectionLabel: input.email.sectionLabel,
    seatsAvailable: input.email.seatsAvailable,
    watchItemId: input.watchItemId,
    alertType: input.type
  });

  await prisma.alertEvent.update({
    where: { id: alert.id },
    data: { sentAt: new Date() }
  });
}

export async function enqueueDueWatchItems(boss: PgBoss) {
  const items = await prisma.watchItem.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, collegeId: true, lastCheckedAt: true, consecutiveFailures: true }
  });

  const due = items.filter((item) => isDue(item));
  for (const item of due) {
    await boss.send(
      'poll-watch-item',
      { watchItemId: item.id },
      {
        group: { id: item.collegeId },
        retryLimit: 3,
        retryDelay: 30,
        retryBackoff: true
      }
    );
  }

  return { enqueued: due.length };
}

export async function pollWatchItem(watchItemId: string) {
  const item = await prisma.watchItem.findUnique({
    where: { id: watchItemId },
    include: { user: true, college: true }
  });

  if (!item || item.status !== 'ACTIVE') {
    return;
  }

  const provider = getProvider(item.college.adapterKey);
  const now = new Date();

  const pendingAlert = await prisma.alertEvent.findFirst({
    where: { watchItemId: item.id, sentAt: null },
    orderBy: { createdAt: 'desc' }
  });

  if (pendingAlert) {
    try {
      const payload = pendingAlert.payload as Record<string, any>;
      await sendAlertEmail({
        to: item.user.email,
        collegeName: item.college.name,
        term: item.term,
        subject: item.subject,
        catalogNumber: item.catalogNumber,
        sectionLabel: item.sectionLabel,
        seatsAvailable: payload?.seatsAvailable ?? item.lastKnownSeats,
        watchItemId: item.id,
        alertType: pendingAlert.type
      });

      await prisma.alertEvent.update({
        where: { id: pendingAlert.id },
        data: { sentAt: now }
      });
      return;
    } catch (error) {
      await logProviderEvent({
        collegeId: item.collegeId,
        watchItemId: item.id,
        level: 'ERROR',
        message: 'Alert delivery failed',
        meta: { error: (error as Error).message }
      });
      throw error;
    }
  }

  let result;
  try {
    result = await provider.getAvailability({
      term: item.term,
      externalSectionId: item.externalSectionId,
      externalUrl: item.externalUrl ?? undefined
    });
  } catch (error) {
    await prisma.watchItem.update({
      where: { id: item.id },
      data: {
        lastCheckedAt: now,
        consecutiveFailures: item.consecutiveFailures + 1,
        lastErrorAt: now
      }
    });

    await logProviderEvent({
      collegeId: item.collegeId,
      watchItemId: item.id,
      level: 'ERROR',
      message: 'Provider polling failed',
      meta: { error: (error as Error).message }
    });

    throw error;
  }

  const previousOpen = wasOpen(item.lastKnownSeats, item.lastKnownState);
  const currentOpen = (result.seatsAvailable ?? 0) > 0 || result.state === 'open';
  const seatOpened = !previousOpen && currentOpen;
  const stateChangedToOpen = item.lastKnownState !== normalizeState(result.state) && result.state === 'open';
  const waitlistChanged =
    env.ALERT_ON_WAITLIST &&
    result.waitlistAvailable !== null &&
    result.waitlistAvailable !== item.lastKnownWaitlist;

  await prisma.watchItem.update({
    where: { id: item.id },
    data: {
      lastCheckedAt: now,
      lastKnownSeats: result.seatsAvailable,
      lastKnownWaitlist: result.waitlistAvailable ?? null,
      lastKnownState: normalizeState(result.state),
      consecutiveFailures: 0,
      lastErrorAt: null
    }
  });

  await logProviderEvent({
    collegeId: item.collegeId,
    watchItemId: item.id,
    level: 'INFO',
    message: 'Availability check succeeded',
    meta: {
      seatsAvailable: result.seatsAvailable,
      waitlistAvailable: result.waitlistAvailable,
      state: result.state
    }
  });

  try {
    if (seatOpened) {
      const lastAlert = await prisma.alertEvent.findFirst({
        where: { watchItemId: item.id, type: 'SEATS_OPENED' },
        orderBy: { createdAt: 'desc' }
      });
      const shouldSend =
        !lastAlert ||
        lastAlert.sentAt === null ||
        now.getTime() - lastAlert.createdAt.getTime() > DEDUP_MS ||
        item.lastKnownState === 'CLOSED';

      if (shouldSend) {
        await sendOrRetryAlert({
          watchItemId: item.id,
          type: 'SEATS_OPENED',
          payload: {
            seatsAvailable: result.seatsAvailable,
            waitlistAvailable: result.waitlistAvailable,
            state: result.state
          },
          email: {
            to: item.user.email,
            collegeName: item.college.name,
            term: item.term,
            subject: item.subject,
            catalogNumber: item.catalogNumber,
            sectionLabel: item.sectionLabel,
            seatsAvailable: result.seatsAvailable
          }
        });
      }
    }

    if (stateChangedToOpen && !seatOpened) {
      await sendOrRetryAlert({
        watchItemId: item.id,
        type: 'STATE_CHANGED',
        payload: { state: result.state },
        email: {
          to: item.user.email,
          collegeName: item.college.name,
          term: item.term,
          subject: item.subject,
          catalogNumber: item.catalogNumber,
          sectionLabel: item.sectionLabel,
          seatsAvailable: result.seatsAvailable
        }
      });
    }

    if (!seatOpened && waitlistChanged) {
      await sendOrRetryAlert({
        watchItemId: item.id,
        type: 'WAITLIST_CHANGED',
        payload: { waitlistAvailable: result.waitlistAvailable, state: result.state },
        email: {
          to: item.user.email,
          collegeName: item.college.name,
          term: item.term,
          subject: item.subject,
          catalogNumber: item.catalogNumber,
          sectionLabel: item.sectionLabel,
          seatsAvailable: result.seatsAvailable
        }
      });
    }
  } catch (error) {
    await logProviderEvent({
      collegeId: item.collegeId,
      watchItemId: item.id,
      level: 'ERROR',
      message: 'Alert delivery failed',
      meta: { error: (error as Error).message }
    });
    throw error;
  }
}
