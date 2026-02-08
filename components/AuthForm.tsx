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
    <div className="card space-y-4 p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</label>
          <input
            className="input mt-2"
            type="email"
            required
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
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={loading}
          />
          <p className="mt-2 text-xs text-slate-500">Minimum 10 characters.</p>
        </div>
        {mode === 'signup' ? (
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Confirm password</label>
            <input
              className="input mt-2"
              type="password"
              required
              minLength={10}
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              disabled={loading}
            />
          </div>
        ) : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button disabled={loading} className="btn-primary w-full disabled:opacity-60">
          {loading ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
        </button>
      </form>
    </div>
  );
}
