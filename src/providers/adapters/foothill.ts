import { fetchWithTimeout } from '@/src/providers/http';
import { getCached, setCached } from '@/src/providers/cache';
import { parseFhdaScheduleHtml } from '@/src/providers/adapters/fhdaShared';
import { foothillSubjectMap } from '@/src/providers/adapters/foothillSubjectMap';
import { logProviderError } from '@/src/providers/logger';
import { snippet } from '@/src/providers/utils';
import type { AvailabilityProvider, AvailabilityResult, SectionCandidate } from '@/src/providers/types';

const BASE_URL = 'https://www.foothill.edu';

function resolveDept(subject?: string | null) {
  if (!subject) return null;
  const key = subject.toUpperCase();
  return foothillSubjectMap[key] ?? key.toLowerCase();
}

function buildScheduleUrl(subject?: string | null) {
  const dept = resolveDept(subject);
  if (!dept) return null;
  return `${BASE_URL}/${dept}/schedule.html`;
}

export class FoothillProvider implements AvailabilityProvider {
  collegeSlug = 'foothill' as const;

  async listTerms() {
    const cacheKey = `${this.collegeSlug}:terms`;
    const cached = getCached<{ id: string; label: string }[]>(cacheKey);
    if (cached) return cached;

    // Try to fetch actual term name from a department page
    try {
      const response = await fetchWithTimeout(`${BASE_URL}/math/schedule.html`);
      if (response.ok) {
        const html = await response.text();
        // Look for pattern like "2026 Spring Schedule"
        const match = html.match(/(\d{4})\s+(Spring|Summer|Fall|Winter)\s+Schedule/i);
        if (match) {
          const year = match[1];
          const quarter = match[2];
          const label = `${quarter} ${year}`;
          const terms = [{ id: 'current', label }];
          setCached(cacheKey, terms, 6 * 60 * 60 * 1000);
          return terms;
        }
      }
    } catch (error) {
      // Fall back to generic label if fetch fails
    }

    const terms = [{ id: 'current', label: 'Current Term' }];
    setCached(cacheKey, terms, 6 * 60 * 60 * 1000);
    return terms;
  }

  async searchSections(params: { term: string; q?: string; subject?: string; number?: string; limit?: number; }) {
    const cacheKey = `${this.collegeSlug}:search:${params.term}:${params.subject ?? ''}:${params.number ?? ''}:${params.q ?? ''}`;
    const cached = getCached<SectionCandidate[]>(cacheKey);
    if (cached) return cached;

    const scheduleUrl = buildScheduleUrl(params.subject);
    if (!scheduleUrl) return [];

    const response = await fetchWithTimeout(scheduleUrl);
    if (!response.ok) return [];
    const html = await response.text();
    const sections = parseFhdaScheduleHtml(html, {
      collegeSlug: this.collegeSlug,
      term: params.term,
      scheduleUrl
    });

    const filtered = sections.filter((section) => {
      if (params.subject && section.subject?.toUpperCase() !== params.subject.toUpperCase()) return false;
      if (params.number && section.catalogNumber?.toUpperCase() !== params.number.toUpperCase()) return false;
      if (params.q) {
        const needle = params.q.toLowerCase();
        return (
          section.sectionLabel?.toLowerCase().includes(needle) ||
          section.courseTitle?.toLowerCase().includes(needle) ||
          section.subject?.toLowerCase().includes(needle)
        );
      }
      return true;
    });

    const results = filtered.slice(0, params.limit ?? 50);
    setCached(cacheKey, results, 60 * 1000);
    return results;
  }

  async getAvailability(params: { term: string; externalSectionId: string; externalUrl?: string }): Promise<AvailabilityResult> {
    const scheduleUrl = params.externalUrl || buildScheduleUrl(null);
    if (!scheduleUrl) {
      return { seatsAvailable: null, waitlistAvailable: null, state: 'unknown' };
    }

    const response = await fetchWithTimeout(scheduleUrl);
    if (!response.ok) {
      return { seatsAvailable: null, waitlistAvailable: null, state: 'unknown' };
    }

    const html = await response.text();
    const sections = parseFhdaScheduleHtml(html, {
      collegeSlug: this.collegeSlug,
      term: params.term,
      scheduleUrl
    });
    const match = sections.find((section) => section.externalSectionId === params.externalSectionId);

    if (!match) {
      await logProviderError({
        collegeSlug: this.collegeSlug,
        message: 'FHDA parser did not find matching section',
        meta: { url: scheduleUrl, snippet: snippet(html) }
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
