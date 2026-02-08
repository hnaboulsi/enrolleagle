'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function LogoutButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogout() {
    setLoading(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    setLoading(false);
    router.push('/');
    router.refresh();
  }

  return (
    <button className="btn-outline" onClick={handleLogout} disabled={loading}>
      {loading ? 'Logging out…' : 'Log out'}
    </button>
  );
}
