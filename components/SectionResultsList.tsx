'use client';

import type { SectionCandidate } from '@/src/providers/types';
import { StatusPill } from '@/components/StatusPill';

export function SectionResultsList({
  items,
  onSelect
}: {
  items: SectionCandidate[];
  onSelect: (item: SectionCandidate) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="card p-6 text-sm text-slate-600">
        Search to see available sections. If no results appear, double-check the subject or try a keyword.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.externalSectionId} className="card p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">{item.sectionLabel ?? 'Section'}</h3>
              <p className="text-sm text-slate-600">
                {item.subject} {item.catalogNumber} {item.courseTitle ? `· ${item.courseTitle}` : ''}
              </p>
              <p className="text-xs text-slate-500">Term: {item.term}</p>
              {item.meetingInfo ? <p className="text-xs text-slate-500">{item.meetingInfo}</p> : null}
            </div>
            <div className="text-right text-xs text-slate-500">
              <p>Seats: {item.seatsAvailable ?? 'Unknown'}</p>
              <p>Waitlist: {item.waitlistAvailable ?? 'Unknown'}</p>
              <div className="mt-2">
                <StatusPill state={item.state} />
              </div>
            </div>
          </div>
          <div className="mt-4">
            <button className="btn-primary" onClick={() => onSelect(item)}>
              Watch this section
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
