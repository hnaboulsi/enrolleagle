import { z } from 'zod';

const numberFromEnv = (defaultValue: number) =>
  z.preprocess((value) => {
    if (value === undefined || value === null || value === '') return undefined;
    return Number(value);
  }, z.number().default(defaultValue));

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  ADMIN_EMAILS: z.string().default(''),
  BASE_URL: z.string().default('http://localhost:3000'),
  WATCH_POLL_INTERVAL_SECONDS: numberFromEnv(90),
  WATCH_BACKOFF_SECONDS: numberFromEnv(300),
  WATCH_MAX_PER_USER: numberFromEnv(10),
  SEARCH_RATE_LIMIT_WINDOW_SECONDS: numberFromEnv(60),
  SEARCH_RATE_LIMIT_MAX: numberFromEnv(20),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: numberFromEnv(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  SENDGRID_API_KEY: z.string().optional(),
  SENDGRID_FROM: z.string().optional(),
  PROVIDER_USER_AGENT: z.string().default('CreditSniperBot/1.0 (+https://creditsniper.app)'),
  FHDA_BASE_URL: z.string().default('https://www2.foothill.edu'),
  DEANZA_BASE_URL: z.string().default('https://www2.deanza.edu'),
  DVC_SEARCH_BASE_URL: z.string().default('https://webapps.4cd.edu/apps/courseschedulesearch'),
  SMC_SEARCH_BASE_URL: z.string().default('https://www.smc.edu/academics/classes/searchable-schedule/'),
  IVC_SEARCH_BASE_URL: z.string().default('https://mysite.socccd.edu/eservices')
});

export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  ADMIN_EMAILS: process.env.ADMIN_EMAILS,
  BASE_URL: process.env.BASE_URL,
  WATCH_POLL_INTERVAL_SECONDS: process.env.WATCH_POLL_INTERVAL_SECONDS,
  WATCH_BACKOFF_SECONDS: process.env.WATCH_BACKOFF_SECONDS,
  WATCH_MAX_PER_USER: process.env.WATCH_MAX_PER_USER,
  SEARCH_RATE_LIMIT_WINDOW_SECONDS: process.env.SEARCH_RATE_LIMIT_WINDOW_SECONDS,
  SEARCH_RATE_LIMIT_MAX: process.env.SEARCH_RATE_LIMIT_MAX,
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASSWORD: process.env.SMTP_PASSWORD,
  SMTP_FROM: process.env.SMTP_FROM,
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
  SENDGRID_FROM: process.env.SENDGRID_FROM,
  PROVIDER_USER_AGENT: process.env.PROVIDER_USER_AGENT,
  FHDA_BASE_URL: process.env.FHDA_BASE_URL,
  DEANZA_BASE_URL: process.env.DEANZA_BASE_URL,
  DVC_SEARCH_BASE_URL: process.env.DVC_SEARCH_BASE_URL,
  SMC_SEARCH_BASE_URL: process.env.SMC_SEARCH_BASE_URL,
  IVC_SEARCH_BASE_URL: process.env.IVC_SEARCH_BASE_URL
});

export function adminEmailSet(): Set<string> {
  return new Set(env.ADMIN_EMAILS.split(',').map((email) => email.trim()).filter(Boolean));
}
