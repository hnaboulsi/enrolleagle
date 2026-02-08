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
            <span className="bg-gradient-to-r from-brand-500 via-accent-500 to-accent-600 bg-clip-text text-transparent">
              seat opening
            </span>
          </h1>
          <p className="text-lg text-slate-700 leading-relaxed">
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
        <div className="card space-y-5 p-7 fade-in shadow-xl border-2 border-brand-200/60">
          <div>
            <h3 className="text-xl font-bold bg-gradient-to-r from-brand-600 to-accent-600 bg-clip-text text-transparent">Supported Colleges</h3>
            <p className="text-xs text-slate-500 mt-1">FHDA district live, more coming soon</p>
          </div>
          <ul className="space-y-3">
            {colleges.map((college) => (
              <li key={college.name} className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700">{college.name}</span>
                {college.status === 'live' ? (
                  <span className="rounded-full bg-gradient-to-r from-brand-100 to-accent-100 px-3 py-1 text-xs font-semibold text-brand-700 shadow-sm">Live</span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">Coming Soon</span>
                )}
              </li>
            ))}
          </ul>
          <div className="rounded-xl bg-gradient-to-br from-brand-50 via-blue-50 to-accent-50 px-4 py-3 text-xs text-brand-900 border border-brand-200/50 shadow-sm">
            Alerts trigger when seats go from closed to open. Waitlist monitoring is optional.
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section>
        <h2 className="text-3xl font-bold text-center mb-10 bg-gradient-to-r from-brand-600 to-accent-600 bg-clip-text text-transparent">How AddDropper Works</h2>
        <div className="grid gap-6 md:grid-cols-3 stagger">
          {[
            { step: '1', title: 'Choose a class', copy: 'Pick a college, enter a subject code like CS or MATH, and find your section.', icon: '🔍', gradient: 'from-brand-500 to-brand-600' },
            { step: '2', title: 'We monitor for you', copy: 'AddDropper checks official schedule pages continuously on a respectful polling cadence.', icon: '👀', gradient: 'from-brand-500 to-accent-500' },
            { step: '3', title: 'Get instant alerts', copy: 'Receive email notifications the moment seats become available.', icon: '⚡', gradient: 'from-accent-500 to-accent-600' }
          ].map((item) => (
            <div key={item.title} className="card p-7 hover:shadow-xl hover:scale-[1.02] transition-all border-2 border-brand-100 group">
              <div className={`text-5xl mb-4 inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${item.gradient} shadow-lg group-hover:shadow-glow transition-all`}>
                <span className="drop-shadow-sm">{item.icon}</span>
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">{item.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{item.copy}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      {!user && (
        <section className="relative overflow-hidden rounded-3xl p-10 text-center bg-gradient-to-br from-brand-500 via-brand-600 to-accent-600 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-mesh opacity-50"></div>
          <div className="relative z-10">
            <h2 className="text-3xl font-bold text-white mb-4">Ready to get started?</h2>
            <p className="text-brand-50 mb-6 max-w-2xl mx-auto text-lg">
              Join students who never miss a class opening. Sign up and start monitoring your classes today.
            </p>
            <Link href="/signup" className="inline-block rounded-xl bg-white px-8 py-3 text-base font-semibold text-brand-700 shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all">
              Create your free account
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
