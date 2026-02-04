import { prisma } from '@/src/lib/prisma';
import { env } from '@/src/lib/env';
import { getProvider } from '@/src/providers';
import { sendAlertEmail } from '@/src/services/alertService';
import { logProviderEvent } from '@/src/services/providerLogService';
import type { ProviderState } from '@/src/providers/types';

function computeNextCheck(failureCount: number) {
  if (failureCount <= 0) {
    return new Date(Date.now() + env.WATCH_POLL_INTERVAL_SECONDS * 1000);
  }
  const backoff = Math.min(env.WATCH_BACKOFF_SECONDS * failureCount, 60 * 30);
  return new Date(Date.now() + backoff * 1000);
}

function wasOpen(seats: number | null, state: ProviderState | null) {
  return (seats ?? 0) > 0 || state === 'open';
}

export async function pollWatchItems() {
  const now = new Date();
  const dueItems = await prisma.watchItem.findMany({
    where: {
      status: 'active',
      OR: [{ nextCheckAt: null }, { nextCheckAt: { lte: now } }]
    },
    include: {
      user: true,
      college: true
    }
  });

  for (const item of dueItems) {
    const provider = getProvider(item.college.adapterKey);
    try {
      const result = await provider.getAvailability({
        sectionId: item.sectionId,
        term: item.term,
        detailUrl: item.detailUrl ?? undefined
      });

      const previousOpen = wasOpen(item.lastKnownSeats, item.lastKnownState);
      const currentOpen = wasOpen(result.seatsAvailable, result.state);
      const seatOpened = !previousOpen && currentOpen;
      const waitlistChanged =
        item.alertOnWaitlist &&
        result.waitlistAvailable !== null &&
        result.waitlistAvailable !== item.lastKnownWaitlist;

      const stateChanged = result.state !== item.lastKnownState;
      const seatsChanged = result.seatsAvailable !== item.lastKnownSeats;
      const waitlistDelta = result.waitlistAvailable !== item.lastKnownWaitlist;

      const shouldMarkChange = stateChanged || seatsChanged || waitlistDelta;

      await prisma.watchItem.update({
        where: { id: item.id },
        data: {
          lastCheckedAt: now,
          lastKnownSeats: result.seatsAvailable,
          lastKnownWaitlist: result.waitlistAvailable,
          lastKnownState: result.state,
          lastChangeAt: shouldMarkChange ? now : item.lastChangeAt,
          status: 'active',
          failureCount: 0,
          nextCheckAt: computeNextCheck(0)
        }
      });

      if (seatOpened) {
        await prisma.alertEvent.create({
          data: {
            watchItemId: item.id,
            type: 'seats_open',
            payload: {
              seatsAvailable: result.seatsAvailable,
              waitlistAvailable: result.waitlistAvailable,
              state: result.state
            },
            sentAt: new Date()
          }
        });
        await sendAlertEmail({
          to: item.user.email,
          alertType: 'seats_open',
          collegeName: item.college.name,
          sectionLabel: item.sectionLabel,
          subject: item.subject,
          catalogNumber: item.catalogNumber,
          seatsAvailable: result.seatsAvailable,
          waitlistAvailable: result.waitlistAvailable,
          state: result.state
        });
      }

      if (!seatOpened && waitlistChanged) {
        await prisma.alertEvent.create({
          data: {
            watchItemId: item.id,
            type: 'waitlist_change',
            payload: {
              waitlistAvailable: result.waitlistAvailable,
              state: result.state
            },
            sentAt: new Date()
          }
        });
        await sendAlertEmail({
          to: item.user.email,
          alertType: 'waitlist_change',
          collegeName: item.college.name,
          sectionLabel: item.sectionLabel,
          subject: item.subject,
          catalogNumber: item.catalogNumber,
          seatsAvailable: result.seatsAvailable,
          waitlistAvailable: result.waitlistAvailable,
          state: result.state
        });
      }
    } catch (error) {
      const failureCount = item.failureCount + 1;
      await prisma.watchItem.update({
        where: { id: item.id },
        data: {
          failureCount,
          status: failureCount >= 3 ? 'error' : 'active',
          nextCheckAt: computeNextCheck(failureCount)
        }
      });
      await logProviderEvent({
        collegeId: item.collegeId,
        watchItemId: item.id,
        level: 'error',
        message: 'Provider polling failed',
        meta: { error: (error as Error).message }
      });
    }
  }
}
