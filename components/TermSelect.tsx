'use client';

import { useEffect, useState } from 'react';

export type TermOption = { id: string; label: string };

export function TermSelect({
  collegeSlug,
  value,
  onChange
}: {
  collegeSlug: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [options, setOptions] = useState<TermOption[]>([]);

  useEffect(() => {
    let active = true;
    async function loadTerms() {
      const response = await fetch(`/api/terms?college=${collegeSlug}`);
      if (!response.ok) {
        setOptions([{ id: 'current', label: 'Current Term' }]);
        return;
      }
      const payload = await response.json();
      const items = (payload.items ?? []) as TermOption[];
      if (active) {
        setOptions(items.length ? items : [{ id: 'current', label: 'Current Term' }]);
      }
    }
    if (collegeSlug) {
      loadTerms();
    }
    return () => {
      active = false;
    };
  }, [collegeSlug]);

  useEffect(() => {
    if (options.length && !value) {
      onChange(options[0].id);
    }
  }, [options, onChange, value]);

  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Term</label>
      <select className="input mt-2" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((term) => (
          <option key={term.id} value={term.id}>
            {term.label}
          </option>
        ))}
      </select>
      <p className="mt-2 text-xs text-slate-500">Defaults to the current term if only one is available.</p>
    </div>
  );
}
