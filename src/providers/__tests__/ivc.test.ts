import fs from 'fs';
import path from 'path';
import { parseIvcSearchHtml } from '@/src/providers/adapters/ivc';

const fixture = fs.readFileSync(path.join(process.cwd(), 'src/providers/fixtures/ivc.html'), 'utf8');

describe('IVC parser', () => {
  it('parses sections and seats', () => {
    const results = parseIvcSearchHtml(fixture, '2026SP');
    expect(results.length).toBeGreaterThan(0);
    const first = results[0];
    expect(first.externalSectionId).toBeDefined();
  });
});
