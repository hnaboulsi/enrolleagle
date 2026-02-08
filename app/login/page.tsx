import Link from 'next/link';
import { AuthForm } from '@/components/AuthForm';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/src/lib/auth';

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect('/dashboard');
  }

  return (
    <div className="mx-auto mt-12 max-w-md space-y-8 fade-in">
      <div className="space-y-3 text-center">
        <h1 className="text-4xl font-bold text-slate-800">Welcome back</h1>
        <p className="text-base text-slate-600">Log in to manage your watchlist and get class alerts.</p>
      </div>
      <div className="card p-8 shadow-lg border border-emerald-100">
        <AuthForm mode="login" />
      </div>
      <p className="text-center text-sm text-slate-600">
        New here?{' '}
        <Link href="/signup" className="font-semibold text-emerald-700 hover:text-emerald-800 transition-colors">
          Create an account
        </Link>
      </p>
    </div>
  );
}
