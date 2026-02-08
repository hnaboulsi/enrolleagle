import Link from 'next/link';
import { getCurrentUser } from '@/src/lib/auth';

const stats = [
  { label: 'Colleges', value: '2 live, 3 coming' },
  { label: 'Alert speed', value: '~90 second checks' },
  { label: 'Focus', value: 'Seat notifications' }
];

const colleges = [
  { name: 'Foothill College', status: 'live' as const },
  { name: 'De Anza College', status: 'live' as const },
  { name: 'Diablo Valley College', status: 'soon' as const },
  { name: 'Santa Monica College', status: 'soon' as const },
  { name: 'Irvine Valley College', status: 'soon' as const }
];

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <div className="space-y-20 py-8">
      {/* Hero */}
      <section className="grid gap-10 md:grid-cols-[1.2fr_0.8fr] md:items-start">
        <div className="space-y-7 fade-in">
          <span className="badge">Real-time seat alerts</span>
          <h1 className="text-5xl font-black leading-tight text-ink md:text-6xl">
            Never miss a{' '}
            <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              seat opening
            </span>
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed">
            AddDropper monitors seat availability for California Community Colleges and sends instant email alerts
            when seats open. No auto-enroll, no credentials — just fast, reliable notifications.
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            {user ? (
              <>
                <Link href="/dashboard" className="btn-primary text-base px-6 py-3">Go to Dashboard</Link>
                <Link href="/watch/new" className="btn-outline text-base px-6 py-3">Add a watch</Link>
              </>
            ) : (
              <>
                <Link href="/signup" className="btn-primary text-base px-6 py-3">Get started free</Link>
                <Link href="/login" className="btn-outline text-base px-6 py-3">Log in</Link>
              </>
            )}
          </div>

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
            <p className="text-xs text-slate-500 mt-1">FHDA district live, more coming soon</p>
          </div>
          <ul className="space-y-3">
            {colleges.map((college) => (
              <li key={college.name} className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700">{college.name}</span>
                {college.status === 'live' ? (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">Live</span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500">Coming Soon</span>
                )}
              </li>
            ))}
          </ul>
          <div className="rounded-lg bg-gradient-to-br from-emerald-50 to-teal-50 px-4 py-3 text-xs text-emerald-900 border border-emerald-100">
            Alerts trigger when seats go from closed to open. Waitlist monitoring is optional.
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section>
        <h2 className="text-3xl font-bold text-center mb-10 text-slate-800">How AddDropper Works</h2>
        <div className="grid gap-6 md:grid-cols-3 stagger">
          {[
            { step: '1', title: 'Choose a class', copy: 'Pick a college, enter a subject code like CS or MATH, and find your section.', icon: '🔍' },
            { step: '2', title: 'We monitor for you', copy: 'AddDropper checks official schedule pages continuously on a respectful polling cadence.', icon: '👀' },
            { step: '3', title: 'Get instant alerts', copy: 'Receive email notifications the moment seats become available.', icon: '⚡' }
          ].map((item) => (
            <div key={item.title} className="card p-7 hover:shadow-lg transition-all border border-slate-100">
              <div className="text-4xl mb-4">{item.icon}</div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">{item.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{item.copy}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      {!user && (
        <section className="card p-10 text-center bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100">
          <h2 className="text-3xl font-bold text-slate-800 mb-4">Ready to get started?</h2>
          <p className="text-slate-600 mb-6 max-w-2xl mx-auto">
            Join students who never miss a class opening. Sign up and start monitoring your classes today.
          </p>
          <Link href="/signup" className="btn-primary text-base px-8 py-3 inline-block">
            Create your free account
          </Link>
        </section>
      )}
    </div>
  );
}
