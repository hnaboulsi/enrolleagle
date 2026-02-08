import fs from 'fs';
import path from 'path';
import { parseDvcSearchResults } from '@/src/providers/adapters/dvc';

const fixture = fs.readFileSync(path.join(process.cwd(), 'src/providers/fixtures/dvc.html'), 'utf8');

describe('DVC parser', () => {
  it('parses sections and seats', () => {
    const results = parseDvcSearchResults(fixture, '2026SP');
    expect(results.length).toBeGreaterThan(0);
    const first = results[0];
    expect(first.externalSectionId).toBeDefined();
    expect(first.state).toBeDefined();
  });
});
