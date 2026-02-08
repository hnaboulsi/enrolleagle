import Link from 'next/link';
import { AuthForm } from '@/components/AuthForm';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/src/lib/auth';

export default async function SignupPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect('/dashboard');
  }

  return (
    <div className="mx-auto mt-12 max-w-md space-y-8 fade-in">
      <div className="space-y-3 text-center">
        <h1 className="text-4xl font-bold text-slate-800">Create your account</h1>
        <p className="text-base text-slate-600">Start monitoring seats across five California Community Colleges.</p>
      </div>
      <div className="card p-8 shadow-lg border border-emerald-100">
        <AuthForm mode="signup" />
      </div>
      <p className="text-center text-sm text-slate-600">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-emerald-700 hover:text-emerald-800 transition-colors">
          Log in
        </Link>
      </p>
    </div>
  );
}
