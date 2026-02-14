# Vercel Migration (Phase 2)

This phase keeps API logic intact while moving hosting from AWS to Vercel where possible.

## 1. Frontend
- Import `/apps/web` into Vercel as a separate project.
- Set env var:
  - `VITE_API_BASE_URL=https://<vercel-api-domain>`

## 2. Flask API on Vercel
- Deploy `/apps/api` as Python project.
- Entry point exports `app` in `vercel_app.py`.
- Set environment variables equivalent to AWS setup:
  - `DATABASE_URL` (Neon/Supabase recommended)
  - `FRONTEND_URL`
  - Google OAuth vars
  - `SESSION_SECRET`, `CRON_SECRET`, email vars
  - `EMAIL_PROVIDER=resend` (optional switch)
  - `RESEND_API_KEY`, `RESEND_FROM_EMAIL`

## 3. Cron Replacement
Set Vercel Cron to invoke:
`/cron/tick?token=<CRON_SECRET>`

Use interval >= 2 minutes to keep costs controlled.

## 4. Database Migration
- Provision Neon or Supabase Postgres.
- Apply schema with Alembic:
```bash
alembic upgrade head
```
- Update `DATABASE_URL` in Vercel.

## 5. Google OAuth Redirect URIs
Add Vercel callback URL(s):
- `https://<vercel-api-domain>/auth/google/callback`

Keep AWS + localhost callbacks during migration. Remove obsolete URIs after cutover.

## 6. Email Provider Switch
To migrate from SES to Resend:
- Set `EMAIL_PROVIDER=resend`
- Set `RESEND_API_KEY`
- Set `RESEND_FROM_EMAIL`
