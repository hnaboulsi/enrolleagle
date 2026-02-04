'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

export type CollegeOption = {
  id: string;
  name: string;
  slug: string;
};

export type SectionCandidate = {
  sectionId: string;
  sectionLabel: string;
  subject: string | null;
  catalogNumber: string | null;
  title?: string | null;
  term?: string | null;
  seats?: number | null;
  waitlist?: number | null;
  state?: string | null;
  detailUrl?: string | null;
};

export function AddWatchFlow({ colleges }: { colleges: CollegeOption[] }) {
  const [collegeSlug, setCollegeSlug] = useState(colleges[0]?.slug ?? '');
  const [term, setTerm] = useState('');
  const [subject, setSubject] = useState('');
  const [catalogNumber, setCatalogNumber] = useState('');
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SectionCandidate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const canSearch = useMemo(() => Boolean(collegeSlug && (subject || keyword)), [collegeSlug, subject, keyword]);

  async function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    if (!canSearch) return;
    setLoading(true);
    setError(null);

    const response = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collegeSlug, term: term || null, subject, number: catalogNumber, keyword })
    });

    setLoading(false);

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(payload?.error ?? 'Search failed.');
      return;
    }

    const payload = await response.json();
    setResults(payload.items ?? []);
  }

  async function addWatch(candidate: SectionCandidate) {
    setLoading(true);
    const response = await fetch('/api/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        collegeSlug,
        term: term || candidate.term || null,
        subject: candidate.subject || subject || null,
        catalogNumber: candidate.catalogNumber || catalogNumber || null,
        sectionLabel: candidate.sectionLabel,
        sectionId: candidate.sectionId,
        detailUrl: candidate.detailUrl || null
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
  }, [collegeSlug]);

  return (
    <div className="space-y-6">
      <form onSubmit={handleSearch} className="card space-y-4 p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">College</label>
            <select
              className="input mt-2"
              value={collegeSlug}
              onChange={(event) => setCollegeSlug(event.target.value)}
            >
              {colleges.map((college) => (
                <option key={college.id} value={college.slug}>
                  {college.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Term (optional)</label>
            <input
              className="input mt-2"
              placeholder="e.g. 2026SP"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
            />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Subject</label>
            <input
              className="input mt-2"
              placeholder="e.g. MATH"
              value={subject}
              onChange={(event) => setSubject(event.target.value.toUpperCase())}
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Number</label>
            <input
              className="input mt-2"
              placeholder="e.g. 1A"
              value={catalogNumber}
              onChange={(event) => setCatalogNumber(event.target.value.toUpperCase())}
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Keyword (optional)</label>
            <input
              className="input mt-2"
              placeholder="e.g. Calculus"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
          </div>
        </div>
        <button className="btn-primary" disabled={!canSearch || loading}>
          {loading ? 'Searching…' : 'Search sections'}
        </button>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </form>

      <div className="space-y-3">
        {results.length === 0 ? (
          <div className="card p-6 text-sm text-slate-600">
            Search to see available sections. If no results appear, double-check the subject or try a keyword.
          </div>
        ) : (
          results.map((item) => (
            <div key={item.sectionId} className="card p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold">{item.sectionLabel}</h3>
                  <p className="text-sm text-slate-600">
                    {item.subject} {item.catalogNumber} {item.title ? `· ${item.title}` : ''}
                  </p>
                  <p className="text-xs text-slate-500">Term: {item.term ?? term ?? 'Current term'}</p>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <p>Seats: {item.seats ?? 'Unknown'}</p>
                  <p>Waitlist: {item.waitlist ?? 'Unknown'}</p>
                  <p>Status: {item.state ?? 'unknown'}</p>
                </div>
              </div>
              <div className="mt-4">
                <button className="btn-primary" onClick={() => addWatch(item)} disabled={loading}>
                  Watch this section
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
