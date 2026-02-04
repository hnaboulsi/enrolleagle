# Credit Sniper

Real-time seat-availability alerts for select California Community College classes. This MVP focuses on fast email notifications, watchlist management, and reliable polling without automating enrollment.

## Stack
- Next.js (App Router) + TypeScript + Tailwind
- Postgres + Prisma
- Background jobs with pg-boss
- Email via SMTP (dev) or SendGrid (prod)

## Quickstart (Local)

1) Install dependencies
```bash
npm install
```

2) Configure environment
```bash
cp .env.example .env
```
Update `DATABASE_URL`, `JWT_SECRET`, and your email settings.

3) Start Postgres (Docker)
```bash
docker-compose up -d db
```

4) Migrate + seed
```bash
npm run prisma:migrate
npm run prisma:seed
```

5) Run the web app and worker
```bash
npm run dev
```
In another terminal:
```bash
npm run worker:dev
```

## How It Works
- Users search for a class section and add it to their watchlist.
- A worker polls the official schedule endpoints every 60–120 seconds.
- When seats open (or waitlist changes), an email alert is sent.

## Provider Notes (Important)
Each college has an adapter under `src/providers/`. The adapters are intentionally isolated so you can refine endpoints or parsing without touching core logic.

- **Foothill + De Anza** use a shared FHDA HTML parser. Update `FHDA_BASE_URL` and `DEANZA_BASE_URL` if your target schedule pages differ.
- **DVC, SMC, IVC** use configurable search endpoints that may require tuning for the current schedule systems. Adjust the base URLs and parameter names in the provider files if their public schedule tools change.

### Legal / Ethical Scraping
- Respect each college’s terms of use.
- Keep polling frequency reasonable (defaults to 90s) and use backoff on failures.
- Identify your bot via `PROVIDER_USER_AGENT`.

## Deployment

### Vercel (web) + Render/Fly/Railway (worker)
- Deploy the Next.js app to Vercel.
- Deploy a separate worker service using `npm run worker`.
- Ensure both environments share the same `DATABASE_URL` and `JWT_SECRET`.

### Single-container deploy
Use the provided `Dockerfile` and run two containers (web + worker) with the same image.

## Scripts
- `npm run dev` – run Next.js
- `npm run worker:dev` – start the polling worker
- `npm run test` – run tests
- `npm run prisma:migrate` – migrate DB
- `npm run prisma:seed` – seed colleges

## Health & Admin
- `GET /api/health` checks DB + queue.
- `/admin` is protected by `ADMIN_EMAILS`.

## Tests
- Provider parsing tests: `tests/providers/*.test.ts`
- Polling workflow test: `tests/jobs/polling.test.ts`

## Watch Limits
The default free limit is 10 watch items per user. Adjust `WATCH_MAX_PER_USER` in `.env`.
