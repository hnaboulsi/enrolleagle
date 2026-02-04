import { sendEmail } from '@/src/lib/email';
import { env } from '@/src/lib/env';
import type { AlertType } from '@prisma/client';

export async function sendAlertEmail(input: {
  to: string;
  alertType: AlertType;
  collegeName: string;
  sectionLabel: string | null;
  subject: string | null;
  catalogNumber: string | null;
  seatsAvailable: number | null;
  waitlistAvailable: number | null;
  state: string;
}) {
  const subjectLine = `${input.collegeName}: ${input.sectionLabel ?? 'Class'} is now ${input.state}`;
  const detailLine = [input.subject, input.catalogNumber].filter(Boolean).join(' ');
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <h2>${input.collegeName} Seat Alert</h2>
      <p><strong>${input.sectionLabel ?? 'Class Section'}</strong> ${detailLine ? `(${detailLine})` : ''}</p>
      <p>Status: <strong>${input.state}</strong></p>
      <p>Seats available: ${input.seatsAvailable ?? 'Unknown'}</p>
      <p>Waitlist available: ${input.waitlistAvailable ?? 'Unknown'}</p>
      <p>Alert type: ${input.alertType.replace('_', ' ')}</p>
      <p>Check availability directly with the college if you plan to enroll.</p>
    </div>
  `;

  await sendEmail({
    to: input.to,
    subject: subjectLine,
    html,
    text: `${input.collegeName} - ${input.sectionLabel ?? 'Class'} is ${input.state}. Seats: ${
      input.seatsAvailable ?? 'Unknown'
    }. Waitlist: ${input.waitlistAvailable ?? 'Unknown'}.`
  });
}

export function buildSectionLink(collegeSlug: string, sectionId: string) {
  return `${env.BASE_URL}/dashboard?college=${collegeSlug}&section=${sectionId}`;
}
