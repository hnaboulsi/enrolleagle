import { fetchWithTimeout } from '@/src/providers/http';
import { getCached, setCached } from '@/src/providers/cache';
import { htmlToLines } from '@/src/providers/parsers/html';
import { safeNumber, snippet } from '@/src/providers/utils';
import { logProviderError } from '@/src/providers/logger';
import type { AvailabilityProvider, AvailabilityResult, SectionCandidate } from '@/src/providers/types';

// TODO: Verify the current DVC schedule endpoint (prefer official JSON if available).
const BASE_URL = 'https://webapps.4cd.edu/apps/courseschedulesearch';

function parseCourseLine(value: string) {
  const match = value.match(/^([A-Z]{2,})[-\s]+([0-9A-Z]+)\b/);
  if (!match) return { subject: null, catalogNumber: null };
  return { subject: match[1], catalogNumber: match[2] };
}

export function parseDvcSearchResults(html: string, term: string): SectionCandidate[] {
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

    if (line.startsWith('Course:')) {
      commit();
      const value = line.replace('Course:', '').trim();
      const parsed = parseCourseLine(value);
      current = {
        collegeSlug: 'dvc',
        term,
        subject: parsed.subject,
        catalogNumber: parsed.catalogNumber,
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

    if (line.startsWith('Section#:')) {
      current.externalSectionId = line.replace('Section#:', '').trim();
      continue;
    }

    if (line.startsWith('Status:')) {
      const status = line.replace('Status:', '').trim().toLowerCase();
      current.state = status.includes('open') ? 'open' : status.includes('closed') ? 'closed' : 'unknown';
      continue;
    }

    if (line.startsWith('Seats Available:')) {
      const match = line.match(/(\d+)\s+of\s+(\d+)/i);
      if (match) current.seatsAvailable = safeNumber(match[1]);
      continue;
    }

    if (line.startsWith('Waitlist Seats Available:')) {
      const match = line.match(/(\d+)\s+of\s+(\d+)/i);
      if (match) current.waitlistAvailable = safeNumber(match[1]);
      continue;
    }

    if (line.startsWith('Course Title:')) {
      current.courseTitle = line.replace('Course Title:', '').trim();
      continue;
    }
  }

  commit();
  return results;
}

function buildSearchUrl(params: { term?: string; subject?: string; number?: string; q?: string }) {
  const url = new URL(`${BASE_URL}/search-course.aspx`);
  url.searchParams.set('search', 'dvc');
  url.searchParams.set('loc', 'dvc');
  if (params.term) url.searchParams.set('trm', params.term);
  if (params.subject) url.searchParams.set('subj', params.subject.toUpperCase());
  if (params.number) url.searchParams.set('crse', params.number.toUpperCase());
  if (params.q) url.searchParams.set('title', params.q);
  return url.toString();
}

export class DvcProvider implements AvailabilityProvider {
  collegeSlug = 'dvc' as const;

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
    const results = parseDvcSearchResults(html, params.term).map((item) => ({
      ...item,
      externalUrl: url
    }));

    const filtered = results.filter((item) => {
      if (params.subject && item.subject?.toUpperCase() !== params.subject.toUpperCase()) return false;
      if (params.number && item.catalogNumber?.toUpperCase() !== params.number.toUpperCase()) return false;
      return true;
    });

    const sliced = filtered.slice(0, params.limit ?? 50);
    setCached(cacheKey, sliced, 60 * 1000);
    return sliced;
  }

  async getAvailability(params: { term: string; externalSectionId: string; externalUrl?: string }): Promise<AvailabilityResult> {
    const url = params.externalUrl || buildSearchUrl({ term: params.term });
    const response = await fetchWithTimeout(url);
    if (!response.ok) {
      return { seatsAvailable: null, waitlistAvailable: null, state: 'unknown' };
    }
    const html = await response.text();
    const results = parseDvcSearchResults(html, params.term);
    const match = results.find((item) => item.externalSectionId === params.externalSectionId);

    if (!match) {
      await logProviderError({
        collegeSlug: this.collegeSlug,
        message: 'DVC parser did not find matching section',
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
