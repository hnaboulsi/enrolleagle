import { env } from '@/src/lib/env';
import { fetchWithTimeout, safeNumber } from '@/src/providers/base';
import { htmlToLines } from '@/src/providers/parsers/html';
import type { AvailabilityInput, AvailabilityProvider, AvailabilityResult, SearchQuery, SectionCandidate } from '@/src/providers/types';

function parseCourseLine(value: string) {
  const match = value.match(/^([A-Z]{2,})[-\s]+([0-9A-Z]+)\b/);
  if (!match) return { subject: null, catalogNumber: null };
  return { subject: match[1], catalogNumber: match[2] };
}

export function parseDvcSearchResults(html: string) {
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

    if (line.startsWith('Course:')) {
      commit();
      const value = line.replace('Course:', '').trim();
      const parsed = parseCourseLine(value);
      current = {
        sectionId: '',
        sectionLabel: value,
        subject: parsed.subject,
        catalogNumber: parsed.catalogNumber,
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

    if (line.startsWith('Section#:')) {
      current.sectionId = line.replace('Section#:', '').trim();
      continue;
    }

    if (line.startsWith('Status:')) {
      const status = line.replace('Status:', '').trim().toLowerCase();
      current.state = status.includes('open') ? 'open' : status.includes('closed') ? 'closed' : 'unknown';
      continue;
    }

    if (line.startsWith('Seats Available:')) {
      const match = line.match(/(\d+)\s+of\s+(\d+)/i);
      if (match) current.seats = safeNumber(match[1]);
      continue;
    }

    if (line.startsWith('Waitlist Seats Available:')) {
      const match = line.match(/(\d+)\s+of\s+(\d+)/i);
      if (match) current.waitlist = safeNumber(match[1]);
      continue;
    }

    if (line.startsWith('Course Title:')) {
      current.title = line.replace('Course Title:', '').trim();
      continue;
    }

    if (line.startsWith('Term:')) {
      current.term = line.replace('Term:', '').trim();
      continue;
    }
  }

  commit();
  return results;
}

function buildSearchUrl(query: SearchQuery) {
  const params = new URLSearchParams();
  params.set('search', 'dvc');
  if (query.term) params.set('trm', query.term);
  if (query.subject) params.set('subj', query.subject.toUpperCase());
  if (query.number) params.set('crse', query.number.toUpperCase());
  if (query.keyword) params.set('title', query.keyword);
  params.set('loc', 'dvc');
  return `${env.DVC_SEARCH_BASE_URL}/search-course.aspx?${params.toString()}`;
}

export class DvcProvider implements AvailabilityProvider {
  async searchSections(query: SearchQuery): Promise<SectionCandidate[]> {
    const url = buildSearchUrl(query);
    const response = await fetchWithTimeout(url);
    if (!response.ok) return [];
    const html = await response.text();
    const results = parseDvcSearchResults(html);
    return results
      .filter((item) => {
        if (query.subject && item.subject?.toUpperCase() !== query.subject.toUpperCase()) return false;
        if (query.number && item.catalogNumber?.toUpperCase() !== query.number.toUpperCase()) return false;
        return true;
      })
      .slice(0, 50)
      .map((item) => ({ ...item, detailUrl: url }));
  }

  async getAvailability(input: AvailabilityInput): Promise<AvailabilityResult> {
    const url = input.detailUrl || buildSearchUrl({ collegeSlug: 'dvc' } as SearchQuery);
    const response = await fetchWithTimeout(url);
    if (!response.ok) {
      return { seatsAvailable: null, waitlistAvailable: null, state: 'unknown' };
    }
    const html = await response.text();
    const results = parseDvcSearchResults(html);
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
