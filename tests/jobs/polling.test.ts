import { pollWatchItem } from '@/src/services/pollingService';
import { env } from '@/src/lib/env';

jest.mock('@/src/providers', () => ({
  getProvider: jest.fn(() => ({
    getAvailability: jest.fn().mockResolvedValue({
      seatsAvailable: 1,
      waitlistAvailable: 0,
      state: 'open'
    })
  }))
}));

const updateMock = jest.fn();
const alertCreateMock = jest.fn();
const alertFindFirstMock = jest.fn();
const alertUpdateMock = jest.fn();
const findUniqueMock = jest.fn();
const providerLogMock = jest.fn();

jest.mock('@/src/lib/prisma', () => ({
  prisma: {
    watchItem: {
      findUnique: (...args: unknown[]) => findUniqueMock(...args),
      update: (...args: unknown[]) => updateMock(...args)
    },
    alertEvent: {
      findFirst: (...args: unknown[]) => alertFindFirstMock(...args),
      create: (...args: unknown[]) => alertCreateMock(...args),
      update: (...args: unknown[]) => alertUpdateMock(...args)
    },
    providerLog: {
      create: (...args: unknown[]) => providerLogMock(...args)
    }
  }
}));

const sendAlertEmailMock = jest.fn();

jest.mock('@/src/services/alertService', () => ({
  sendAlertEmail: (...args: unknown[]) => sendAlertEmailMock(...args)
}));

describe('pollWatchItem', () => {
  beforeEach(() => {
    updateMock.mockReset();
    alertCreateMock.mockReset();
    alertFindFirstMock.mockReset();
    alertUpdateMock.mockReset();
    findUniqueMock.mockReset();
    providerLogMock.mockReset();
    sendAlertEmailMock.mockReset();
  });

  it('creates alert when seats open', async () => {
    alertFindFirstMock.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    findUniqueMock.mockResolvedValue({
      id: 'watch1',
      userId: 'user1',
      collegeId: 'college1',
      term: '2026SP',
      subject: 'CS',
      catalogNumber: '1A',
      courseTitle: 'Intro to Programming',
      sectionLabel: 'CS-1A-01W',
      externalSectionId: '12345',
      externalUrl: 'https://example.com',
      status: 'ACTIVE',
      lastCheckedAt: null,
      lastKnownSeats: 0,
      lastKnownWaitlist: 0,
      lastKnownState: 'CLOSED',
      consecutiveFailures: 0,
      lastErrorAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      user: { email: 'student@example.com' },
      college: { name: 'Foothill College', adapterKey: 'foothill' }
    });

    await pollWatchItem('watch1');

    expect(updateMock).toHaveBeenCalled();
    expect(alertCreateMock).toHaveBeenCalled();
    expect(sendAlertEmailMock).toHaveBeenCalledTimes(1);
  });

  it('dedupes seat-open alerts within window', async () => {
    const recentAlert = {
      id: 'alert1',
      createdAt: new Date(Date.now() - (env.ALERT_DEDUP_HOURS - 1) * 60 * 60 * 1000),
      sentAt: new Date()
    };
    alertFindFirstMock.mockResolvedValueOnce(null).mockResolvedValueOnce(recentAlert);

    findUniqueMock.mockResolvedValue({
      id: 'watch1',
      userId: 'user1',
      collegeId: 'college1',
      term: '2026SP',
      subject: 'CS',
      catalogNumber: '1A',
      courseTitle: 'Intro to Programming',
      sectionLabel: 'CS-1A-01W',
      externalSectionId: '12345',
      externalUrl: 'https://example.com',
      status: 'ACTIVE',
      lastCheckedAt: null,
      lastKnownSeats: 0,
      lastKnownWaitlist: 0,
      lastKnownState: 'UNKNOWN',
      consecutiveFailures: 0,
      lastErrorAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      user: { email: 'student@example.com' },
      college: { name: 'Foothill College', adapterKey: 'foothill' }
    });

    await pollWatchItem('watch1');

    expect(alertCreateMock).not.toHaveBeenCalled();
    expect(sendAlertEmailMock).not.toHaveBeenCalled();
  });
});
