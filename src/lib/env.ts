import { z } from 'zod';

const numberFromEnv = (defaultValue: number) =>
  z.preprocess((value) => {
    if (value === undefined || value === null || value === '') return undefined;
    return Number(value);
  }, z.number().default(defaultValue));

const booleanFromEnv = (defaultValue: boolean) =>
  z.preprocess((value) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true' || value === '1';
    }
    return Boolean(value);
  }, z.boolean().default(defaultValue));

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(32),
  APP_URL: z.string().default('http://localhost:3000'),
  APP_NAME: z.string().default('AddDropper'),
  SUPPORT_EMAIL: z.string().email().default('support@adddropper.com'),
  POLL_INTERVAL_SECONDS: numberFromEnv(90),
  MAX_WATCH_ITEMS_FREE: numberFromEnv(10),
  ALERT_DEDUP_HOURS: numberFromEnv(6),
  ALERT_ON_WAITLIST: booleanFromEnv(false),
  EMAIL_PROVIDER: z.enum(['smtp', 'sendgrid']).default('smtp'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: numberFromEnv(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  SENDGRID_API_KEY: z.string().optional(),
  ADMIN_EMAILS: z.string().default('')
});

type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

function parseEnv(): Env {
  return envSchema.parse({
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    SESSION_SECRET: process.env.SESSION_SECRET,
    APP_URL: process.env.APP_URL,
    APP_NAME: process.env.APP_NAME,
    SUPPORT_EMAIL: process.env.SUPPORT_EMAIL,
    POLL_INTERVAL_SECONDS: process.env.POLL_INTERVAL_SECONDS,
    MAX_WATCH_ITEMS_FREE: process.env.MAX_WATCH_ITEMS_FREE,
    ALERT_DEDUP_HOURS: process.env.ALERT_DEDUP_HOURS,
    ALERT_ON_WAITLIST: process.env.ALERT_ON_WAITLIST,
    EMAIL_PROVIDER: process.env.EMAIL_PROVIDER,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    SMTP_FROM: process.env.SMTP_FROM,
    SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
    ADMIN_EMAILS: process.env.ADMIN_EMAILS
  });
}

/** Lazily parsed env — only validates on first access at runtime, not at build time. */
export const env: Env = new Proxy({} as Env, {
  get(_target, prop: string) {
    if (!_env) {
      _env = parseEnv();
    }
    return _env[prop as keyof Env];
  }
});

export function adminEmailSet(): Set<string> {
  return new Set(env.ADMIN_EMAILS.split(',').map((email) => email.trim().toLowerCase()).filter(Boolean));
}
