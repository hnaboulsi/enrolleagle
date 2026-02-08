import { fetchWithTimeout } from '@/src/providers/http';
import { getCached, setCached } from '@/src/providers/cache';
import { htmlToLines } from '@/src/providers/parsers/html';
import { safeNumber, snippet } from '@/src/providers/utils';
import { logProviderError } from '@/src/providers/logger';
import type { AvailabilityProvider, SectionCandidate } from '@/src/providers/types';

// TODO: Verify the current IVC schedule endpoint (prefer official JSON if available).
const BASE_URL = 'https://mysite.socccd.edu/eservices';

export function parseIvcSearchHtml(html: string, term: string): SectionCandidate[] {
  const lines = htmlToLines(html);
  const results: SectionCandidate[] = [];
  let current: SectionCandidate | null = null;

  function commit() {
    if (current?.externalSectionId) {
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
        collegeSlug: 'ivc',
        term,
        subject: match?.[1] ?? null,
        catalogNumber: match?.[2] ?? null,
        courseTitle: null,
        sectionLabel: value,
        externalSectionId: '',
        externalUrl: null,
        seatsAvailable: null,
        waitlistAvailable: null,
        state: 'unknown',
        meetingInfo: null
      };
      continue;
    }

    if (!current) continue;

    if (/^(Class Number|Section#|Section ID|CRN):/i.test(line)) {
      current.externalSectionId = line.split(':').slice(1).join(':').trim();
      continue;
    }

    if (/^Status:/i.test(line)) {
      const status = line.split(':').slice(1).join(':').trim().toLowerCase();
      current.state = status.includes('open') ? 'open' : status.includes('closed') ? 'closed' : 'unknown';
      continue;
    }

    if (/Seats Available/i.test(line)) {
      const match = line.match(/(\d+)\s+of\s+(\d+)/i);
      if (match) current.seatsAvailable = safeNumber(match[1]);
      continue;
    }

    if (/Waitlist/i.test(line)) {
      const match = line.match(/(\d+)\s+of\s+(\d+)/i);
      if (match) current.waitlistAvailable = safeNumber(match[1]);
      continue;
    }

    if (/^Title:/i.test(line)) {
      current.courseTitle = line.split(':').slice(1).join(':').trim();
      continue;
    }
  }

  commit();
  return results;
}

function buildSearchUrl(params: { term?: string; subject?: string; number?: string; q?: string }) {
  const base = BASE_URL.replace(/\/$/, '');
  const searchParams = new URLSearchParams();
  if (params.term) searchParams.set('term', params.term);
  if (params.subject) searchParams.set('subject', params.subject.toUpperCase());
  if (params.number) searchParams.set('number', params.number.toUpperCase());
  if (params.q) searchParams.set('keyword', params.q);
  const query = searchParams.toString();
  return query ? `${base}/ClassSearchForm.aspx?${query}` : `${base}/ClassSearchForm.aspx`;
}

export class IvcProvider implements AvailabilityProvider {
  collegeSlug = 'ivc' as const;

  async listTerms() {
    const cacheKey = `${this.collegeSlug}:terms`;
    const cached = getCached<{ id: string; label: string }[]>(cacheKey);
    if (cached) return cached;
    const terms = [{ id: 'current', label: 'Current Term' }];
    setCached(cacheKey, terms, 6 * 60 * 60 * 1000);
    return terms;
  }

  async searchSections(params: { term: string; q?: string; subject?: string; number?: string; limit?: number }) {
    const cacheKey = `${this.collegeSlug}:search:${params.term}:${params.subject ?? ''}:${params.number ?? ''}:${params.q ?? ''}`;
    const cached = getCached<SectionCandidate[]>(cacheKey);
    if (cached) return cached;

    const url = buildSearchUrl(params);
    const response = await fetchWithTimeout(url);
    if (!response.ok) return [];
    const html = await response.text();
    const results = parseIvcSearchHtml(html, params.term).map((item) => ({
      ...item,
      externalUrl: url
    }));

    const sliced = results.slice(0, params.limit ?? 50);
    setCached(cacheKey, sliced, 60 * 1000);
    return sliced;
  }

  async getAvailability(params: { term: string; externalSectionId: string; externalUrl?: string }) {
    const url = params.externalUrl || buildSearchUrl({ term: params.term });
    const response = await fetchWithTimeout(url);
    if (!response.ok) {
      return { seatsAvailable: null, waitlistAvailable: null, state: 'unknown' };
    }
    const html = await response.text();
    const results = parseIvcSearchHtml(html, params.term);
    const match = results.find((item) => item.externalSectionId === params.externalSectionId);

    if (!match) {
      await logProviderError({
        collegeSlug: this.collegeSlug,
        message: 'IVC parser did not find matching section',
        meta: { url, snippet: snippet(html) }
      });
      return { seatsAvailable: null, waitlistAvailable: null, state: 'unknown' };
    }

    return {
      seatsAvailable: match.seatsAvailable ?? null,
      waitlistAvailable: match.waitlistAvailable ?? null,
      state: match.state ?? 'unknown'
    };
  }
}
