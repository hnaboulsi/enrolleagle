# AddDropper

Real-time seat-availability alerts for select California Community Colleges. AddDropper watches class sections and emails you the moment seats open—no auto-enroll, no credentials required.

## Stack
- Next.js (App Router) + TypeScript + Tailwind
- Postgres + Prisma
- Background jobs with pg-boss
- Email via SMTP (dev) or SendGrid (prod)

## Local Setup

1) Install dependencies
```bash
npm install
```

2) Configure environment
```bash
cp .env.example .env
```
Update `DATABASE_URL`, `SESSION_SECRET`, and SMTP/SENDGRID settings.

3) Start Postgres (Docker)
```bash
docker-compose up -d db
```

4) Run migrations + seed
```bash
npm run prisma:migrate
npm run prisma:seed
```

5) Run the web app
```bash
npm run dev
```

6) Run the worker (separate terminal)
```bash
npm run worker:dev
```

## How It Works
- Users search for a class section and add it to their watchlist.
- A worker polls official schedule endpoints every 90 seconds (with backoff on failure).
- When seats open, an email alert is sent once (deduped).

## Providers
Adapters live in `src/providers/adapters/` and are isolated by college. The base URLs and parsing logic are intentionally easy to replace if endpoints change.

### Ethical Scraping
- Respect each college’s terms of use.
- Keep polling frequency reasonable and use backoff on failures.
- Identify your bot via a clear user agent.

## Email Configuration
Choose one provider:

### SMTP (default)
```
EMAIL_PROVIDER=smtp
SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM="AddDropper <no-reply@adddropper.com>"
```

### SendGrid (optional)
```
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=...
```

## Deployment

### Vercel (web) + Render/Fly/Railway (worker)
- Deploy the Next.js app to Vercel.
- Deploy a separate worker service using `npm run worker`.
- Ensure both environments share the same `DATABASE_URL` and `SESSION_SECRET`.

### Container deploy
Use the provided `Dockerfile` and run two containers (web + worker) with the same image.

## Admin Diagnostics
- `/admin` is protected by `ADMIN_EMAILS`.
- Shows provider errors, queue health, and failing watch items.

## Tests
- Provider parsing tests: `src/providers/__tests__/`.
- Polling integration test: `tests/jobs/polling.test.ts`.

## Migrations
This repo includes a rebuild migration under `prisma/migrations/20260207120000_adddropper_rebuild`. If you’re starting from scratch, run `npm run prisma:migrate` to apply it.
