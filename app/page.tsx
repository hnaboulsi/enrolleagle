import Link from 'next/link';

const stats = [
  { label: 'Colleges', value: '5 CCC launch schools' },
  { label: 'Alert speed', value: '90 second checks + backoff' },
  { label: 'Focus', value: 'Seat open notifications' }
];

export default function HomePage() {
  return (
    <div className="space-y-16">
      <section className="grid gap-10 pt-6 md:grid-cols-[1.1fr_0.9fr] md:items-center">
        <div className="space-y-6 fade-in">
          <span className="badge">Real-time seat alerts</span>
          <h1 className="text-4xl font-black leading-tight text-ink md:text-5xl">
            Get notified the moment a seat opens.
          </h1>
          <p className="text-base text-slate-700">
            AddDropper watches seat availability for select California Community Colleges and sends instant email alerts
            when seats open. No auto-enroll, no credentials—just fast notifications.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/signup" className="btn-primary">
              Sign up
            </Link>
            <Link href="/login" className="btn-outline">
              Log in
            </Link>
          </div>
          <div className="flex flex-wrap gap-6 text-sm text-slate-600">
            {stats.map((stat) => (
              <div key={stat.label}>
                <p className="text-xs uppercase tracking-wide text-slate-400">{stat.label}</p>
                <p className="font-semibold text-slate-700">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="card space-y-4 p-6 fade-in">
          <h3 className="text-lg font-semibold text-slate-800">Launch colleges</h3>
          <ul className="space-y-3 text-sm text-slate-600">
            <li>De Anza College</li>
            <li>Foothill College</li>
            <li>Diablo Valley College (DVC)</li>
            <li>Santa Monica College (SMC)</li>
            <li>Irvine Valley College (IVC)</li>
          </ul>
          <div className="rounded-xl bg-emerald-50 px-4 py-3 text-xs text-emerald-900">
            Alerts fire when seats go from closed to open. Waitlist changes are optional.
          </div>
        </div>
      </section>
      <section className="grid gap-6 md:grid-cols-3 stagger">
        {[
          {
            title: 'Choose a class',
            copy: 'Pick a college, search for a class section, and add it to your watchlist.'
          },
          {
            title: 'We monitor availability',
            copy: 'AddDropper checks official schedules on a respectful polling cadence.'
          },
          {
            title: 'Get instant alerts',
            copy: 'We email you the moment seats open with a direct link to your watch details.'
          }
        ].map((item) => (
          <div key={item.title} className="card p-6">
            <h3 className="text-lg font-semibold text-slate-800">{item.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{item.copy}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
