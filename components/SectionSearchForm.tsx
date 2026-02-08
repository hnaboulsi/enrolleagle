'use client';

import type { FormEvent } from 'react';

export function SectionSearchForm({
  subject,
  number,
  keyword,
  onSubjectChange,
  onNumberChange,
  onKeywordChange,
  onSubmit,
  loading
}: {
  subject: string;
  number: string;
  keyword: string;
  onSubjectChange: (value: string) => void;
  onNumberChange: (value: string) => void;
  onKeywordChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  loading: boolean;
}) {
  return (
    <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-3">
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Subject</label>
        <input
          className="input mt-2"
          placeholder="e.g. MATH"
          value={subject}
          onChange={(event) => onSubjectChange(event.target.value.toUpperCase())}
        />
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Course number</label>
        <input
          className="input mt-2"
          placeholder="e.g. 1A"
          value={number}
          onChange={(event) => onNumberChange(event.target.value.toUpperCase())}
        />
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Keyword</label>
        <input
          className="input mt-2"
          placeholder="e.g. Calculus"
          value={keyword}
          onChange={(event) => onKeywordChange(event.target.value)}
        />
      </div>
      <div className="md:col-span-3">
        <button className="btn-primary" disabled={loading || (!subject && !keyword)}>
          {loading ? 'Searching…' : 'Search sections'}
        </button>
      </div>
    </form>
  );
}
