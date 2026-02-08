import fs from 'fs';
import path from 'path';
import { parseSmcSearchHtml } from '@/src/providers/adapters/smc';

const fixture = fs.readFileSync(path.join(process.cwd(), 'src/providers/fixtures/smc.html'), 'utf8');

describe('SMC parser', () => {
  it('parses sections and seats', () => {
    const results = parseSmcSearchHtml(fixture, '2026SP');
    expect(results.length).toBeGreaterThan(0);
    const first = results[0];
    expect(first.externalSectionId).toBeDefined();
  });
});
