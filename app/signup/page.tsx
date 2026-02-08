import Link from 'next/link';
import { AuthForm } from '@/components/AuthForm';

export default function SignupPage() {
  return (
    <div className="mx-auto mt-10 max-w-md space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">Create your account</h1>
        <p className="text-sm text-slate-600">Start watching seats across the five launch colleges.</p>
      </div>
      <AuthForm mode="signup" />
      <p className="text-center text-sm text-slate-600">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-emerald-700">
          Log in
        </Link>
      </p>
    </div>
  );
}
