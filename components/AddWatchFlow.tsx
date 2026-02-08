'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CollegeSelect, CollegeOption } from '@/components/CollegeSelect';
import { TermSelect } from '@/components/TermSelect';
import { SectionSearchForm } from '@/components/SectionSearchForm';
import { SectionResultsList } from '@/components/SectionResultsList';
import type { SectionCandidate } from '@/src/providers/types';

export function AddWatchFlow({ colleges }: { colleges: CollegeOption[] }) {
  const [collegeSlug, setCollegeSlug] = useState(colleges[0]?.slug ?? '');
  const [term, setTerm] = useState('');
  const [subject, setSubject] = useState('');
  const [catalogNumber, setCatalogNumber] = useState('');
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SectionCandidate[]>([]);
  const [selected, setSelected] = useState<SectionCandidate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const selectedCollege = colleges.find((c) => c.slug === collegeSlug);
  const isComingSoon = selectedCollege?.supported === false;
  const canSearch = useMemo(
    () => Boolean(collegeSlug && term && (subject || keyword) && !isComingSoon),
    [collegeSlug, term, subject, keyword, isComingSoon]
  );

  async function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    if (!canSearch) return;
    setLoading(true);
    setError(null);
    setSelected(null);

    const params = new URLSearchParams({
      college: collegeSlug,
      term,
      ...(subject ? { subject } : {}),
      ...(catalogNumber ? { number: catalogNumber } : {}),
      ...(keyword ? { q: keyword } : {})
    });

    const response = await fetch(`/api/search/sections?${params.toString()}`);
    setLoading(false);

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(payload?.error ?? 'Search failed.');
      return;
    }

    const payload = await response.json();
    const items = payload.items ?? [];
    setResults(items);
    if (items.length === 0) {
      setError('No sections found. Try a different subject code (e.g. CS, MATH, ENGL).');
    }
  }

  async function addWatch() {
    if (!selected) return;
    setLoading(true);
    const response = await fetch('/api/watch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        collegeSlug,
        term,
        subject: selected.subject,
        catalogNumber: selected.catalogNumber,
        courseTitle: selected.courseTitle,
        sectionLabel: selected.sectionLabel,
        externalSectionId: selected.externalSectionId,
        externalUrl: selected.externalUrl,
        seatsAvailable: selected.seatsAvailable,
        waitlistAvailable: selected.waitlistAvailable,
        state: selected.state
      })
    });
    setLoading(false);

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(payload?.error ?? 'Unable to add watch.');
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  useEffect(() => {
    setResults([]);
    setSelected(null);
    setTerm('');
    setError(null);
  }, [collegeSlug]);

  return (
    <div className="space-y-6">
      <div className="card space-y-5 p-7 border border-emerald-100">
        <div className="grid gap-4 md:grid-cols-2">
          <CollegeSelect value={collegeSlug} options={colleges} onChange={setCollegeSlug} />
          <TermSelect collegeSlug={collegeSlug} value={term} onChange={setTerm} />
        </div>

        {isComingSoon && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
            <strong className="font-semibold">{selectedCollege?.name}</strong> is coming soon.
            Search is not available for this college yet. Try <strong>Foothill College</strong> or <strong>De Anza College</strong>.
          </div>
        )}

        {!isComingSoon && (
          <SectionSearchForm
            subject={subject}
            number={catalogNumber}
            keyword={keyword}
            onSubjectChange={setSubject}
            onNumberChange={setCatalogNumber}
            onKeywordChange={setKeyword}
            onSubmit={handleSearch}
            loading={loading}
          />
        )}

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}
      </div>

      {!selected ? (
        <SectionResultsList items={results} onSelect={setSelected} />
      ) : (
        <div className="card p-7 border border-emerald-100">
          <h3 className="text-xl font-bold text-slate-800">Confirm Watch</h3>
          <p className="mt-2 text-sm text-slate-600">
            We&apos;ll monitor this section and email you the moment seats open.
          </p>
          <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-lg bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase text-slate-400">College</p>
              <p className="font-medium text-slate-800 mt-1">{selectedCollege?.name}</p>
            </div>
            <div className="rounded-lg bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase text-slate-400">Term</p>
              <p className="font-medium text-slate-800 mt-1">{term}</p>
            </div>
            <div className="rounded-lg bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase text-slate-400">Course</p>
              <p className="font-medium text-slate-800 mt-1">
                {selected.subject} {selected.catalogNumber} {selected.courseTitle ? `- ${selected.courseTitle}` : ''}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase text-slate-400">Section</p>
              <p className="font-medium text-slate-800 mt-1">{selected.sectionLabel ?? selected.externalSectionId}</p>
            </div>
            <div className="rounded-lg bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase text-slate-400">Seats Available</p>
              <p className="font-medium text-slate-800 mt-1">{selected.seatsAvailable ?? 'Unknown'}</p>
            </div>
            <div className="rounded-lg bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase text-slate-400">Waitlist</p>
              <p className="font-medium text-slate-800 mt-1">{selected.waitlistAvailable ?? 'Unknown'}</p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <button className="btn-primary" onClick={addWatch} disabled={loading}>
              {loading ? 'Adding...' : 'Start watching'}
            </button>
            <button className="btn-outline" onClick={() => setSelected(null)} disabled={loading}>
              Back to results
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
