import { env } from '@/src/lib/env';
import { fetchWithTimeout, safeNumber } from '@/src/providers/base';
import { htmlToLines } from '@/src/providers/parsers/html';
import type { AvailabilityInput, AvailabilityProvider, AvailabilityResult, SearchQuery, SectionCandidate } from '@/src/providers/types';

export function parseSmcSearchHtml(html: string): SectionCandidate[] {
  const lines = htmlToLines(html);
  const results: SectionCandidate[] = [];
  let current: SectionCandidate | null = null;

  function commit() {
    if (current?.sectionId) {
      results.push(current);
    }
  }

  for (const line of lines) {
    if (!line) continue;

    if (/^(Course|Subject):/i.test(line)) {
      commit();
      const value = line.split(':').slice(1).join(':').trim();
      const match = value.match(/^([A-Z]{2,})\s*-?\s*([0-9A-Z]+)\b/);
      current = {
        sectionId: '',
        sectionLabel: value,
        subject: match?.[1] ?? null,
        catalogNumber: match?.[2] ?? null,
        title: null,
        term: null,
        seats: null,
        waitlist: null,
        state: 'unknown',
        detailUrl: null
      };
      continue;
    }

    if (!current) continue;

    if (/^(Class Number|Section#|Section ID):/i.test(line)) {
      current.sectionId = line.split(':').slice(1).join(':').trim();
      continue;
    }

    if (/^Status:/i.test(line)) {
      const status = line.split(':').slice(1).join(':').trim().toLowerCase();
      current.state = status.includes('open') ? 'open' : status.includes('closed') ? 'closed' : 'unknown';
      continue;
    }

    if (/Seats Available/i.test(line)) {
      const match = line.match(/(\d+)\s+of\s+(\d+)/i);
      if (match) current.seats = safeNumber(match[1]);
      continue;
    }

    if (/Waitlist/i.test(line)) {
      const match = line.match(/(\d+)\s+of\s+(\d+)/i);
      if (match) current.waitlist = safeNumber(match[1]);
      continue;
    }

    if (/^Title:/i.test(line)) {
      current.title = line.split(':').slice(1).join(':').trim();
      continue;
    }

    if (/^Term:/i.test(line)) {
      current.term = line.split(':').slice(1).join(':').trim();
      continue;
    }
  }

  commit();
  return results;
}

function buildSearchUrl(query: SearchQuery) {
  const base = env.SMC_SEARCH_BASE_URL.replace(/\/$/, '');
  const params = new URLSearchParams();
  if (query.term) params.set('term', query.term);
  if (query.subject) params.set('subject', query.subject.toUpperCase());
  if (query.number) params.set('number', query.number.toUpperCase());
  if (query.keyword) params.set('keyword', query.keyword);
  const queryString = params.toString();
  return queryString ? `${base}?${queryString}` : base;
}

export class SmcProvider implements AvailabilityProvider {
  async searchSections(query: SearchQuery): Promise<SectionCandidate[]> {
    const url = buildSearchUrl(query);
    const response = await fetchWithTimeout(url);
    if (!response.ok) return [];
    const html = await response.text();
    const results = parseSmcSearchHtml(html);
    return results.slice(0, 50).map((item) => ({ ...item, detailUrl: url }));
  }

  async getAvailability(input: AvailabilityInput): Promise<AvailabilityResult> {
    const url = input.detailUrl || buildSearchUrl({ collegeSlug: 'smc' } as SearchQuery);
    const response = await fetchWithTimeout(url);
    if (!response.ok) {
      return { seatsAvailable: null, waitlistAvailable: null, state: 'unknown' };
    }
    const html = await response.text();
    const results = parseSmcSearchHtml(html);
    const match = results.find((item) => item.sectionId === input.sectionId);
    if (!match) {
      return { seatsAvailable: null, waitlistAvailable: null, state: 'unknown' };
    }
    return {
      seatsAvailable: match.seats ?? null,
      waitlistAvailable: match.waitlist ?? null,
      state: match.state ?? 'unknown'
    };
  }
}
