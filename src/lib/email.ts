import nodemailer from 'nodemailer';
import { env } from '@/src/lib/env';
import { log } from '@/src/lib/logger';

export type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

let cachedTransport: nodemailer.Transporter | null = null;

function getTransporter() {
  if (cachedTransport) return cachedTransport;

  if (env.SENDGRID_API_KEY && env.SENDGRID_FROM) {
    const transport = nodemailer.createTransport({
      service: 'SendGrid',
      auth: { user: 'apikey', pass: env.SENDGRID_API_KEY }
    });
    cachedTransport = transport;
    return transport;
  }

  if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD) {
    const transport = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT ?? 587,
      secure: (env.SMTP_PORT ?? 587) === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASSWORD
      }
    });
    cachedTransport = transport;
    return transport;
  }

  return null;
}

export async function sendEmail(payload: EmailPayload) {
  const transporter = getTransporter();
  if (!transporter) {
    log('warn', 'Email not configured. Logging email payload instead.', payload);
    return { skipped: true };
  }

  const from = env.SENDGRID_FROM || env.SMTP_FROM || 'alerts@creditsniper.app';
  await transporter.sendMail({
    from,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
    text: payload.text
  });

  return { skipped: false };
}
