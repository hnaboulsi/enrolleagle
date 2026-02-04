import fs from 'fs';
import path from 'path';
import { parseSmcSearchHtml } from '@/src/providers/smc';

const fixture = fs.readFileSync(path.join(process.cwd(), 'tests/fixtures/smc.html'), 'utf8');

describe('SMC parser', () => {
  it('parses sections', () => {
    const results = parseSmcSearchHtml(fixture);
    expect(results).toHaveLength(1);
    const item = results[0];
    expect(item.sectionId).toBe('78901');
    expect(item.subject).toBe('MATH');
    expect(item.catalogNumber).toBe('2');
    expect(item.seats).toBe(0);
    expect(item.state).toBe('closed');
  });
});
