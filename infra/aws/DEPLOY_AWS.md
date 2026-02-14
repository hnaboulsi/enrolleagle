# AWS Deployment (Phase 1)

This guide deploys EnrollEagle in an AWS-first, Docker-based setup.

## 1. Prerequisites
- AWS account and CLI configured
- Docker installed
- Domain for API (recommended via Route53 + ACM)
- Google OAuth app created

## 2. Build and Push API Image to ECR
```bash
aws ecr create-repository --repository-name enrolleagle-api
aws ecr get-login-password | docker login --username AWS --password-stdin <ACCOUNT>.dkr.ecr.<REGION>.amazonaws.com

docker build -f apps/api/Dockerfile -t enrolleagle-api .
docker tag enrolleagle-api:latest <ACCOUNT>.dkr.ecr.<REGION>.amazonaws.com/enrolleagle-api:latest
docker push <ACCOUNT>.dkr.ecr.<REGION>.amazonaws.com/enrolleagle-api:latest
```

## 3. Database
- Create Amazon RDS PostgreSQL (smallest production-safe instance).
- Configure security group to allow ECS task access.
- Set `DATABASE_URL` in ECS task env.

## 4. ECS Fargate API Service
- Create ECS cluster.
- Create task definition referencing ECR image.
- Map container port `5000`.
- Set environment variables:
  - `DATABASE_URL`
  - `FRONTEND_URL`
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `GOOGLE_REDIRECT_URI`
  - `SESSION_SECRET`
  - `CRON_SECRET`
  - `EMAIL_PROVIDER=ses`
  - `SES_FROM_EMAIL`
  - `REPORT_HMAC_SECRET`
  - `COOKIE_SECURE=true`
- Attach ALB + HTTPS listener.

## 5. Run Migrations
Run once using an ECS one-off task:
```bash
alembic upgrade head
```

## 6. Schedule Polling (Tick-Based)
Use EventBridge Scheduler to call:
`GET https://<api-domain>/cron/tick?token=<CRON_SECRET>`

Recommended rate: every 2-5 minutes (>=120 seconds cadence default).

## 7. SES Setup
- Verify sending domain/email in SES.
- Move SES out of sandbox for production.
- Use verified sender in `SES_FROM_EMAIL`.

## 8. Google OAuth Redirect URIs
In Google Cloud Console OAuth client, add:
- `https://<api-domain>/auth/google/callback`

For local development also keep:
- `http://localhost:5000/auth/google/callback`

## 9. Frontend Hosting
Deploy `/apps/web` separately (S3+CloudFront or Vercel). Ensure:
- `VITE_API_BASE_URL=https://<api-domain>`
- API `FRONTEND_URL` matches deployed frontend origin.
