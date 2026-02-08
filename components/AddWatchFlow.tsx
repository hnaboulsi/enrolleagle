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

  const canSearch = useMemo(() => Boolean(collegeSlug && term && (subject || keyword)), [collegeSlug, term, subject, keyword]);

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
    setResults(payload.items ?? []);
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
  }, [collegeSlug]);

  return (
    <div className="space-y-6">
      <div className="card space-y-4 p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <CollegeSelect value={collegeSlug} options={colleges} onChange={setCollegeSlug} />
          <TermSelect collegeSlug={collegeSlug} value={term} onChange={setTerm} />
        </div>
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
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>

      {!selected ? (
        <SectionResultsList items={results} onSelect={setSelected} />
      ) : (
        <div className="card p-6">
          <h3 className="text-lg font-semibold">Confirm watch</h3>
          <p className="mt-2 text-sm text-slate-600">
            We will monitor this section and email you the moment seats open.
          </p>
          <div className="mt-4 space-y-2 text-sm text-slate-600">
            <p>College: {colleges.find((c) => c.slug === collegeSlug)?.name}</p>
            <p>Term: {term}</p>
            <p>
              Course: {selected.subject} {selected.catalogNumber} {selected.courseTitle ? `· ${selected.courseTitle}` : ''}
            </p>
            <p>Section: {selected.sectionLabel ?? selected.externalSectionId}</p>
            <p>Current seats: {selected.seatsAvailable ?? 'Unknown'}</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button className="btn-primary" onClick={addWatch} disabled={loading}>
              Start watching
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
