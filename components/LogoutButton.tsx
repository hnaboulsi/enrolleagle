'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function LogoutButton({ variant = 'button' }: { variant?: 'button' | 'link' }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogout() {
    setLoading(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    setLoading(false);
    router.push('/');
    router.refresh();
  }

  if (variant === 'link') {
    return (
      <button
        className="text-sm font-semibold text-slate-700 transition-colors hover:text-emerald-700 disabled:opacity-50"
        onClick={handleLogout}
        disabled={loading}
      >
        {loading ? 'Logging out…' : 'Log out'}
      </button>
    );
  }

  return (
    <button className="btn-outline" onClick={handleLogout} disabled={loading}>
      {loading ? 'Logging out…' : 'Log out'}
    </button>
  );
}
