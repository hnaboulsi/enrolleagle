export type ProviderState = 'open' | 'closed' | 'unknown';

export type SectionCandidate = {
  collegeSlug: 'deanza' | 'foothill' | 'dvc' | 'smc' | 'ivc';
  term: string;
  subject: string | null;
  catalogNumber: string | null;
  courseTitle: string | null;
  sectionLabel: string | null;
  externalSectionId: string;
  externalUrl: string | null;
  seatsAvailable: number | null;
  waitlistAvailable: number | null;
  state: ProviderState;
  meetingInfo: string | null;
};

export type AvailabilityResult = {
  seatsAvailable: number | null;
  waitlistAvailable?: number | null;
  state: ProviderState;
  raw?: any;
};

export type ProviderSearchParams = {
  term: string;
  q?: string;
  subject?: string;
  number?: string;
  limit?: number;
};

export interface AvailabilityProvider {
  collegeSlug: 'deanza' | 'foothill' | 'dvc' | 'smc' | 'ivc';

  listTerms(): Promise<{ id: string; label: string }[]>;

  searchSections(params: ProviderSearchParams): Promise<SectionCandidate[]>;

  getAvailability(params: {
    term: string;
    externalSectionId: string;
    externalUrl?: string;
  }): Promise<AvailabilityResult>;
}
