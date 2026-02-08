import { sendEmail } from '@/src/lib/email';
import { env } from '@/src/lib/env';

export type AlertEmailInput = {
  to: string;
  collegeName: string;
  term: string;
  subject: string | null;
  catalogNumber: string | null;
  sectionLabel: string | null;
  seatsAvailable: number | null;
  watchItemId: string;
  alertType: 'SEATS_OPENED' | 'WAITLIST_CHANGED' | 'STATE_CHANGED';
};

export function buildWatchUrl(watchItemId: string) {
  return `${env.APP_URL}/watch/${watchItemId}`;
}

export async function sendAlertEmail(input: AlertEmailInput) {
  const courseLine = [input.subject, input.catalogNumber].filter(Boolean).join(' ');
  const label = input.sectionLabel ?? 'Section';
  const subjectLine =
    input.alertType === 'SEATS_OPENED'
      ? `Seat Open: ${input.collegeName} ${courseLine} ${label}`.replace(/\s+/g, ' ').trim()
      : `Update: ${input.collegeName} ${courseLine} ${label}`.replace(/\s+/g, ' ').trim();

  const watchUrl = buildWatchUrl(input.watchItemId);

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <h2>Seat Alert from ${env.APP_NAME}</h2>
      <p><strong>${input.collegeName}</strong> · ${input.term}</p>
      <p><strong>${courseLine || 'Course'}</strong> · ${label}</p>
      <p>Seats available now: <strong>${input.seatsAvailable ?? 'Unknown'}</strong></p>
      <p>
        <a href="${watchUrl}">View this watch</a>
      </p>
      <p>Enroll through your college portal. ${env.APP_NAME} does not enroll or store school credentials.</p>
    </div>
  `;

  const text = [
    `${env.APP_NAME} seat alert`,
    `${input.collegeName} · ${input.term}`,
    `${courseLine || 'Course'} · ${label}`,
    `Seats available now: ${input.seatsAvailable ?? 'Unknown'}`,
    `View: ${watchUrl}`,
    'Enroll through your college portal.'
  ].join('\n');

  await sendEmail({ to: input.to, subject: subjectLine, html, text });
}
