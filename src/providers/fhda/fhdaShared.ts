import * as cheerio from 'cheerio';
import { normalizeText, safeNumber } from '@/src/providers/base';
import type { ProviderState, SectionCandidate } from '@/src/providers/types';

export type FhdaSection = SectionCandidate & {
  crn: string | null;
};

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
  return { subject: match[1].replace(/\s+/g, ' ').trim(), catalogNumber: match[2].trim() };
}

function parseSectionLabel(line: string) {
  const match = line.match(/Section:\s*(.+)$/i);
  return match ? match[1].trim() : null;
}

function deriveSubjectFromSection(label: string | null) {
  if (!label) return null;
  const match = label.match(/^([A-Z][A-Z &/]+)\s*-\s*([0-9A-Z.]+)[-–]/);
  if (!match) return null;
  const subject = match[1].replace(/\s+/g, ' ').trim();
  const catalogNumber = match[2].replace(/\./g, '').trim();
  return { subject, catalogNumber };
}

function parseState(line: string): ProviderState | null {
  if (/\bOpen\b/i.test(line)) return 'open';
  if (/\bClosed\b/i.test(line)) return 'closed';
  return null;
}

function parseSeatLine(line: string) {
  const match = line.match(/(\d+)\s+of\s+(\d+)\s+seats\s+open/i);
  if (!match) return null;
  return { open: safeNumber(match[1]) ?? null, total: safeNumber(match[2]) ?? null };
}

function parseWaitlistLine(line: string) {
  const match = line.match(/(\d+)\s+of\s+(\d+)\s+waitlist\s+seats\s+open/i);
  if (!match) return null;
  return { open: safeNumber(match[1]) ?? null, total: safeNumber(match[2]) ?? null };
}

export function parseFhdaScheduleHtml(html: string): FhdaSection[] {
  const lines = toLines(html);
  const sections: FhdaSection[] = [];
  let currentCourse: { subject: string | null; catalogNumber: string | null } = {
    subject: null,
    catalogNumber: null
  };
  let current: FhdaSection | null = null;

  function commitCurrent() {
    if (current && current.sectionId) {
      sections.push(current);
    }
  }

  for (const line of lines) {
    if (!line) continue;

    const courseHeader = parseCourseHeader(line);
    if (courseHeader) {
      currentCourse = {
        subject: courseHeader.subject.replace(/\s+/g, ''),
        catalogNumber: courseHeader.catalogNumber
      };
      continue;
    }

    const sectionLabel = parseSectionLabel(line);
    if (sectionLabel) {
      commitCurrent();
      const derived = deriveSubjectFromSection(sectionLabel);
      current = {
        sectionId: sectionLabel,
        sectionLabel,
        subject: derived?.subject?.replace(/\s+/g, '') ?? currentCourse.subject,
        catalogNumber: derived?.catalogNumber ?? currentCourse.catalogNumber,
        title: null,
        term: null,
        seats: null,
        waitlist: null,
        state: 'unknown',
        detailUrl: null,
        crn: null
      };
      continue;
    }

    if (!current) continue;

    if (/Course Number \(CRN\):/i.test(line)) {
      const crnMatch = line.match(/CRN\):\s*(\d+)/i);
      if (crnMatch) {
        current.crn = crnMatch[1];
        current.sectionId = crnMatch[1];
      }
      continue;
    }

    const state = parseState(line);
    if (state) {
      current.state = state;
      continue;
    }

    const seats = parseSeatLine(line);
    if (seats) {
      current.seats = seats.open;
      continue;
    }

    const waitlist = parseWaitlistLine(line);
    if (waitlist) {
      current.waitlist = waitlist.open;
      continue;
    }
  }

  commitCurrent();
  return sections;
}
