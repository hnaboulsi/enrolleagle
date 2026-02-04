import fs from 'fs';
import path from 'path';
import { parseIvcSearchHtml } from '@/src/providers/ivc';

const fixture = fs.readFileSync(path.join(process.cwd(), 'tests/fixtures/ivc.html'), 'utf8');

describe('IVC parser', () => {
  it('parses sections', () => {
    const results = parseIvcSearchHtml(fixture);
    expect(results).toHaveLength(1);
    const item = results[0];
    expect(item.sectionId).toBe('33445');
    expect(item.subject).toBe('BIO');
    expect(item.catalogNumber).toBe('12');
    expect(item.seats).toBe(2);
    expect(item.state).toBe('open');
  });
});
