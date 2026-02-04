export type ProviderState = 'open' | 'closed' | 'unknown';

export type SectionCandidate = {
  sectionId: string;
  sectionLabel: string;
  subject: string | null;
  catalogNumber: string | null;
  title?: string | null;
  term?: string | null;
  seats?: number | null;
  waitlist?: number | null;
  state?: ProviderState;
  detailUrl?: string | null;
  raw?: Record<string, unknown>;
};

export type AvailabilityResult = {
  seatsAvailable: number | null;
  waitlistAvailable: number | null;
  state: ProviderState;
  raw?: Record<string, unknown>;
};

export type SearchQuery = {
  collegeSlug: string;
  term?: string | null;
  subject?: string | null;
  number?: string | null;
  keyword?: string | null;
};

export type AvailabilityInput = {
  sectionId: string;
  term?: string | null;
  detailUrl?: string | null;
};

export interface AvailabilityProvider {
  searchSections(query: SearchQuery): Promise<SectionCandidate[]>;
  getAvailability(input: AvailabilityInput): Promise<AvailabilityResult>;
}
