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
    return null;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-slate-500">{items.length} section{items.length !== 1 ? 's' : ''} found</p>
      {items.map((item) => (
        <button
          key={item.externalSectionId}
          onClick={() => onSelect(item)}
          className="card w-full text-left p-5 border border-emerald-100 hover:border-emerald-300 hover:shadow-lg transition-all cursor-pointer"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-800">
                  {item.subject} {item.catalogNumber}
                </h3>
                <StatusPill state={item.state} />
              </div>
              <p className="text-sm text-slate-600 mt-1 truncate">
                {item.sectionLabel ?? 'Section'}{item.courseTitle ? ` - ${item.courseTitle}` : ''}
              </p>
              {item.meetingInfo && <p className="text-xs text-slate-500 mt-1">{item.meetingInfo}</p>}
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-800">{item.seatsAvailable ?? '?'}</p>
                <p className="text-xs text-slate-500">seats</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-800">{item.waitlistAvailable ?? '?'}</p>
                <p className="text-xs text-slate-500">waitlist</p>
              </div>
              <div className="text-emerald-600">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
