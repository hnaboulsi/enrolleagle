export default function TermsPage() {
  return (
    <div className="max-w-3xl space-y-4 pt-6 text-sm text-slate-700">
      <h1 className="text-3xl font-bold text-ink">Terms of Service</h1>
      <p>
        AddDropper provides seat-availability alerts only. We do not enroll students, submit applications, or access
        school credentials. You are responsible for completing your own registration with your college.
      </p>
      <h2 className="text-xl font-semibold text-ink">Acceptable Use</h2>
      <ul className="list-disc space-y-2 pl-6">
        <li>Do not use this service to automate enrollment or bypass college systems.</li>
        <li>Respect college policies and terms of use.</li>
        <li>Do not resell alerts or scrape data beyond your watchlist.</li>
      </ul>
      <h2 className="text-xl font-semibold text-ink">Availability</h2>
      <p>
        We strive to provide timely alerts but do not guarantee real-time seat accuracy. Seat availability changes quickly
        and is controlled by each college system.
      </p>
    </div>
  );
}
