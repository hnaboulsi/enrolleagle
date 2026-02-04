import { env } from '@/src/lib/env';
import { fetchWithTimeout } from '@/src/providers/base';
import { parseFhdaScheduleHtml } from '@/src/providers/fhda/fhdaShared';
import { deanzaSubjectMap } from '@/src/providers/fhda/deanzaSubjectMap';
import type { AvailabilityInput, AvailabilityProvider, AvailabilityResult, SearchQuery, SectionCandidate } from '@/src/providers/types';

function resolveDept(subject?: string | null) {
  if (!subject) return null;
  const key = subject.toUpperCase();
  return deanzaSubjectMap[key] ?? key.toLowerCase();
}

function buildScheduleUrl(subject?: string | null) {
  const dept = resolveDept(subject);
  if (!dept) return null;
  return `${env.DEANZA_BASE_URL}/${dept}/schedule.html`;
}

export class DeAnzaProvider implements AvailabilityProvider {
  async searchSections(query: SearchQuery): Promise<SectionCandidate[]> {
    const subject = query.subject?.toUpperCase() ?? null;
    const scheduleUrl = buildScheduleUrl(subject);
    if (!scheduleUrl) return [];

    const response = await fetchWithTimeout(scheduleUrl);
    if (!response.ok) return [];
    const html = await response.text();
    const sections = parseFhdaScheduleHtml(html);

    return sections
      .filter((section) => {
        if (subject && section.subject?.toUpperCase() !== subject) return false;
        if (query.number && section.catalogNumber?.toUpperCase() !== query.number.toUpperCase()) return false;
        if (query.keyword) {
          const keyword = query.keyword.toLowerCase();
          return section.sectionLabel?.toLowerCase().includes(keyword) ?? false;
        }
        return true;
      })
      .slice(0, 50)
      .map((section) => ({
        sectionId: section.crn ?? section.sectionId,
        sectionLabel: section.sectionLabel,
        subject: section.subject,
        catalogNumber: section.catalogNumber,
        title: section.title ?? null,
        term: query.term ?? null,
        seats: section.seats ?? null,
        waitlist: section.waitlist ?? null,
        state: section.state ?? 'unknown',
        detailUrl: scheduleUrl
      }));
  }

  async getAvailability(input: AvailabilityInput): Promise<AvailabilityResult> {
    const scheduleUrl = input.detailUrl ?? buildScheduleUrl(null);
    if (!scheduleUrl) {
      return { seatsAvailable: null, waitlistAvailable: null, state: 'unknown' };
    }

    const response = await fetchWithTimeout(scheduleUrl);
    if (!response.ok) {
      return { seatsAvailable: null, waitlistAvailable: null, state: 'unknown' };
    }

    const html = await response.text();
    const sections = parseFhdaScheduleHtml(html);
    const match = sections.find((section) => section.crn === input.sectionId || section.sectionId === input.sectionId);

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
