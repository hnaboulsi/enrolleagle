import Link from 'next/link';
import { getCurrentUser } from '@/src/lib/auth';

const stats = [
  { label: 'Colleges', value: '5 CCC schools' },
  { label: 'Alert speed', value: '~90 second checks' },
  { label: 'Focus', value: 'Seat notifications' }
];

const colleges = [
  { name: 'De Anza College', icon: '🎓' },
  { name: 'Foothill College', icon: '⛰️' },
  { name: 'Diablo Valley College', icon: '🌄' },
  { name: 'Santa Monica College', icon: '🌊' },
  { name: 'Irvine Valley College', icon: '🌴' }
];

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <div className="space-y-20 py-8">
      {/* Hero Section */}
      <section className="grid gap-10 md:grid-cols-[1.2fr_0.8fr] md:items-start">
        <div className="space-y-7 fade-in">
          <div className="inline-block">
            <span className="badge">Real-time seat alerts</span>
          </div>
          <h1 className="text-5xl font-black leading-tight text-ink md:text-6xl">
            Never miss a{' '}
            <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              seat opening
            </span>
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed">
            AddDropper monitors seat availability for California Community Colleges and sends instant email alerts
            when seats open. No auto-enroll, no credentials—just fast, reliable notifications.
          </p>

          {!user && (
            <div className="flex flex-wrap gap-4 pt-2">
              <Link href="/signup" className="btn-primary text-base px-6 py-3">
                Get started free
              </Link>
              <Link href="/login" className="btn-outline text-base px-6 py-3">
                Log in
              </Link>
            </div>
          )}

          {user && (
            <div className="flex flex-wrap gap-4 pt-2">
              <Link href="/dashboard" className="btn-primary text-base px-6 py-3">
                Go to Dashboard
              </Link>
              <Link href="/watch/new" className="btn-outline text-base px-6 py-3">
                Add a watch
              </Link>
            </div>
          )}

          {/* Stats */}
          <div className="flex flex-wrap gap-8 pt-4 border-t border-slate-200">
            {stats.map((stat) => (
              <div key={stat.label}>
                <p className="text-xs uppercase tracking-wide text-slate-400 font-semibold">{stat.label}</p>
                <p className="font-bold text-slate-800 mt-1">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Colleges Card */}
        <div className="card space-y-5 p-7 fade-in shadow-lg border border-emerald-100">
          <div>
            <h3 className="text-xl font-bold text-slate-800">Supported Colleges</h3>
            <p className="text-xs text-slate-500 mt-1">Currently monitoring 5 California CCCs</p>
          </div>
          <ul className="space-y-3">
            {colleges.map((college) => (
              <li key={college.name} className="flex items-center gap-3 text-sm text-slate-700">
                <span className="text-2xl">{college.icon}</span>
                <span className="font-medium">{college.name}</span>
              </li>
            ))}
          </ul>
          <div className="rounded-lg bg-gradient-to-br from-emerald-50 to-teal-50 px-4 py-3 text-xs text-emerald-900 border border-emerald-100">
            <span className="font-semibold">💡 How it works:</span> Alerts trigger when seats go from closed to open.
            Waitlist changes are optional.
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section>
        <h2 className="text-3xl font-bold text-center mb-10 text-slate-800">How AddDropper Works</h2>
        <div className="grid gap-6 md:grid-cols-3 stagger">
          {[
            {
              title: '1. Choose a class',
              copy: 'Search for your desired class section across multiple California Community Colleges.',
              icon: '🔍'
            },
            {
              title: '2. We monitor for you',
              copy: 'AddDropper checks official schedules continuously with respectful polling.',
              icon: '👀'
            },
            {
              title: '3. Get instant alerts',
              copy: 'Receive email notifications the moment seats become available with direct links.',
              icon: '⚡'
            }
          ].map((item) => (
            <div key={item.title} className="card p-7 hover:shadow-lg transition-all border border-slate-100">
              <div className="text-4xl mb-4">{item.icon}</div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">{item.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{item.copy}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      {!user && (
        <section className="card p-10 text-center bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100">
          <h2 className="text-3xl font-bold text-slate-800 mb-4">Ready to get started?</h2>
          <p className="text-slate-600 mb-6 max-w-2xl mx-auto">
            Join students who never miss a class opening. Sign up now and start monitoring your classes.
          </p>
          <Link href="/signup" className="btn-primary text-base px-8 py-3 inline-block">
            Create your free account
          </Link>
        </section>
      )}
    </div>
  );
}
