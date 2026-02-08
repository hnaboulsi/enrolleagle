'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (mode === 'signup' && password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const response = await fetch(`/api/auth/${mode === 'signup' ? 'signup' : 'login'}` , {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    setLoading(false);

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(payload?.error ?? 'Something went wrong.');
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</label>
        <input
          className="input mt-2"
          type="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={loading}
        />
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Password</label>
        <input
          className="input mt-2"
          type="password"
          required
          minLength={10}
          placeholder="Min. 10 characters"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={loading}
        />
      </div>
      {mode === 'signup' && (
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Confirm password</label>
          <input
            className="input mt-2"
            type="password"
            required
            minLength={10}
            placeholder="Repeat your password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            disabled={loading}
          />
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}
      <button disabled={loading} className="btn-primary w-full disabled:opacity-60 py-3 text-base">
        {loading ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Create account'}
      </button>
    </form>
  );
}
