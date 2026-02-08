import * as cheerio from 'cheerio';
import { normalizeText, safeNumber } from '@/src/providers/utils';
import type { ProviderState, SectionCandidate } from '@/src/providers/types';

function toLines(html: string) {
  const $ = cheerio.load(html);
  $('br').replaceWith('\n');
  $('p, h1, h2, h3, h4, h5, h6, li, tr, div, span').each((_, el) => {
    const text = $(el).text();
    if (text && !text.endsWith('\n')) {
      $(el).append('\n');
    }
  });
  return $('body').text().replace(/\r/g, '').split('\n').map((line) => normalizeText(line));
}

function parseCourseHeader(line: string) {
  const match = line.match(/^([A-Z][A-Z &/.+-]+)\s+([0-9A-Z]+[A-Z]?)$/);
  if (!match) return null;
  return { subject: match[1].replace(/\s+/g, '').trim(), catalogNumber: match[2].trim() };
}

function parseSectionLabel(line: string) {
  const match = line.match(/Section:\s*(.+)$/i);
  return match ? match[1].trim() : null;
}

function parseState(line: string): ProviderState | null {
  // Don't match seat availability lines
  if (/seats/i.test(line)) return null;

  if (/\bOpen\b/i.test(line)) return 'open';
  if (/\bClosed\b/i.test(line)) return 'closed';
  return null;
}

function parseSeatLine(line: string) {
  // Don't match waitlist lines
  if (/waitlist/i.test(line)) return null;

  // Support both "Seats Available: X of Y" and "X of Y seats open" formats
  if (/Seats Available:/i.test(line)) {
    const match = line.match(/Seats Available:\s*(\d+)\s+of\s+(\d+)/i);
    if (match) return safeNumber(match[1]);
  }
  const match = line.match(/(\d+)\s+of\s+(\d+)\s+seats\s+open/i);
  if (!match) return null;
  return safeNumber(match[1]);
}

function parseWaitlistLine(line: string) {
  // Support both "Waitlist Seats Available: X of Y" and "X of Y waitlist seats open" formats
  if (/Waitlist.*Available:/i.test(line)) {
    const match = line.match(/Waitlist.*Available:\s*(\d+)\s+of\s+(\d+)/i);
    if (match) return safeNumber(match[1]);
  }
  const match = line.match(/(\d+)\s+of\s+(\d+)\s+waitlist\s+seats\s+open/i);
  if (!match) return null;
  return safeNumber(match[1]);
}

export function parseFhdaScheduleHtml(html: string, input: {
  collegeSlug: SectionCandidate['collegeSlug'];
  term: string;
  scheduleUrl: string;
}): SectionCandidate[] {
  const lines = toLines(html);
  const sections: SectionCandidate[] = [];
  let currentCourse: { subject: string | null; catalogNumber: string | null } = {
    subject: null,
    catalogNumber: null
  };
  let current: SectionCandidate | null = null;
  let pendingCrn: string | null = null;

  function commitCurrent() {
    if (current && current.externalSectionId) {
      sections.push(current);
    }
  }

  for (const line of lines) {
    if (!line) continue;

    const courseHeader = parseCourseHeader(line);
    if (courseHeader) {
      currentCourse = {
        subject: courseHeader.subject,
        catalogNumber: courseHeader.catalogNumber
      };
      continue;
    }

    const sectionLabel = parseSectionLabel(line);
    if (sectionLabel) {
      commitCurrent();
      pendingCrn = null;
      current = {
        collegeSlug: input.collegeSlug,
        term: input.term,
        subject: currentCourse.subject,
        catalogNumber: currentCourse.catalogNumber,
        courseTitle: null,
        sectionLabel,
        externalSectionId: sectionLabel,
        externalUrl: input.scheduleUrl,
        seatsAvailable: null,
        waitlistAvailable: null,
        state: 'unknown',
        meetingInfo: null
      };
      continue;
    }

    if (!current) continue;

    if (/Course Number \(CRN\):/i.test(line)) {
      const crnMatch = line.match(/CRN\):\s*(\d+)/i);
      if (crnMatch) {
        pendingCrn = crnMatch[1];
        current.externalSectionId = pendingCrn;
      }
      continue;
    }

    const state = parseState(line);
    if (state) {
      current.state = state;
      continue;
    }

    const seats = parseSeatLine(line);
    if (seats !== null) {
      current.seatsAvailable = seats;
      continue;
    }

    const waitlist = parseWaitlistLine(line);
    if (waitlist !== null) {
      current.waitlistAvailable = waitlist;
      continue;
    }
  }

  commitCurrent();
  return sections;
}
