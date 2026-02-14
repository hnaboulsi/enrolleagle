# EnrollEagle

EnrollEagle is a community college course seat tracker.

It monitors seat availability for configured course sections and sends email notifications when seats open.

## Architecture
- Backend: Flask REST API (`apps/api`)
- Frontend: React + Vite + TypeScript (`apps/web`)
- DB: PostgreSQL
- ORM + migrations: SQLAlchemy + Alembic
- Provider package: `packages/providers` (`httpx` + `selectolax`)
- Polling: stateless tick endpoint (`GET /cron/tick`)
- Email adapters: AWS SES + Resend
- Docker-first deploy path with AWS phase and Vercel migration phase

## Repository Layout
- `apps/api`: Flask API, auth, watches, cron tick, migrations, tests
- `apps/web`: React SPA (login/dashboard/add watch)
- `packages/providers`: provider adapter package + parser fixtures/tests
- `infra`: docker-compose + AWS/Vercel deployment docs

## Local Setup

### 1) Start Postgres
```bash
cd infra
docker compose up -d db
```

### 2) API setup
```bash
cd ../apps/api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
pip install -e ../../packages/providers
cp .env.example .env
```

Update at least:
- `DATABASE_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `SESSION_SECRET`
- `FRONTEND_URL`
- `CRON_SECRET`

### 3) Run migrations
```bash
cd apps/api
source .venv/bin/activate
alembic upgrade head
```

### 4) Start API
```bash
cd apps/api
source .venv/bin/activate
flask --app wsgi:app --debug run --port 5000
```

### 5) Start frontend
```bash
cd apps/web
cp .env.example .env
npm install
npm run dev
```

Frontend: `http://localhost:5173`
API: `http://localhost:5000`

## Google OAuth Setup
Create an OAuth 2.0 Client ID (Web application) in Google Cloud Console.

### Authorized redirect URIs
- Local API callback:
  - `http://localhost:5000/auth/google/callback`
- AWS API callback:
  - `https://<aws-api-domain>/auth/google/callback`
- Vercel API callback:
  - `https://<vercel-api-domain>/auth/google/callback`

### Authorized JavaScript origins
- `http://localhost:5173`
- `https://<aws-frontend-domain>`
- `https://<vercel-frontend-domain>`

## API Endpoints
- `GET /auth/google/start`
- `GET /auth/google/callback`
- `POST /auth/logout`
- `GET /me`
- `GET /watches`
- `POST /watches`
- `PATCH /watches/{id}`
- `DELETE /watches/{id}`
- `GET /cron/tick?token=...`
- `POST /report`

## Polling Model (Tick-only)
No always-on worker is required.

Run `/cron/tick` from a scheduler:
- AWS: EventBridge Scheduler
- Vercel: Vercel Cron

The tick route:
- fetches due watches with row locking
- deduplicates requests by `(provider, fetch_key)`
- records snapshots
- triggers deduped email notifications
- updates next run timestamps

## Supported Providers (v1)
- `foothill`: public HTML parser
- `socccd`: SmartSchedule parser (IVC + Saddleback via `campus_code`)
- `deanza`: URL-based best effort parser

Scaffolded as unsupported:
- `smc`
- `sdccd`
- `vsb4cd`

## Anti-bot / Cloudflare Policy
EnrollEagle does not implement bypass/evasion.

When block/challenge responses are detected (403/429 or challenge markers), status is set to `BLOCKED` with a reason.

## Browser Reporter (optional scaffold)
`POST /report` accepts browser-provided seat counts with HMAC signature tied to the watch.

This enables user-side reporting for sites where server-side scraping is blocked, without bypass techniques.

## Testing
### Provider package tests
```bash
cd packages/providers
python3 -m pytest
```

### API tests
```bash
cd apps/api
source .venv/bin/activate
pytest
```

## Deploy Guides
- AWS Phase 1: `infra/aws/DEPLOY_AWS.md`
- Vercel Phase 2 migration: `infra/vercel/DEPLOY_VERCEL.md`
