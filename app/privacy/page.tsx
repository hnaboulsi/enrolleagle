export default function PrivacyPage() {
  return (
    <div className="max-w-3xl space-y-4 pt-6 text-sm text-slate-700">
      <h1 className="text-3xl font-bold text-ink">Privacy Policy</h1>
      <p>
        AddDropper collects only what we need to deliver seat-availability alerts: your email address and the watchlist
        entries you choose to monitor. We do not store school credentials, student IDs, or enrollment data.
      </p>
      <h2 className="text-xl font-semibold text-ink">Data We Store</h2>
      <ul className="list-disc space-y-2 pl-6">
        <li>Email address and hashed password.</li>
        <li>Watchlist entries (college, term, section identifier, alert settings).</li>
        <li>Alert history and provider logs for reliability.</li>
      </ul>
      <h2 className="text-xl font-semibold text-ink">How We Use Data</h2>
      <p>
        We use your email address to send alerts and essential service updates. We use watchlist data to check seat
        availability on your behalf. We do not sell your data.
      </p>
      <h2 className="text-xl font-semibold text-ink">Contact</h2>
      <p>Email support@adddropper.app to request data deletion.</p>
    </div>
  );
}
