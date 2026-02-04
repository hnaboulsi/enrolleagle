import fs from 'fs';
import path from 'path';
import { parseDvcSearchResults } from '@/src/providers/dvc';

const fixture = fs.readFileSync(path.join(process.cwd(), 'tests/fixtures/dvc.html'), 'utf8');

describe('DVC parser', () => {
  it('parses section list', () => {
    const results = parseDvcSearchResults(fixture);
    expect(results).toHaveLength(1);
    const item = results[0];
    expect(item.sectionId).toBe('45678');
    expect(item.subject).toBe('ENGL');
    expect(item.catalogNumber).toBe('101');
    expect(item.seats).toBe(3);
    expect(item.state).toBe('open');
  });
});
