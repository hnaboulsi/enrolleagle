import fs from 'fs';
import path from 'path';
import { DeAnzaProvider } from '@/src/providers/adapters/deanza';
import { FoothillProvider } from '@/src/providers/adapters/foothill';
import { DvcProvider } from '@/src/providers/adapters/dvc';
import { SmcProvider } from '@/src/providers/adapters/smc';
import { IvcProvider } from '@/src/providers/adapters/ivc';
import { fetchWithTimeout } from '@/src/providers/http';

jest.mock('@/src/providers/http', () => ({
  fetchWithTimeout: jest.fn()
}));

const mockFetch = fetchWithTimeout as jest.Mock;

const fhdaFixture = fs.readFileSync(path.join(process.cwd(), 'src/providers/fixtures/fhda.html'), 'utf8');
const dvcFixture = fs.readFileSync(path.join(process.cwd(), 'src/providers/fixtures/dvc.html'), 'utf8');
const smcFixture = fs.readFileSync(path.join(process.cwd(), 'src/providers/fixtures/smc.html'), 'utf8');
const ivcFixture = fs.readFileSync(path.join(process.cwd(), 'src/providers/fixtures/ivc.html'), 'utf8');

async function mockHtml(html: string) {
  mockFetch.mockResolvedValue({
    ok: true,
    text: async () => html
  });
}

describe('adapter getAvailability', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('returns seats for De Anza', async () => {
    await mockHtml(fhdaFixture);
    const provider = new DeAnzaProvider();
    const result = await provider.getAvailability({ term: '2026SP', externalSectionId: '12345', externalUrl: 'https://example.com' });
    expect(result.seatsAvailable).toBe(10);
    expect(result.state).toBe('open');
  });

  it('returns seats for Foothill', async () => {
    await mockHtml(fhdaFixture);
    const provider = new FoothillProvider();
    const result = await provider.getAvailability({ term: '2026SP', externalSectionId: '12345', externalUrl: 'https://example.com' });
    expect(result.seatsAvailable).toBe(10);
    expect(result.state).toBe('open');
  });

  it('returns seats for DVC', async () => {
    await mockHtml(dvcFixture);
    const provider = new DvcProvider();
    const result = await provider.getAvailability({ term: '2026SP', externalSectionId: '45678', externalUrl: 'https://example.com' });
    expect(result.seatsAvailable).toBe(3);
    expect(result.state).toBe('open');
  });

  it('returns seats for SMC', async () => {
    await mockHtml(smcFixture);
    const provider = new SmcProvider();
    const result = await provider.getAvailability({ term: '2026SP', externalSectionId: '78901', externalUrl: 'https://example.com' });
    expect(result.seatsAvailable).toBe(0);
    expect(result.state).toBe('closed');
  });

  it('returns seats for IVC', async () => {
    await mockHtml(ivcFixture);
    const provider = new IvcProvider();
    const result = await provider.getAvailability({ term: '2026SP', externalSectionId: '33445', externalUrl: 'https://example.com' });
    expect(result.seatsAvailable).toBe(2);
    expect(result.state).toBe('open');
  });
});
