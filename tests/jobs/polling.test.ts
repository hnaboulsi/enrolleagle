import { pollWatchItems } from '@/src/services/pollingService';

jest.mock('@/src/providers', () => ({
  getProvider: jest.fn(() => ({
    getAvailability: jest.fn().mockResolvedValue({
      seatsAvailable: 2,
      waitlistAvailable: 0,
      state: 'open'
    })
  }))
}));

const updateMock = jest.fn();
const alertCreateMock = jest.fn();
const findManyMock = jest.fn();

jest.mock('@/src/lib/prisma', () => ({
  prisma: {
    watchItem: {
      findMany: (...args: unknown[]) => findManyMock(...args),
      update: (...args: unknown[]) => updateMock(...args)
    },
    alertEvent: {
      create: (...args: unknown[]) => alertCreateMock(...args)
    }
  }
}));

jest.mock('@/src/services/alertService', () => ({
  sendAlertEmail: jest.fn()
}));

jest.mock('@/src/services/providerLogService', () => ({
  logProviderEvent: jest.fn()
}));

describe('pollWatchItems', () => {
  it('creates alert when seats open', async () => {
    findManyMock.mockResolvedValue([
      {
        id: 'watch1',
        sectionId: '12345',
        term: '2026SP',
        detailUrl: 'https://example.com',
        lastKnownSeats: 0,
        lastKnownWaitlist: 0,
        lastKnownState: 'closed',
        lastChangeAt: null,
        failureCount: 0,
        alertOnWaitlist: false,
        status: 'active',
        collegeId: 'college1',
        user: { email: 'student@example.com' },
        college: { name: 'Foothill College', adapterKey: 'foothill' },
        sectionLabel: 'CS-1A-01W',
        subject: 'CS',
        catalogNumber: '1A'
      }
    ]);

    await pollWatchItems();

    expect(updateMock).toHaveBeenCalled();
    expect(alertCreateMock).toHaveBeenCalled();
  });
});
