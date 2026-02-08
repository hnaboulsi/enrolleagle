import fs from 'fs';
import path from 'path';
import { parseFhdaScheduleHtml } from '@/src/providers/adapters/fhdaShared';

const fixture = fs.readFileSync(path.join(process.cwd(), 'src/providers/fixtures/fhda.html'), 'utf8');

describe('FHDA parser', () => {
  it('parses sections and seat counts', () => {
    const results = parseFhdaScheduleHtml(fixture, {
      collegeSlug: 'deanza',
      term: '2026SP',
      scheduleUrl: 'https://example.com'
    });

    expect(results.length).toBeGreaterThan(1);
    const first = results[0];
    expect(first.externalSectionId).toBe('12345');
    expect(first.seatsAvailable).toBe(10);
    expect(first.waitlistAvailable).toBe(2);
    expect(first.state).toBe('open');
  });
});
