# EnrollEagle

Course-seat availability tracker that polls supported college providers and sends deduplicated email notifications when a configured section opens.

## Why I Built It

Seat-monitoring sites differ in markup, authentication, and anti-bot behavior. I built EnrollEagle to isolate those provider differences and make the polling, state transitions, and notification rules testable without automating enrollment.

## What It Does

Users sign in, configure course watches, and receive an email when a provider reports a transition from unavailable to available. A scheduled tick fetches due watches, records snapshots, and advances the next-run time. Blocked or challenged providers are reported as blocked rather than bypassed.

## Key Engineering Work

- Defined a provider contract and implemented parsers with saved fixtures.
- Added Flask API auth, watch state, migrations, and scheduled polling.
- Added deduplicated notifications through AWS SES and Resend adapters.
- Built the React/Vite dashboard and browser-reporting endpoint for blocked sites.
- Added row-locking and `(provider, fetch_key)` request deduplication.
- Added isolated provider and API tests with SQLite fixtures.

## Architecture

```text
React/Vite dashboard ──► Flask API ──► PostgreSQL
                              │
                        scheduled /cron/tick
                              │
              provider contract + parser fixtures
                              │
                   state transition ──► email adapter
```

The project monitors availability only. It does not enroll students, bypass access controls, or evade Cloudflare challenges. Google OAuth, college schedule systems, PostgreSQL, AWS SES, and Resend are external services.

## Results

The provider suite has 10 tests and the API suite has 3 tests. Fixtures cover the supported Foothill, SOCCCD, and De Anza parsers; blocked-provider behavior is represented explicitly. A live-provider reliability study is not claimed, because provider markup and access policies change over time.

## Tech Stack

Python, Flask, SQLAlchemy, Alembic, PostgreSQL, React, TypeScript, Vite, httpx, selectolax, Docker, pytest, AWS SES, and Resend.

## Running Locally

```bash
cd infra
docker compose up -d db

cd ../apps/api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
pip install -e ../../packages/providers
cp .env.example .env
alembic upgrade head
flask --app wsgi:app --debug run --port 5000
```

In another terminal:

```bash
cd apps/web
cp .env.example .env
npm install
npm run dev
```

Run tests with `python3 -m pytest` from `packages/providers` and `pytest` from `apps/api`. Configure OAuth and scheduler secrets only in local environment files, never in the repository. MIT License.
