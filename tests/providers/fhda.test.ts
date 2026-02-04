import fs from 'fs';
import path from 'path';
import { parseFhdaScheduleHtml } from '@/src/providers/fhda/fhdaShared';

const fixture = fs.readFileSync(path.join(process.cwd(), 'tests/fixtures/fhda.html'), 'utf8');

describe('FHDA parser', () => {
  it('parses sections and seat counts', () => {
    const results = parseFhdaScheduleHtml(fixture);
    expect(results.length).toBeGreaterThan(1);
    const first = results[0];
    expect(first.sectionId).toBe('12345');
    expect(first.seats).toBe(10);
    expect(first.waitlist).toBe(2);
    expect(first.state).toBe('open');
  });
});
