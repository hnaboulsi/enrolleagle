import Link from 'next/link';
import { AuthForm } from '@/components/AuthForm';

export default function LoginPage() {
  return (
    <div className="mx-auto mt-10 max-w-md space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">Welcome back</h1>
        <p className="text-sm text-slate-600">Log in to manage your watchlist.</p>
      </div>
      <AuthForm mode="login" />
      <p className="text-center text-sm text-slate-600">
        New here?{' '}
        <Link href="/signup" className="font-semibold text-emerald-700">
          Create an account
        </Link>
      </p>
    </div>
  );
}
